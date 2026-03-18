import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@/config/config.service';
import { io, Socket } from 'socket.io-client';
import { WebsocketGateway } from '@/websocket/websocket.gateway';

describe('WebsocketGateway (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let configService: ConfigService;
  let gateway: WebsocketGateway;
  let authToken: string;
  let socket: Socket;
  let port: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    port = typeof address === 'string' ? 0 : address.port;

    jwtService = app.get<JwtService>(JwtService);
    configService = app.get<ConfigService>(ConfigService);
    gateway = app.get<WebsocketGateway>(WebsocketGateway);

    authToken = await jwtService.signAsync(
      { sub: 'user-123', email: 'e2e@example.com' },
      { secret: configService.getJwtSecret() },
    );
  });

  afterAll(async () => {
    if (socket) {
      socket.disconnect();
    }
    await app.close();
  });

  it('should reject connection with invalid token', (done) => {
    const invalidSocket = io(`http://localhost:${port}`, {
      auth: { token: 'invalid-token' },
      reconnection: false,
      forceNew: true,
    });

    invalidSocket.on('connect_error', (error) => {
      expect(error.message).toBeDefined();
      invalidSocket.disconnect();
      done();
    });

    invalidSocket.on('connect', () => {
      // If it connects, wait a bit to see if it gets disconnected by the server
      setTimeout(() => {
        if (!invalidSocket.connected) {
          // It was disconnected by the server, which is what handleConnection does
          done();
        } else {
          invalidSocket.disconnect();
          done(new Error('Should have been disconnected by server'));
        }
      }, 500);
    });
  });

  it('should connect successfully with valid token', (done) => {
    socket = io(`http://localhost:${port}`, {
      auth: { token: `Bearer ${authToken}` },
      reconnection: false,
    });

    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      done();
    });

    socket.on('connect_error', (error) => {
      done(error);
    });
  });

  it('should receive pivot status update after subscribing', (done) => {
    const pivotId = 'pivot-e2e-123';
    const statusData = { isOn: true, angle: 180 };

    socket.emit('subscribeToPivot', { pivotId });

    socket.on('pivotStatusUpdate', (data) => {
      expect(data).toEqual({
        pivotId,
        ...statusData,
      });
      done();
    });

    // Small delay to ensure subscription is processed
    setTimeout(() => {
      gateway.emitPivotUpdate(pivotId, statusData);
    }, 100);
  });

  it('should not receive updates for unsubscribed pivots', (done) => {
    const pivotId = 'pivot-unsub-123';
    const otherPivotId = 'pivot-other-123';
    let received = false;

    socket.emit('subscribeToPivot', { pivotId: otherPivotId });

    socket.on('pivotStatusUpdate', (data) => {
      if (data.pivotId === pivotId) {
        received = true;
      }
    });

    gateway.emitPivotUpdate(pivotId, { isOn: false });

    setTimeout(() => {
      expect(received).toBe(false);
      done();
    }, 500);
  });
});
