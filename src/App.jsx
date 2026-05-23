import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import useLicenseStore from './store/useLicenseStore';

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
import LicencaBloqueio from './pages/LicencaBloqueio';
import Clientes from './pages/Clientes';

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
  const { licenseStatus, verificarLicenca, machineId } = useLicenseStore();

  useEffect(() => {
    verificarLicenca();
  }, [verificarLicenca]);

  if (licenseStatus.loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-brand-dark text-white select-none">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-accent mb-4"></div>
        <p className="text-sm text-gray-400 font-semibold tracking-wide">Validando licença do terminal...</p>
      </div>
    );
  }

  // Se a licença não for válida, exibe unicamente a tela de bloqueio e impede acesso às rotas
  if (!licenseStatus.valida) {
    return <LicencaBloqueio currentLicenseStatus={licenseStatus} machineId={machineId} />;
  }

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

        <Route path="/admin/clientes" element={
          <ProtectedRoute allowedRoles={['admin', 'gerente']}>
            <AdminLayout>
              <Clientes />
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
