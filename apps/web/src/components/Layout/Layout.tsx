import { Outlet } from 'react-router-dom';
import { Header } from '../Header';
import { ConnectionStatus } from '../ConnectionStatus';
import styles from './Layout.module.css';

export function Layout() {
  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <ConnectionStatus />
          <span className={styles.version}>Popula v0.1.0</span>
        </div>
      </footer>
    </div>
  );
}
