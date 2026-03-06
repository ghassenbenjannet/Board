import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { BoardsPage } from './pages/BoardsPage';
import { BoardPage } from './pages/BoardPage';
import { useAuth } from './lib/auth';

function Protected({ children }: { children: JSX.Element }) {
  const token = useAuth((s) => s.token);
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  const loadMe = useAuth((s) => s.loadMe);
  useEffect(() => { loadMe(); }, [loadMe]);

  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/boards" element={<Protected><BoardsPage /></Protected>} />
      <Route path="/boards/:id" element={<Protected><BoardPage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
