/**
 * NATS WebSocket Service
 * 
 * Provides connection to NATS server via WebSocket for browser-based messaging.
 */

import { connect, NatsConnection, StringCodec, Subscription } from 'nats.ws';

// ============================================================
// TYPES
// ============================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Message envelope - wraps all messages */
export interface MessageEnvelope<T> {
  readonly id: string;
  readonly timestamp: string;
  readonly correlationId: string;
  readonly payload: T;
}

/** Ping request payload */
export interface PingRequest {
  readonly message: string;
}

/** Ping response from Rust worker */
export interface PingResponse {
  readonly original_message: string;
  readonly reply: string;
  readonly worker_version: string;
  readonly processed_at: string;
}

// ============================================================
// SUBJECTS
// ============================================================

export const SUBJECTS = {
  PING: 'popula.ping',
} as const;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/** Generate a unique message ID */
export function generateMessageId(): string {
  return crypto.randomUUID();
}

/** Create a message envelope */
export function createMessage<T>(
  payload: T,
  correlationId?: string
): MessageEnvelope<T> {
  return {
    id: generateMessageId(),
    timestamp: new Date().toISOString(),
    correlationId: correlationId ?? generateMessageId(),
    payload,
  };
}

// ============================================================
// NATS SERVICE
// ============================================================

export class NatsService {
  private connection: NatsConnection | null = null;
  private status: ConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private sc = StringCodec();

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  /**
   * Connect to NATS server via WebSocket
   */
  async connect(url: string = 'ws://localhost:8080'): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.setStatus('connecting');

    try {
      this.connection = await connect({ servers: url });
      this.setStatus('connected');
      console.log('[NATS] Connected to', url);

      // Monitor connection status
      this.monitorConnection();
    } catch (error) {
      this.setStatus('error');
      console.error('[NATS] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Monitor connection for disconnection
   */
  private async monitorConnection(): Promise<void> {
    if (!this.connection) return;

    // Wait for connection to close
    await this.connection.closed();
    
    if (this.status !== 'disconnected') {
      console.log('[NATS] Connection closed');
      this.setStatus('disconnected');
    }
  }

  /**
   * Disconnect from NATS server
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    this.setStatus('disconnected');
  }

  /**
   * Send a ping request and wait for response
   */
  async ping(message: string, timeoutMs: number = 5000): Promise<PingResponse> {
    if (!this.connection) {
      throw new Error('Not connected to NATS');
    }

    const request: PingRequest = { message };
    const envelope = createMessage(request);
    const payload = this.sc.encode(JSON.stringify(envelope));

    try {
      const response = await this.connection.request(
        SUBJECTS.PING,
        payload,
        { timeout: timeoutMs }
      );

      const responseData = JSON.parse(this.sc.decode(response.data)) as MessageEnvelope<PingResponse>;
      return responseData.payload;
    } catch (error) {
      console.error('[NATS] Ping failed:', error);
      throw error;
    }
  }

  /**
   * Subscribe to a subject
   */
  async subscribe(subject: string): Promise<Subscription> {
    if (!this.connection) {
      throw new Error('Not connected to NATS');
    }

    return this.connection.subscribe(subject);
  }

  /**
   * Publish a message to a subject
   */
  publish<T>(subject: string, payload: T, correlationId?: string): void {
    if (!this.connection) {
      throw new Error('Not connected to NATS');
    }

    const envelope = createMessage(payload, correlationId);
    const data = this.sc.encode(JSON.stringify(envelope));
    this.connection.publish(subject, data);
  }

  /**
   * Request-reply pattern
   */
  async request<TReq, TRes>(
    subject: string,
    payload: TReq,
    timeoutMs: number = 5000
  ): Promise<MessageEnvelope<TRes>> {
    if (!this.connection) {
      throw new Error('Not connected to NATS');
    }

    const envelope = createMessage(payload);
    const data = this.sc.encode(JSON.stringify(envelope));

    const response = await this.connection.request(subject, data, { timeout: timeoutMs });
    return JSON.parse(this.sc.decode(response.data)) as MessageEnvelope<TRes>;
  }
}

// Singleton instance for easy access
export const natsService = new NatsService();

