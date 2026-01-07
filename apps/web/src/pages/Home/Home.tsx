import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNatsStore } from '@/stores/natsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import styles from './Home.module.css';

export function Home() {
  const navigate = useNavigate();
  const { status, error, lastPingResponse, isPinging, connect, disconnect, ping } = useNatsStore();
  const { getWorkspaceSummaries, createNewWorkspace, deleteWorkspace } = useWorkspaceStore();
  const [pingMessage, setPingMessage] = useState('Hello from TypeScript!');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const workspaces = getWorkspaceSummaries();
  
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

  const handleCreateWorkspace = () => {
    if (newWorkspaceName.trim()) {
      const id = createNewWorkspace(newWorkspaceName.trim());
      setNewWorkspaceName('');
      setShowCreateForm(false);
      navigate(`/workspace/${id}`);
    }
  };

  const handleDeleteWorkspace = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this workspace? This cannot be undone.')) {
      deleteWorkspace(id);
    }
  };

  const handleClearStorage = () => {
    if (confirm('Clear ALL local storage? This will delete all workspaces and cached data.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      disconnect();
      await new Promise(resolve => setTimeout(resolve, 500));
      await connect();
    } finally {
      setIsReconnecting(false);
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
      
      {/* Workspaces Section */}
      <section className={styles.workspaces}>
        <div className={styles.workspacesHeader}>
          <h2>📁 Your Workspaces</h2>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            + New Workspace
          </button>
        </div>
        
        {showCreateForm && (
          <div className={styles.createForm}>
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name (e.g., Czech Republic 2024)"
              className={styles.createInput}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateWorkspace();
                if (e.key === 'Escape') setShowCreateForm(false);
              }}
            />
            <button className="btn btn-primary" onClick={handleCreateWorkspace}>
              Create
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </button>
          </div>
        )}
        
        {workspaces.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No workspaces yet. Create one to start your demographic projection!</p>
          </div>
        ) : (
          <div className={styles.workspaceList}>
            {workspaces.map((ws) => (
              <div 
                key={ws.id} 
                className={styles.workspaceCard}
                onClick={() => navigate(`/workspace/${ws.id}`)}
              >
                <div className={styles.workspaceInfo}>
                  <h4>{ws.name}</h4>
                  <div className={styles.workspaceStatus}>
                    <span className={ws.hasPopulation ? styles.statusOk : styles.statusMissing}>
                      {ws.hasPopulation ? '✓' : '○'} Population
                    </span>
                    <span className={ws.hasMortality ? styles.statusOk : styles.statusMissing}>
                      {ws.hasMortality ? '✓' : '○'} Mortality
                    </span>
                    <span className={ws.hasFertility ? styles.statusOk : styles.statusMissing}>
                      {ws.hasFertility ? '✓' : '○'} Fertility
                    </span>
                    <span className={ws.hasMigration ? styles.statusOk : styles.statusOptional}>
                      {ws.hasMigration ? '✓' : '○'} Migration
                    </span>
                  </div>
                  <span className={styles.workspaceDate}>
                    Updated {new Date(ws.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.workspaceActions}>
                  {ws.projectionStatus === 'completed' && (
                    <span className={styles.projectionBadge}>📊 Results</span>
                  )}
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => handleDeleteWorkspace(ws.id, e)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* Sample Data Section */}
      <section className={styles.sampleData}>
        <div className={styles.sampleDataCard}>
          <div className={styles.sampleDataHeader}>
            <div className={styles.sampleDataIcon}>🌍</div>
            <div>
              <h3>Sample Dataset: Republic of Humania</h3>
              <p className={styles.sampleDataSubtitle}>
                A fictional country with ~10 million people. Perfect for testing projections.
              </p>
            </div>
          </div>
          
          <div className={styles.sampleDataStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>10,247,893</span>
              <span className={styles.statLabel}>Population</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>41.2</span>
              <span className={styles.statLabel}>Median Age</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>1.67</span>
              <span className={styles.statLabel}>Fertility Rate</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>79.3</span>
              <span className={styles.statLabel}>Life Expectancy</span>
            </div>
          </div>

          <div className={styles.downloadSection}>
            <h4>Download Sample Files</h4>
            <p className={styles.downloadHint}>
              Use these CSV files to test the projection engine or as templates for your own data.
            </p>
            <div className={styles.downloadGrid}>
              <a href="/sample-data/population.csv" download className={styles.downloadItem}>
                <span className={styles.downloadIcon}>👥</span>
                <span className={styles.downloadName}>population.csv</span>
                <span className={styles.downloadDesc}>Age-sex distribution</span>
              </a>
              <a href="/sample-data/mortality.csv" download className={styles.downloadItem}>
                <span className={styles.downloadIcon}>📉</span>
                <span className={styles.downloadName}>mortality.csv</span>
                <span className={styles.downloadDesc}>Death probabilities by age</span>
              </a>
              <a href="/sample-data/fertility.csv" download className={styles.downloadItem}>
                <span className={styles.downloadIcon}>👶</span>
                <span className={styles.downloadName}>fertility.csv</span>
                <span className={styles.downloadDesc}>Birth rates by age</span>
              </a>
              <a href="/sample-data/migration.csv" download className={styles.downloadItem}>
                <span className={styles.downloadIcon}>✈️</span>
                <span className={styles.downloadName}>migration.csv</span>
                <span className={styles.downloadDesc}>Net migration by age</span>
              </a>
              <a href="/sample-data/humania.json" download className={styles.downloadItem}>
                <span className={styles.downloadIcon}>⚙️</span>
                <span className={styles.downloadName}>humania.json</span>
                <span className={styles.downloadDesc}>Census metadata</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Tools Section */}
      <section className={styles.devTools}>
        <div className={styles.devToolsCard}>
          <h3>🛠️ Developer Tools</h3>
          
          <div className={styles.devToolsGrid}>
            <div className={styles.devToolItem}>
              <h4>Storage</h4>
              <p>Clear all local storage including workspaces and cached data.</p>
              <button 
                className="btn btn-secondary"
                onClick={handleClearStorage}
              >
                🗑️ Clear Local Storage
              </button>
            </div>
            
            <div className={styles.devToolItem}>
              <h4>NATS Connection</h4>
              <p>
                Status: <span className={`${styles.statusBadge} ${styles[status]}`}>
                  {status}
                </span>
              </p>
              <button 
                className="btn btn-secondary"
                onClick={handleReconnect}
                disabled={isReconnecting}
              >
                🔄 {isReconnecting ? 'Reconnecting...' : 'Reconnect NATS'}
              </button>
            </div>
            
            <div className={styles.devToolItem}>
              <h4>Services</h4>
              <p>Backend services must be restarted from terminal.</p>
              <div className={styles.serviceList}>
                <div className={styles.serviceItem}>
                  <span>NATS Server</span>
                  <code>.\infra\scripts\start-nats.ps1</code>
                </div>
                <div className={styles.serviceItem}>
                  <span>Rust Worker</span>
                  <code>cd worker && cargo run</code>
                </div>
                <div className={styles.serviceItem}>
                  <span>Frontend</span>
                  <code>pnpm dev</code>
                </div>
              </div>
            </div>
          </div>
          
          {error && (
            <div className={styles.devToolsError}>
              ⚠️ Error: {error}
            </div>
          )}
        </div>
      </section>
      
    </div>
  );
}
