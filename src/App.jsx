import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import CashierLayout from './layouts/CashierLayout';

// Pages
import Login from './pages/Login';
import PDV from './pages/PDV';
import Dashboard from './pages/Dashboard';
import Estoque from './pages/Estoque';
import XMLImport from './pages/XMLImport';
import Relatorios from './pages/Relatorios';
import Backup from './pages/Backup';
import Config from './pages/Config';

// Protected Route wrapper for Auth
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If operator attempts to access admin, send to PDV
    if (user.role === 'operador') {
      return <Navigate to="/pdv" replace />;
    }
    // Else fall back to login
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <HashRouter>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={
          isAuthenticated ? (
            user.role === 'operador' ? <Navigate to="/pdv" replace /> : <Navigate to="/admin" replace />
          ) : (
            <Login />
          )
        } />

        {/* PDV / Front-of-Cashier Route */}
        <Route path="/pdv" element={
          <ProtectedRoute allowedRoles={['admin', 'gerente', 'operador']}>
            <CashierLayout>
              <PDV />
            </CashierLayout>
          </ProtectedRoute>
        } />

        {/* Admin Retaguarda Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin', 'gerente']}>
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/estoque" element={
          <ProtectedRoute allowedRoles={['admin', 'gerente']}>
            <AdminLayout>
              <Estoque />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/xml" element={
          <ProtectedRoute allowedRoles={['admin', 'gerente']}>
            <AdminLayout>
              <XMLImport />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/relatorios" element={
          <ProtectedRoute allowedRoles={['admin', 'gerente']}>
            <AdminLayout>
              <Relatorios />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/backup" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <Backup />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/config" element={
          <ProtectedRoute allowedRoles={['admin', 'gerente']}>
            <AdminLayout>
              <Config />
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* Fallback routing */}
        <Route path="*" element={
          isAuthenticated ? (
            user.role === 'operador' ? <Navigate to="/pdv" replace /> : <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>
    </HashRouter>
  );
}
