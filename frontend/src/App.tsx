import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';

import { LoginPage } from './pages/LoginPage';
import { AssetListPage } from './pages/AssetListPage';
import { AssetDetailPage } from './pages/AssetDetailPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { LocationsPage } from './pages/LocationsPage';
import { PublicScanPage } from './pages/PublicScanPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Unauthenticated Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/scan/:qrToken" element={<PublicScanPage />} />

            {/* Protected Admin/Viewer Dashboard Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/" element={<Navigate to="/assets" replace />} />
                <Route path="/assets" element={<AssetListPage />} />
                <Route path="/assets/:id" element={<AssetDetailPage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/locations" element={<LocationsPage />} />
              </Route>
            </Route>

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
