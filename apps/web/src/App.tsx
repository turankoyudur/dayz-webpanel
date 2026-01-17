import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/auth';
import NavBar from './components/NavBar';
import LoginPage from './pages/LoginPage';
import InstancesPage from './pages/InstancesPage';
import InstanceDetailPage from './pages/InstanceDetailPage';

function RequireAuth({ children }: { children: JSX.Element }): JSX.Element {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="container">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <NavBar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/instances"
          element={
            <RequireAuth>
              <InstancesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/instances/:id"
          element={
            <RequireAuth>
              <InstanceDetailPage />
            </RequireAuth>
          }
        />
        <Route path="/" element={<Navigate to="/instances" replace />} />
        <Route path="*" element={<Navigate to="/instances" replace />} />
      </Routes>
    </AuthProvider>
  );
}
