import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MqttService } from './mqtt.service';
import { MqttProcessor } from './mqtt.processor';
import { MqttTelemetryService } from './mqtt.telemetry.service';
import { ConfigModule } from '@/config/config.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { WebsocketModule } from '@/websocket/websocket.module';
import { MQTT_TELEMETRY_QUEUE } from './mqtt.constants';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    WebsocketModule,
    BullModule.registerQueue({
      name: MQTT_TELEMETRY_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    }),
  ],
  providers: [MqttService, MqttProcessor, MqttTelemetryService],
  exports: [MqttService],
})
export class MqttModule {}
