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

/**
 * Encode JSON to Uint8Array in chunks to avoid memory spike from large strings.
 * This avoids creating a full intermediate JSON string for large payloads.
 */
function encodeJsonToBytes(obj: unknown): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  
  function write(str: string): void {
    chunks.push(encoder.encode(str));
  }
  
  function encodeString(str: string): void {
    write('"');
    // Process string in chunks to avoid memory spike during escaping
    const CHUNK_SIZE = 64 * 1024; // 64KB chunks
    for (let i = 0; i < str.length; i += CHUNK_SIZE) {
      const chunk = str.slice(i, Math.min(i + CHUNK_SIZE, str.length));
      // Escape JSON special characters
      let escaped = '';
      for (let j = 0; j < chunk.length; j++) {
        const c = chunk[j];
        switch (c) {
          case '"': escaped += '\\"'; break;
          case '\\': escaped += '\\\\'; break;
          case '\n': escaped += '\\n'; break;
          case '\r': escaped += '\\r'; break;
          case '\t': escaped += '\\t'; break;
          default:
            const code = chunk.charCodeAt(j);
            if (code < 32) {
              escaped += '\\u' + code.toString(16).padStart(4, '0');
            } else {
              escaped += c;
            }
        }
      }
      write(escaped);
    }
    write('"');
  }
  
  function encodeValue(value: unknown): void {
    if (value === null || value === undefined) {
      write('null');
    } else if (typeof value === 'string') {
      encodeString(value);
    } else if (typeof value === 'number') {
      write(Number.isFinite(value) ? String(value) : 'null');
    } else if (typeof value === 'boolean') {
      write(value ? 'true' : 'false');
    } else if (Array.isArray(value)) {
      write('[');
      for (let i = 0; i < value.length; i++) {
        if (i > 0) write(',');
        encodeValue(value[i]);
      }
      write(']');
    } else if (typeof value === 'object') {
      write('{');
      const entries = Object.entries(value as Record<string, unknown>);
      for (let i = 0; i < entries.length; i++) {
        if (i > 0) write(',');
        write('"' + entries[i][0] + '":');
        encodeValue(entries[i][1]);
      }
      write('}');
    }
  }
  
  encodeValue(obj);
  
  // Concatenate chunks into single Uint8Array
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
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
   * Uses chunked JSON encoding to avoid memory spike for large payloads
   */
  publish<T>(subject: string, payload: T, correlationId?: string): void {
    if (!this.connection) {
      throw new Error('Not connected to NATS');
    }

    const envelope = createMessage(payload, correlationId);
    // Use chunked encoding to avoid memory spike for large payloads
    const data = encodeJsonToBytes(envelope);
    this.connection.publish(subject, data);
  }

  /**
   * Request-reply pattern
   * Uses chunked JSON encoding to avoid memory spike for large payloads
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
    // Use chunked encoding to avoid memory spike for large payloads (e.g., 340MB XML)
    const data = encodeJsonToBytes(envelope);

    const response = await this.connection.request(subject, data, { timeout: timeoutMs });
    return JSON.parse(this.sc.decode(response.data)) as MessageEnvelope<TRes>;
  }
}

// Singleton instance for easy access
export const natsService = new NatsService();

