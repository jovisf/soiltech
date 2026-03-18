import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@/config/config.service';
import { WebsocketGateway } from './websocket.gateway';
import { Server, Socket } from 'socket.io';

describe('WebsocketGateway', () => {
  let gateway: WebsocketGateway;
  let jwtService: {
    verifyAsync: jest.Mock;
  };
  let configService: {
    getJwtSecret: jest.Mock;
  };

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  const createMockSocket = (overrides = {}): Partial<Socket> => ({
    id: 'test-socket-id',
    disconnect: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    handshake: {
      auth: {},
      query: {},
      headers: {},
      ...((overrides as any).handshake || {}),
    },
    data: {},
    ...overrides,
  });

  beforeEach(async () => {
    jwtService = {
      verifyAsync: jest.fn(),
    };
    configService = {
      getJwtSecret: jest.fn().mockReturnValue('test-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    gateway = module.get<WebsocketGateway>(WebsocketGateway);
    gateway.server = mockServer as unknown as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should connect successfully with valid token in handshake auth', async () => {
      const client = createMockSocket({
        handshake: { auth: { token: 'Bearer valid-token' } },
      }) as Socket;
      const payload = { sub: 'user-123', email: 'test@example.com' };
      jwtService.verifyAsync.mockResolvedValue(payload);

      await gateway.handleConnection(client);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect(client.data.user).toEqual(payload);
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should connect successfully with valid token in query param', async () => {
      const client = createMockSocket({
        handshake: { query: { token: 'valid-token' } },
      }) as Socket;
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });

      await gateway.handleConnection(client);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should connect successfully with valid token in headers', async () => {
      const client = createMockSocket({
        handshake: { headers: { authorization: 'Bearer valid-token' } },
      }) as Socket;
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });

      await gateway.handleConnection(client);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should reject connection if no token is provided', async () => {
      const client = createMockSocket() as Socket;

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should reject connection if token is invalid', async () => {
      const client = createMockSocket({
        handshake: { auth: { token: 'invalid-token' } },
      }) as Socket;
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should handle case-insensitive Bearer prefix', async () => {
      const client = createMockSocket({
        handshake: { auth: { token: 'bearer valid-token' } },
      }) as Socket;
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });

      await gateway.handleConnection(client);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnection', () => {
      const client = createMockSocket() as Socket;
      const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

      gateway.handleDisconnect(client);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Client disconnected'),
      );
    });
  });

  describe('handleSubscribeToPivot', () => {
    it('should join correct room if pivotId is provided', () => {
      const client = createMockSocket() as Socket;
      const pivotId = 'pivot-123';

      gateway.handleSubscribeToPivot(client, pivotId);

      expect(client.join).toHaveBeenCalledWith('pivot:pivot-123');
    });

    it('should not join room if pivotId is missing', () => {
      const client = createMockSocket() as Socket;

      gateway.handleSubscribeToPivot(client, '');
      gateway.handleSubscribeToPivot(client, undefined as any);
      gateway.handleSubscribeToPivot(client, null as any);

      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('handleUnsubscribeFromPivot', () => {
    it('should leave correct room if pivotId is provided', () => {
      const client = createMockSocket() as Socket;
      const pivotId = 'pivot-123';

      gateway.handleUnsubscribeFromPivot(client, pivotId);

      expect(client.leave).toHaveBeenCalledWith('pivot:pivot-123');
    });

    it('should not leave room if pivotId is missing', () => {
      const client = createMockSocket() as Socket;

      gateway.handleUnsubscribeFromPivot(client, '');
      gateway.handleUnsubscribeFromPivot(client, undefined as any);

      expect(client.leave).not.toHaveBeenCalled();
    });
  });

  describe('emitPivotUpdate', () => {
    it('should emit status update to correct room', () => {
      const pivotId = 'pivot-123';
      const data = { isOn: true, angle: 45 };

      gateway.emitPivotUpdate(pivotId, data);

      expect(mockServer.to).toHaveBeenCalledWith('pivot:pivot-123');
      expect(mockServer.emit).toHaveBeenCalledWith('pivotStatusUpdate', {
        pivotId: 'pivot-123',
        ...data,
      });
    });

    it('should handle null or undefined data gracefully', () => {
      const pivotId = 'pivot-123';

      gateway.emitPivotUpdate(pivotId, null);
      gateway.emitPivotUpdate(pivotId, undefined);

      expect(mockServer.emit).toHaveBeenCalledWith('pivotStatusUpdate', {
        pivotId: 'pivot-123',
      });
    });
  });
});
