import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} Popula — Demographic Modeling Engine
        </p>
        <p className={styles.tagline}>
          Professional demographic modeling with game-like accessibility
        </p>
      </div>
    </footer>
  );
}

