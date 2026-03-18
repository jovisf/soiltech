import { Module, Global } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { AuthModule } from '@/auth/auth.module';
import { ConfigModule } from '@/config/config.module';

@Global()
@Module({
  imports: [AuthModule, ConfigModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
