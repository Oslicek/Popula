import { create } from 'zustand';
import { natsService, type ConnectionStatus, type PingResponse } from '@/services/nats';
import type { ProjectionRunRequest, ProjectionRunResponse } from '@popula/shared-types';

interface NatsState {
  status: ConnectionStatus;
  error: string | null;
  lastPingResponse: PingResponse | null;
  isPinging: boolean;
  isProjecting: boolean;
  
  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  ping: (message: string) => Promise<PingResponse>;
  runProjection: (request: ProjectionRunRequest) => Promise<ProjectionRunResponse>;
}

// NATS WebSocket URL (port 8080 is configured in nats-server.conf)
const NATS_WS_URL = 'ws://localhost:8080';

export const useNatsStore = create<NatsState>((set, get) => {
  // Subscribe to status changes from the service
  natsService.onStatusChange((status) => {
    set({ status });
  });

  return {
    status: 'disconnected',
    error: null,
    lastPingResponse: null,
    isPinging: false,
    isProjecting: false,
    
    setStatus: (status) => set({ status }),
    setError: (error) => set({ error, status: error ? 'error' : get().status }),
    
    connect: async () => {
      const { status } = get();
      if (status === 'connected' || status === 'connecting') {
        return;
      }
      
      set({ error: null });
      
      try {
        await natsService.connect(NATS_WS_URL);
        set({ status: 'connected', error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Connection failed';
        set({ status: 'error', error: message });
      }
    },
    
    disconnect: () => {
      natsService.disconnect();
      set({ status: 'disconnected', error: null });
    },

    ping: async (message: string) => {
      const { status } = get();
      if (status !== 'connected') {
        throw new Error('Not connected to NATS');
      }

      set({ isPinging: true, error: null });

      try {
        const response = await natsService.ping(message);
        set({ lastPingResponse: response, isPinging: false });
        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ping failed';
        set({ error: errorMessage, isPinging: false });
        throw err;
      }
    },

    runProjection: async (request: ProjectionRunRequest) => {
      const { status } = get();
      if (status !== 'connected') {
        throw new Error('Not connected to NATS');
      }

      set({ isProjecting: true, error: null });

      try {
        const response = await natsService.request<ProjectionRunRequest, ProjectionRunResponse>(
          'popula.projection.run',
          request,
          60000 // 60 second timeout for long projections
        );
        set({ isProjecting: false });
        return response.payload;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Projection failed';
        set({ error: errorMessage, isProjecting: false });
        throw err;
      }
    },
  };
});

// Re-export types for convenience
export type { ConnectionStatus, PingResponse };
