import { create } from 'zustand';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface NatsState {
  status: ConnectionStatus;
  error: string | null;
  
  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useNatsStore = create<NatsState>((set, get) => ({
  status: 'disconnected',
  error: null,
  
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: error ? 'error' : get().status }),
  
  connect: async () => {
    const { status } = get();
    if (status === 'connected' || status === 'connecting') {
      return;
    }
    
    set({ status: 'connecting', error: null });
    
    try {
      // TODO: Implement actual NATS WebSocket connection
      // For now, simulate a connection attempt
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Simulate connection success for demo
      set({ status: 'connected', error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      set({ status: 'error', error: message });
    }
  },
  
  disconnect: () => {
    // TODO: Implement actual disconnect
    set({ status: 'disconnected', error: null });
  },
}));


