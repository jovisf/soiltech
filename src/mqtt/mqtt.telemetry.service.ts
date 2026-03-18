import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WebsocketGateway } from '@/websocket/websocket.gateway';

@Injectable()
export class MqttTelemetryService {
  private readonly logger = new Logger(MqttTelemetryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: WebsocketGateway,
  ) {}

  /**
   * Processes a telemetry packet from a pivot.
   * Handles state machine transitions and cycle record creation.
   */
  async processTelemetry(
    pivotId: string,
    payload: any, // reason: MQTT payloads are dynamic JSON objects
    timestamp: Date,
  ) {
    // Use transaction to ensure consistency across multiple database operations
    await this.prisma.$transaction(async (tx) => {
      // 1. Update Pivot.status with latest packet data
      await tx.pivot.update({
        where: { id: pivotId },
        data: { status: payload },
      });

      // 2. Handle State Machine logic
      // If isOn is missing, we assume it's a telemetry packet for an active state
      const isOn =
        payload['isOn'] !== undefined ? Boolean(payload['isOn']) : true;

      if (!isOn) {
        await this.handlePowerOff(tx, pivotId);
      } else {
        await this.handleActiveState(tx, pivotId, payload, timestamp);
      }
    });

    // 3. Emit real-time update via WebSocket
    this.wsGateway.emitPivotUpdate(pivotId, payload);
  }

  private async handleActiveState(
    tx: any, // reason: Prisma Transaction Client
    pivotId: string,
    data: any, // reason: MQTT payloads are dynamic JSON objects
    timestamp: Date,
  ) {
    // Find latest active state or create new one
    let activeState = await tx.state.findFirst({
      where: { pivotId, isOn: true },
      orderBy: { timestamp: 'desc' },
    });

    if (!activeState) {
      activeState = await tx.state.create({
        data: {
          pivotId,
          isOn: true,
          timestamp,
          direction: String(data['direction'] ?? 'clockwise'),
          isIrrigating: Boolean(data['isIrrigating']),
        },
      });
      this.logger.log(`Created new active state for pivot ${pivotId}`);
    } else {
      // Update active state metadata if it changed during the cycle
      await tx.state.update({
        where: { id: activeState.id },
        data: {
          direction: String(data['direction'] ?? activeState.direction),
          isIrrigating: Boolean(
            data['isIrrigating'] ?? activeState.isIrrigating,
          ),
        },
      });
    }

    // Create Cycle record linked to the active state
    await tx.cycle.create({
      data: {
        stateId: activeState.id,
        timestamp,
        angle: Number(data['angle'] ?? 0),
        percentimeter: Number(data['percentimeter'] ?? 0),
      },
    });
  }

  private async handlePowerOff(
    tx: any, // reason: Prisma Transaction Client
    pivotId: string,
  ) {
    // Power-off event: close any active states for this pivot
    const closed = await tx.state.updateMany({
      where: { pivotId, isOn: true },
      data: { isOn: false },
    });

    if (closed.count > 0) {
      this.logger.log(
        `Closed ${closed.count} active states for pivot ${pivotId}`,
      );
    }
  }
}
