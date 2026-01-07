/**
 * NATS WebSocket connection hook and context.
 * Provides real-time messaging between frontend and Rust worker.
 */

import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  useRef,
  type ReactNode 
} from 'react';
import { connect, type NatsConnection, type Subscription, StringCodec } from 'nats.ws';

// ============================================================
// TYPES
// ============================================================

interface NatsContextValue {
  /** Current connection (null if disconnected) */
  connection: NatsConnection | null;
  /** Whether connected to NATS */
  isConnected: boolean;
  /** Connection error if any */
  error: Error | null;
  /** Publish a message to a subject */
  publish: (subject: string, data: unknown) => Promise<void>;
  /** Subscribe to a subject */
  subscribe: (subject: string, callback: (data: unknown) => void) => Subscription | null;
  /** Request-reply pattern */
  request: <T>(subject: string, data: unknown, timeout?: number) => Promise<T>;
}

interface NatsProviderProps {
  /** WebSocket URL for NATS server */
  url: string;
  /** Children components */
  children: ReactNode;
  /** Reconnect options */
  reconnect?: {
    maxAttempts?: number;
    delayMs?: number;
  };
}

// ============================================================
// CONTEXT
// ============================================================

const NatsContext = createContext<NatsContextValue | null>(null);

const sc = StringCodec();

// ============================================================
// PROVIDER
// ============================================================

export function NatsProvider({ 
  url, 
  children,
  reconnect = { maxAttempts: 10, delayMs: 2000 }
}: NatsProviderProps) {
  const [connection, setConnection] = useState<NatsConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectAttempts = useRef(0);

  // Connect to NATS
  useEffect(() => {
    let mounted = true;
    let nc: NatsConnection | null = null;

    async function connectToNats() {
      try {
        console.log(`[NATS] Connecting to ${url}...`);
        nc = await connect({ 
          servers: url,
          reconnect: true,
          maxReconnectAttempts: reconnect.maxAttempts,
          reconnectTimeWait: reconnect.delayMs,
        });

        if (!mounted) {
          await nc.close();
          return;
        }

        console.log('[NATS] Connected');
        setConnection(nc);
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;

        // Monitor connection status
        (async () => {
          for await (const status of nc.status()) {
            if (!mounted) break;
            
            switch (status.type) {
              case 'disconnect':
                console.log('[NATS] Disconnected');
                setIsConnected(false);
                break;
              case 'reconnect':
                console.log('[NATS] Reconnected');
                setIsConnected(true);
                break;
              case 'error':
                console.error('[NATS] Error:', status.data);
                break;
            }
          }
        })();

      } catch (err) {
        if (!mounted) return;
        
        console.error('[NATS] Connection failed:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsConnected(false);

        // Retry connection
        if (reconnectAttempts.current < (reconnect.maxAttempts ?? 10)) {
          reconnectAttempts.current++;
          console.log(`[NATS] Retrying in ${reconnect.delayMs}ms (attempt ${reconnectAttempts.current})...`);
          setTimeout(connectToNats, reconnect.delayMs);
        }
      }
    }

    connectToNats();

    return () => {
      mounted = false;
      if (nc) {
        nc.close().catch(console.error);
      }
    };
  }, [url, reconnect.maxAttempts, reconnect.delayMs]);

  // Publish a message
  const publish = useCallback(async (subject: string, data: unknown) => {
    if (!connection) {
      throw new Error('Not connected to NATS');
    }
    const payload = JSON.stringify(data);
    connection.publish(subject, sc.encode(payload));
  }, [connection]);

  // Subscribe to a subject
  const subscribe = useCallback((subject: string, callback: (data: unknown) => void) => {
    if (!connection) {
      console.warn('[NATS] Cannot subscribe: not connected');
      return null;
    }

    const sub = connection.subscribe(subject);
    
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(sc.decode(msg.data));
          callback(data);
        } catch (err) {
          console.error('[NATS] Failed to parse message:', err);
        }
      }
    })();

    return sub;
  }, [connection]);

  // Request-reply pattern
  const request = useCallback(async <T,>(
    subject: string, 
    data: unknown, 
    timeout = 5000
  ): Promise<T> => {
    if (!connection) {
      throw new Error('Not connected to NATS');
    }

    const payload = JSON.stringify(data);
    const response = await connection.request(subject, sc.encode(payload), { timeout });
    return JSON.parse(sc.decode(response.data)) as T;
  }, [connection]);

  const value: NatsContextValue = {
    connection,
    isConnected,
    error,
    publish,
    subscribe,
    request,
  };

  return (
    <NatsContext.Provider value={value}>
      {children}
    </NatsContext.Provider>
  );
}

// ============================================================
// HOOKS
// ============================================================

/**
 * Access the NATS connection context.
 */
export function useNatsConnection(): NatsContextValue {
  const context = useContext(NatsContext);
  if (!context) {
    throw new Error('useNatsConnection must be used within a NatsProvider');
  }
  return context;
}

/**
 * Subscribe to a NATS subject.
 * Automatically unsubscribes when component unmounts.
 */
export function useNatsSubscription<T>(
  subject: string,
  callback: (data: T) => void,
  deps: unknown[] = []
) {
  const { subscribe, isConnected } = useNatsConnection();

  useEffect(() => {
    if (!isConnected) return;

    const sub = subscribe(subject, callback as (data: unknown) => void);
    
    return () => {
      sub?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, subscribe, isConnected, ...deps]);
}

