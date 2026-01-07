import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Workspace } from './pages/Workspace';
import { Layout } from './components/Layout';
import styles from './App.module.css';

export function App() {
  return (
    <BrowserRouter>
      <div className={styles.app}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/workspace/:id" element={<Workspace />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}
