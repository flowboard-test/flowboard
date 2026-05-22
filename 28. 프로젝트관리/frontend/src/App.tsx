import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Layout } from '@/components/common/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { ProjectListPage } from '@/pages/ProjectListPage';
import { ProjectPage } from '@/pages/ProjectPage';
import { MyTasksPage } from '@/pages/MyTasksPage';
import { AccountPage } from '@/pages/AccountPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute><Layout /></ProtectedRoute>
      }>
        <Route index element={<Navigate to="/my-tasks" replace />} />
        <Route path="projects" element={<ProjectListPage />} />
        <Route path="projects/:id" element={<ProjectPage />} />
        <Route path="my-tasks" element={<MyTasksPage />} />
        <Route path="account" element={<AccountPage />} />
      </Route>
    </Routes>
  );
}

export default App;
