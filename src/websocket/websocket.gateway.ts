import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(
          `Connection rejected: no token provided (client: ${client.id})`,
        );
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getJwtSecret(),
      });

      // Attach user to client for later use
      client.data.user = payload;
      this.logger.log(
        `Client connected: ${client.id} (user: ${payload.email || payload.sub})`,
      );
    } catch (error) {
      this.logger.warn(
        `Connection rejected: invalid token (client: ${client.id})`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeToPivot')
  handleSubscribeToPivot(
    @ConnectedSocket() client: Socket,
    @MessageBody('pivotId') pivotId: string,
  ) {
    if (!pivotId) {
      this.logger.warn(`Client ${client.id} tried to subscribe without pivotId`);
      return;
    }
    const roomName = this.getRoomName(pivotId);
    client.join(roomName);
    this.logger.log(`Client ${client.id} subscribed to room: ${roomName}`);
  }

  @SubscribeMessage('unsubscribeFromPivot')
  handleUnsubscribeFromPivot(
    @ConnectedSocket() client: Socket,
    @MessageBody('pivotId') pivotId: string,
  ) {
    if (!pivotId) return;
    const roomName = this.getRoomName(pivotId);
    client.leave(roomName);
    this.logger.log(`Client ${client.id} unsubscribed from room: ${roomName}`);
  }

  /**
   * Broadcasts a status update for a specific pivot.
   * Only clients subscribed to the pivot's room will receive it.
   */
  emitPivotUpdate(pivotId: string, data: any) {
    // reason: generic telemetry data as expected by client
    const roomName = this.getRoomName(pivotId);
    this.server.to(roomName).emit('pivotStatusUpdate', {
      pivotId,
      ...data,
    });
    this.logger.debug(
      `Broadcasted update for pivot ${pivotId} to room ${roomName}`,
    );
  }

  private getRoomName(pivotId: string): string {
    return `pivot:${pivotId}`;
  }

  private extractToken(client: Socket): string | null {
    // Handshake auth (socket.io v4+)
    const authHeader = client.handshake.auth?.token;
    if (authHeader && typeof authHeader === 'string') {
      return authHeader.replace(/^Bearer /i, '');
    }

    // Query parameter (fallback)
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }

    // Authorization header (some clients might use this)
    const headerToken = client.handshake.headers?.authorization;
    if (typeof headerToken === 'string') {
      return headerToken.replace(/^Bearer /i, '');
    }

    return null;
  }
}
