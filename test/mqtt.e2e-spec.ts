import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as mqtt from 'mqtt';
import * as fs from 'fs';
import { MQTT_TELEMETRY_QUEUE } from '@/mqtt/mqtt.constants';

jest.mock('mqtt');
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    readFileSync: jest.fn((path, options) => {
      if (typeof path === 'string' && (path.includes('certs') || path.endsWith('.pem') || path.endsWith('.crt') || path.endsWith('.key'))) {
        return Buffer.from('mock-content');
      }
      return actualFs.readFileSync(path, options);
    }),
  };
});

describe('Mqtt (e2e)', () => {
  let app: INestApplication;
  let queue: Queue;
  let mockClient: any;

  beforeAll(async () => {
    mockClient = {
      on: jest.fn(),
      subscribe: jest.fn(),
      endAsync: jest.fn().mockResolvedValue(undefined),
    };
    (mqtt.connect as jest.Mock).mockReturnValue(mockClient);
    // fs.readFileSync is already mocked in the jest.mock factory

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    queue = app.get<Queue>(getQueueToken(MQTT_TELEMETRY_QUEUE));
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should register the BullMQ queue', () => {
    expect(queue).toBeDefined();
  });

  it('should enqueue a message to Redis when MQTT message is received', async () => {
    // 1. Get the message handler registered by MqttService
    let messageHandler: Function = () => {};
    const onCalls = mockClient.on.mock.calls;
    for (const [event, handler] of onCalls) {
      if (event === 'message') {
        messageHandler = handler;
        break;
      }
    }

    expect(messageHandler).toBeDefined();

    // 2. Simulate a message
    const topic = 'soiltech/pivots/pivot-999/telemetry';
    const payload = Buffer.from(JSON.stringify({ battery: 85, signal: -65 }));
    
    // We need to wait for the async enqueue process. 
    // Since enqueue is private and not awaited by the event listener, 
    // we can check the queue after a small delay or by spying on queue.add
    const queueSpy = jest.spyOn(queue, 'add');
    
    await messageHandler(topic, payload);

    expect(queueSpy).toHaveBeenCalledWith(
      'process-telemetry',
      expect.objectContaining({
        pivotId: 'pivot-999',
        rawPayload: payload.toString('utf-8'),
      })
    );
    
    queueSpy.mockRestore();
  });
});
