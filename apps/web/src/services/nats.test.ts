import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NatsService, createMessage, type PingRequest, type PingResponse } from './nats';

// Mock nats.ws module
vi.mock('nats.ws', () => {
  const mockSubscription = {
    [Symbol.asyncIterator]: vi.fn(),
  };
  
  // Create a promise that never resolves to simulate long-lived connection
  const neverResolve = new Promise(() => {});
  
  const mockConnection = {
    close: vi.fn().mockResolvedValue(undefined),
    closed: vi.fn().mockReturnValue(neverResolve),
    request: vi.fn(),
    subscribe: vi.fn().mockResolvedValue(mockSubscription),
    publish: vi.fn(),
    status: vi.fn().mockReturnValue({ 
      [Symbol.asyncIterator]: vi.fn().mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true })
      })
    }),
  };
  
  return {
    connect: vi.fn().mockResolvedValue(mockConnection),
    StringCodec: vi.fn().mockReturnValue({
      encode: (s: string) => new TextEncoder().encode(s),
      decode: (b: Uint8Array) => new TextDecoder().decode(b),
    }),
  };
});

describe('NatsService', () => {
  let service: NatsService;

  beforeEach(() => {
    service = new NatsService();
  });

  afterEach(async () => {
    await service.disconnect();
    vi.clearAllMocks();
  });

  describe('createMessage', () => {
    it('creates a message with unique id', () => {
      const msg1 = createMessage({ test: 'data' });
      const msg2 = createMessage({ test: 'data' });
      
      expect(msg1.id).toBeDefined();
      expect(msg2.id).toBeDefined();
      expect(msg1.id).not.toBe(msg2.id);
    });

    it('creates a message with timestamp', () => {
      const msg = createMessage({ test: 'data' });
      
      expect(msg.timestamp).toBeDefined();
      expect(new Date(msg.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('creates a message with correlation id', () => {
      const msg = createMessage({ test: 'data' });
      
      expect(msg.correlationId).toBeDefined();
    });

    it('uses provided correlation id', () => {
      const msg = createMessage({ test: 'data' }, 'my-correlation-id');
      
      expect(msg.correlationId).toBe('my-correlation-id');
    });

    it('includes payload in message', () => {
      const payload = { name: 'test', value: 42 };
      const msg = createMessage(payload);
      
      expect(msg.payload).toEqual(payload);
    });
  });

  describe('connection', () => {
    it('starts with disconnected status', () => {
      expect(service.getStatus()).toBe('disconnected');
    });

    it('changes status to connecting when connect is called', async () => {
      const connectPromise = service.connect('ws://localhost:8080');
      
      // Status should change to connecting
      expect(service.getStatus()).toBe('connecting');
      
      await connectPromise;
    });

    it('changes status to connected after successful connection', async () => {
      await service.connect('ws://localhost:8080');
      
      expect(service.getStatus()).toBe('connected');
    });

    it('changes status to disconnected after disconnect', async () => {
      await service.connect('ws://localhost:8080');
      await service.disconnect();
      
      expect(service.getStatus()).toBe('disconnected');
    });
  });

  describe('ping', () => {
    it('ping request has message property', () => {
      const request: PingRequest = { message: 'Hello!' };
      
      expect(request.message).toBe('Hello!');
    });

    it('ping response has expected properties', () => {
      const response: PingResponse = {
        original_message: 'Hello!',
        reply: 'Hello from Rust!',
        worker_version: '0.1.0',
        processed_at: new Date().toISOString(),
      };
      
      expect(response.original_message).toBeDefined();
      expect(response.reply).toBeDefined();
      expect(response.worker_version).toBeDefined();
      expect(response.processed_at).toBeDefined();
    });
  });
});

describe('PingRequest serialization', () => {
  it('serializes to JSON correctly', () => {
    const request: PingRequest = { message: 'Test message' };
    const json = JSON.stringify(createMessage(request));
    const parsed = JSON.parse(json);
    
    expect(parsed.payload.message).toBe('Test message');
    expect(parsed.id).toBeDefined();
    expect(parsed.correlationId).toBeDefined();
  });
});

