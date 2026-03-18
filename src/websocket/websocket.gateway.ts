import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: true })
export class WebsocketGateway {
  private readonly logger = new Logger(WebsocketGateway.name);

  @WebSocketServer()
  server!: Server;

  emitPivotUpdate(pivotId: string, status: any) { // reason: status is a dynamic JSON object
    this.logger.log(`Emitting pivotStatusUpdate for pivot ${pivotId}`);
    if (this.server) {
      this.server.emit('pivotStatusUpdate', { pivotId, status });
    }
  }
}
