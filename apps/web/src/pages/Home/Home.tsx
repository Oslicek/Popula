import { useEffect, useState } from 'react';
import { useNatsStore } from '@/stores/natsStore';
import styles from './Home.module.css';

export function Home() {
  const { status, error, lastPingResponse, isPinging, connect, ping } = useNatsStore();
  const [pingMessage, setPingMessage] = useState('Hello from TypeScript!');
  
  useEffect(() => {
    // Auto-connect on mount
    connect();
  }, [connect]);

  const handlePing = async () => {
    try {
      await ping(pingMessage);
    } catch (err) {
      console.error('Ping failed:', err);
    }
  };
  
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <h1 className={styles.title}>
          <span className={styles.titleAccent}>Popula</span>
          <span className={styles.titleSub}>Demographic Modeling Engine</span>
        </h1>
        <p className={styles.subtitle}>
          Create flexible demographic projections with crisis scenarios.
          <br />
          Powered by the Cohort-Component Method.
        </p>
      </section>
      
      <section className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardIcon}>📊</div>
          <h3 className={styles.cardTitle}>Population Projections</h3>
          <p className={styles.cardText}>
            Model population changes year-by-year with mortality, fertility, and migration.
          </p>
        </div>
        
        <div className={styles.card}>
          <div className={styles.cardIcon}>⚡</div>
          <h3 className={styles.cardTitle}>Crisis Scenarios</h3>
          <p className={styles.cardText}>
            Simulate pandemics, wars, and migration crises with shock modifiers.
          </p>
        </div>
        
        <div className={styles.card}>
          <div className={styles.cardIcon}>🗺️</div>
          <h3 className={styles.cardTitle}>Geographic Flavor</h3>
          <p className={styles.cardText}>
            Multi-region modeling with migration flows between areas.
          </p>
        </div>
      </section>
      
      <section className={styles.status}>
        <div className={styles.statusCard}>
          <h3>System Status</h3>
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>NATS Connection</span>
              <span className={`${styles.statusValue} ${styles[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Worker</span>
              <span className={styles.statusValue}>
                {lastPingResponse ? `v${lastPingResponse.worker_version}` : 
                  status === 'connected' ? 'Ready to ping' : 'Waiting...'}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Storage</span>
              <span className={styles.statusValue}>In-Memory</span>
            </div>
          </div>
          {error && (
            <div className={styles.errorMessage}>
              ⚠️ {error}
            </div>
          )}
        </div>
      </section>

      {/* Ping Demo Section */}
      <section className={styles.pingSection}>
        <div className={styles.pingCard}>
          <h3>🏓 NATS Demo - Ping the Rust Worker</h3>
          <p className={styles.pingDescription}>
            Send a message to the Rust worker via NATS and see the response.
          </p>
          
          <div className={styles.pingForm}>
            <input
              type="text"
              value={pingMessage}
              onChange={(e) => setPingMessage(e.target.value)}
              placeholder="Enter your message..."
              className={styles.pingInput}
              disabled={status !== 'connected' || isPinging}
            />
            <button 
              className="btn btn-primary"
              onClick={handlePing}
              disabled={status !== 'connected' || isPinging || !pingMessage.trim()}
            >
              {isPinging ? 'Sending...' : 'Send Ping'}
            </button>
          </div>

          {lastPingResponse && (
            <div className={styles.pingResponse}>
              <h4>Response from Rust Worker:</h4>
              <div className={styles.responseContent}>
                <div className={styles.responseField}>
                  <span className={styles.responseLabel}>Reply:</span>
                  <span className={styles.responseValue}>{lastPingResponse.reply}</span>
                </div>
                <div className={styles.responseField}>
                  <span className={styles.responseLabel}>Worker Version:</span>
                  <span className={styles.responseValue}>{lastPingResponse.worker_version}</span>
                </div>
                <div className={styles.responseField}>
                  <span className={styles.responseLabel}>Processed At:</span>
                  <span className={styles.responseValue}>
                    {new Date(lastPingResponse.processed_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      
      <section className={styles.actions}>
        <button className="btn btn-primary" disabled={status !== 'connected'}>
          Create New Scenario
        </button>
        <button className="btn btn-secondary" disabled={status !== 'connected'}>
          Load Sample Data
        </button>
      </section>
    </div>
  );
}
