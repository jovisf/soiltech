import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MqttService } from './mqtt.service';
import { ConfigModule } from '@/config/config.module';
import { MQTT_TELEMETRY_QUEUE } from './mqtt.constants';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: MQTT_TELEMETRY_QUEUE,
    }),
  ],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
