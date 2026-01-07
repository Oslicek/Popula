import { useNatsStore } from '@/stores/natsStore';
import styles from './ConnectionStatus.module.css';

export function ConnectionStatus() {
  const { status, error } = useNatsStore();
  
  const statusConfig = {
    disconnected: { label: 'Disconnected', className: styles.disconnected },
    connecting: { label: 'Connecting...', className: styles.connecting },
    connected: { label: 'Connected', className: styles.connected },
    error: { label: 'Error', className: styles.error },
  };
  
  const config = statusConfig[status];
  
  return (
    <div className={styles.container}>
      <div className={`${styles.indicator} ${config.className}`} />
      <span className={styles.label}>{config.label}</span>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
