import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { MqttTelemetryService } from './mqtt.telemetry.service';
import { MQTT_TELEMETRY_QUEUE } from './mqtt.constants';
import { WebsocketGateway } from '@/websocket/websocket.gateway';

interface TelemetryJob {
  pivotId: string;
  rawPayload: string;
  receivedAt: string;
}

@Processor(MQTT_TELEMETRY_QUEUE)
export class MqttProcessor extends WorkerHost {
  private readonly logger = new Logger(MqttProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telemetryService: MqttTelemetryService,
    private readonly websocketGateway: WebsocketGateway,
  ) {
    super();
  }

  /**
   * Main entry point for the BullMQ worker.
   * Consumes jobs from the mqtt-telemetry queue.
   */
  async process(job: Job<TelemetryJob>): Promise<void> {
    const { pivotId, rawPayload, receivedAt } = job.data;
    const timestamp = new Date(receivedAt);

    let parsed: any; // reason: raw incoming JSON
    try {
      parsed = JSON.parse(rawPayload);
    } catch {
      this.logger.error(`Malformed packet for pivot ${pivotId}: ${rawPayload}`);
      // Discard malformed packets to prevent worker crash/infinite retry
      return;
    }

    // Fast check for pivot existence before hitting the business logic service
    const pivotExists = await this.prisma.pivot.count({
      where: { id: pivotId },
    });

    if (pivotExists === 0) {
      this.logger.warn(`Discarding packet for non-existent pivot: ${pivotId}`);
      return;
    }

    try {
      // Delegate business logic to TelemetryService (SRP)
      await this.telemetryService.processTelemetry(pivotId, parsed, timestamp);

      // Emit live update via WebSocket (TASK-9)
      this.websocketGateway.emitPivotUpdate(pivotId, parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process telemetry for pivot ${pivotId}: ${message}`,
      );
      // Re-throw to trigger BullMQ retry with backoff as configured in the module
      throw error;
    }
  }
}
