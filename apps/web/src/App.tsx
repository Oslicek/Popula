import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/shell';

// Placeholder pages - will be replaced with real implementations
import { ExplorePlaceholder } from './pages/Explore/Explore';
import { DataWorkspace } from './pages/DataWorkspace/DataWorkspace';
import { ScenariosPlaceholder, ScenarioEditorPlaceholder } from './pages/Scenarios/Scenarios';
import { Runs, RunDetailPage, CompareView } from './pages/Runs/Runs';
import { ReportsPlaceholder } from './pages/Reports/Reports';
import { AdminPlaceholder, UsersPlaceholder, BillingPlaceholder, DevToolsPlaceholder } from './pages/Admin/Admin';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          {/* Default redirect to Explore */}
          <Route path="/" element={<Navigate to="/explore" replace />} />
          
          {/* Explore (main workbench) */}
          <Route path="/explore" element={<ExplorePlaceholder />} />
          
          {/* Data Workspace */}
          <Route path="/data" element={<DataWorkspace />} />
          <Route path="/data/catalog" element={<DataWorkspace />} />
          <Route path="/data/files" element={<DataWorkspace />} />
          
          {/* Scenarios */}
          <Route path="/scenarios" element={<ScenariosPlaceholder />} />
          <Route path="/scenarios/:id" element={<ScenarioEditorPlaceholder />} />
          
          {/* Runs */}
          <Route path="/runs" element={<Runs />} />
          <Route path="/runs/compare" element={<CompareView />} />
          <Route path="/runs/:id" element={<RunDetailPage />} />
          
          {/* Reports */}
          <Route path="/reports" element={<ReportsPlaceholder />} />
          
          {/* Admin */}
          <Route path="/admin" element={<AdminPlaceholder />} />
          <Route path="/admin/users" element={<UsersPlaceholder />} />
          <Route path="/admin/billing" element={<BillingPlaceholder />} />
          <Route path="/admin/devtools" element={<DevToolsPlaceholder />} />
          
          {/* Legacy redirects */}
          <Route path="/workspace/:id" element={<Navigate to="/explore" replace />} />
          <Route path="/map" element={<Navigate to="/explore" replace />} />
          <Route path="/map-cz" element={<Navigate to="/explore" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
