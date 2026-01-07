import { useContext } from 'react';
import { NatsContext } from '@/providers/NatsProvider';

/**
 * Hook to access NATS connection state and methods
 */
export function useNats() {
  const context = useContext(NatsContext);
  
  if (!context) {
    throw new Error('useNats must be used within a NatsProvider');
  }
  
  return context;
}

