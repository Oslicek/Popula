import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Workspace } from './pages/Workspace';
import { Map } from './pages/Map';
import { CzMap } from './pages/CzMap/CzMap';
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
            <Route path="/map" element={<Map />} />
            <Route path="/map-cz" element={<CzMap />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}
