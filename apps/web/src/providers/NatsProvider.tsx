import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { connect, type NatsConnection, type Subscription, StringCodec } from 'nats.ws';

// NATS WebSocket URL (configurable via environment)
const NATS_WS_URL = import.meta.env.VITE_NATS_WS_URL || 'ws://localhost:8222';

interface NatsContextValue {
  isConnected: boolean;
  error: string | null;
  publish: (subject: string, data: unknown) => Promise<void>;
  subscribe: (subject: string, callback: (data: unknown) => void) => Promise<() => void>;
  request: <T>(subject: string, data: unknown, timeoutMs?: number) => Promise<T>;
}

export const NatsContext = createContext<NatsContextValue | null>(null);

interface Props {
  children: ReactNode;
}

export function NatsProvider({ children }: Props) {
  const [connection, setConnection] = useState<NatsConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sc = StringCodec();

  // Connect to NATS on mount
  useEffect(() => {
    let nc: NatsConnection | null = null;
    let isMounted = true;

    async function connectToNats() {
      try {
        setError(null);
        nc = await connect({
          servers: NATS_WS_URL,
          name: 'popula-web',
          reconnect: true,
          maxReconnectAttempts: -1, // Infinite
          reconnectTimeWait: 2000,
        });

        if (isMounted) {
          setConnection(nc);
          setIsConnected(true);
          console.log('[NATS] Connected to', NATS_WS_URL);
        }

        // Handle disconnection
        (async () => {
          const err = await nc.closed();
          if (isMounted) {
            setIsConnected(false);
            if (err) {
              setError(err.message);
              console.error('[NATS] Connection closed with error:', err);
            } else {
              console.log('[NATS] Connection closed');
            }
          }
        })();
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Failed to connect';
          setError(message);
          setIsConnected(false);
          console.error('[NATS] Connection failed:', message);
        }
      }
    }

    connectToNats();

    return () => {
      isMounted = false;
      if (nc) {
        nc.drain().catch(console.error);
      }
    };
  }, []);

  // Publish a message
  const publish = useCallback(
    async (subject: string, data: unknown) => {
      if (!connection) {
        throw new Error('Not connected to NATS');
      }
      const payload = JSON.stringify(data);
      connection.publish(subject, sc.encode(payload));
    },
    [connection, sc]
  );

  // Subscribe to a subject
  const subscribe = useCallback(
    async (subject: string, callback: (data: unknown) => void): Promise<() => void> => {
      if (!connection) {
        throw new Error('Not connected to NATS');
      }

      const sub: Subscription = connection.subscribe(subject);

      // Process messages in background
      (async () => {
        for await (const msg of sub) {
          try {
            const payload = sc.decode(msg.data);
            const data = JSON.parse(payload);
            callback(data);
          } catch (err) {
            console.error('[NATS] Failed to parse message:', err);
          }
        }
      })();

      // Return unsubscribe function
      return () => {
        sub.unsubscribe();
      };
    },
    [connection, sc]
  );

  // Request-reply pattern
  const request = useCallback(
    async <T,>(subject: string, data: unknown, timeoutMs = 5000): Promise<T> => {
      if (!connection) {
        throw new Error('Not connected to NATS');
      }

      const payload = JSON.stringify(data);
      const response = await connection.request(subject, sc.encode(payload), {
        timeout: timeoutMs,
      });

      const responsePayload = sc.decode(response.data);
      return JSON.parse(responsePayload) as T;
    },
    [connection, sc]
  );

  const value: NatsContextValue = {
    isConnected,
    error,
    publish,
    subscribe,
    request,
  };

  return <NatsContext.Provider value={value}>{children}</NatsContext.Provider>;
}

