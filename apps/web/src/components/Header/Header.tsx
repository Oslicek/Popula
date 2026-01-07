import { Link } from 'react-router-dom';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>◉</span>
          <span className={styles.logoText}>Popula</span>
        </Link>
        
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>Dashboard</Link>
          <Link to="/scenarios" className={styles.navLink}>Scenarios</Link>
          <Link to="/data" className={styles.navLink}>Data</Link>
        </nav>
      </div>
    </header>
  );
}
