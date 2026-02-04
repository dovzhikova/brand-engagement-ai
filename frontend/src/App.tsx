import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuthStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workflow from './pages/Workflow';
import Accounts from './pages/Accounts';
import Personas from './pages/Personas';
import Keywords from './pages/Keywords';
import Settings from './pages/Settings';
import GSCAnalytics from './pages/GSCAnalytics';
import YouTube from './pages/YouTube';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="discovery" element={<Navigate to="/keywords" replace />} />
        <Route path="workflow" element={<Workflow />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="personas" element={<Personas />} />
        <Route path="keywords" element={<Keywords />} />
        <Route path="gsc" element={<GSCAnalytics />} />
        <Route path="youtube" element={<YouTube />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
