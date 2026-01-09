/**
 * Admin Pages - Administration and Developer Tools
 */

import { Link, useLocation } from 'react-router-dom';
import styles from './Admin.module.css';

export function AdminPlaceholder() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Admin</h1>
      </div>
      <div className={styles.content}>
        <div className={styles.grid}>
          <Link to="/admin/users" className={styles.card}>
            <div className={styles.cardIcon}>👥</div>
            <h3>Users</h3>
            <p>Manage users, roles, and permissions</p>
          </Link>
          <Link to="/admin/billing" className={styles.card}>
            <div className={styles.cardIcon}>💳</div>
            <h3>Billing</h3>
            <p>Usage tracking and billing management</p>
          </Link>
          <Link to="/admin/devtools" className={styles.card}>
            <div className={styles.cardIcon}>🛠️</div>
            <h3>Developer Tools</h3>
            <p>System status, debugging, and diagnostics</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function UsersPlaceholder() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Breadcrumb current="Users" />
        <h1>Users</h1>
      </div>
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <div className={styles.icon}>👥</div>
          <h2>User Management</h2>
          <p>Manage team members, roles, and permissions</p>
          <p className={styles.note}>Coming in Phase 4</p>
        </div>
      </div>
    </div>
  );
}

export function BillingPlaceholder() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Breadcrumb current="Billing" />
        <h1>Billing</h1>
      </div>
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <div className={styles.icon}>💳</div>
          <h2>Billing & Usage</h2>
          <p>Track usage and manage billing</p>
          <p className={styles.note}>Coming in Phase 4</p>
        </div>
      </div>
    </div>
  );
}

export function DevToolsPlaceholder() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Breadcrumb current="Developer Tools" />
        <h1>Developer Tools</h1>
        <kbd className={styles.shortcut}>Ctrl+Shift+D</kbd>
      </div>
      <div className={styles.content}>
        <div className={styles.devToolsGrid}>
          {/* System Status */}
          <div className={styles.devCard}>
            <h3>System Status</h3>
            <div className={styles.statusGrid}>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>NATS</span>
                <span className={`${styles.statusBadge} ${styles.connected}`}>Connected</span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Worker</span>
                <span className={styles.statusValue}>Ready</span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Storage</span>
                <span className={styles.statusValue}>In-Memory</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.devCard}>
            <h3>Quick Actions</h3>
            <div className={styles.actionButtons}>
              <button className="btn btn-secondary">🔄 Reconnect NATS</button>
              <button className="btn btn-secondary">🗑️ Clear Storage</button>
              <button className="btn btn-secondary">🏓 Ping Worker</button>
            </div>
          </div>

          {/* Services */}
          <div className={styles.devCard}>
            <h3>Services</h3>
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
      </div>
    </div>
  );
}

function Breadcrumb({ current }: { current: string }) {
  return (
    <nav className={styles.breadcrumb}>
      <Link to="/admin">Admin</Link>
      <span className={styles.breadcrumbSep}>/</span>
      <span>{current}</span>
    </nav>
  );
}

export { AdminPlaceholder as Admin };
