import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as mqtt from 'mqtt';
import * as fs from 'fs';
import { ConfigService } from '@/config/config.service';
import { MQTT_TELEMETRY_QUEUE, PROCESS_TELEMETRY_JOB } from './mqtt.constants';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client!: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectQueue(MQTT_TELEMETRY_QUEUE) private readonly queue: Queue,
  ) {}

  onModuleInit() {
    this.connect();
  }

  private connect() {
    try {
      const endpoint = this.config.getAwsIotEndpoint();
      const clientId = this.config.getAwsIotClientId();
      const certPath = this.config.getAwsIotCertPath();
      const keyPath = this.config.getAwsIotKeyPath();
      const caPath = this.config.getAwsIotCaPath();

      this.client = mqtt.connect(`mqtts://${endpoint}`, {
        clientId,
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
        ca: fs.readFileSync(caPath),
        protocol: 'mqtts',
        reconnectPeriod: 5000,
      });

      this.client.on('connect', () => {
        this.logger.log('Connected to AWS IoT Core');
        this.subscribe();
      });

      this.client.on('error', (error) => {
        this.logger.error(`MQTT Connection Error: ${error.message}`);
      });

      this.client.on('message', (topic: string, payload: Buffer) => {
        // Handle asynchronous enqueueing without blocking event loop
        this.enqueue(topic, payload).catch((err) => {
          this.logger.error(`Uncaught error in enqueue: ${err.message}`);
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize MQTT client: ${message}`);
    }
  }

  private subscribe() {
    const topicPrefix = this.config.getMqttTopicPrefix();
    const topicPattern = `${topicPrefix}/+/telemetry`;
    this.client.subscribe(topicPattern, (err) => {
      if (err) {
        this.logger.error(
          `Failed to subscribe to ${topicPattern}: ${err.message}`,
        );
      } else {
        this.logger.log(`Subscribed to topic: ${topicPattern}`);
      }
    });
  }

  private async enqueue(topic: string, payload: Buffer) {
    try {
      // Dynamic extraction based on topic prefix
      const topicPrefix = this.config.getMqttTopicPrefix();
      const prefixParts = topicPrefix.split('/').filter((p) => p !== '');
      const parts = topic.split('/').filter((p) => p !== '');
      const pivotIdIndex = prefixParts.length;
      const pivotId = parts[pivotIdIndex];

      if (!pivotId) {
        this.logger.warn(`Could not extract pivotId from topic: ${topic}`);
        return;
      }

      await this.queue.add(PROCESS_TELEMETRY_JOB, {
        pivotId,
        rawPayload: payload.toString('utf-8'),
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enqueue MQTT message: ${message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.endAsync();
        this.logger.log('MQTT client disconnected');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error while disconnecting MQTT client: ${message}`);
      }
    }
  }
}
