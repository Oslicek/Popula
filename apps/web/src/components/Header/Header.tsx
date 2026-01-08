import { Link, useLocation } from 'react-router-dom';
import styles from './Header.module.css';

export function Header() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/workspace');
    }
    return location.pathname.startsWith(path);
  };
  
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>◉</span>
          <span className={styles.logoText}>Popula</span>
        </Link>
        
        <nav className={styles.nav}>
          <Link 
            to="/" 
            className={`${styles.navLink} ${isActive('/') ? styles.active : ''}`}
          >
            📊 Workspaces
          </Link>
          <Link 
            to="/map" 
            className={`${styles.navLink} ${isActive('/map') ? styles.active : ''}`}
          >
            🗺️ Map
          </Link>
          <Link 
            to="/map-cz" 
            className={`${styles.navLink} ${isActive('/map-cz') ? styles.active : ''}`}
          >
            🗺️ CZ Map
          </Link>
        </nav>
      </div>
    </header>
  );
}
