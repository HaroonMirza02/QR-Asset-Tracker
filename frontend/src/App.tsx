import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AssetListPage = lazy(() => import('./pages/AssetListPage').then(m => ({ default: m.AssetListPage })));
const AssetDetailPage = lazy(() => import('./pages/AssetDetailPage').then(m => ({ default: m.AssetDetailPage })));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage').then(m => ({ default: m.EmployeesPage })));
const LocationsPage = lazy(() => import('./pages/LocationsPage').then(m => ({ default: m.LocationsPage })));
const PublicScanPage = lazy(() => import('./pages/PublicScanPage').then(m => ({ default: m.PublicScanPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<div className="min-h-screen grid place-items-center text-sm text-slate-500" role="status">Loading EZTrack…</div>}><Routes>
            {/* Unauthenticated Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/scan/:qrToken" element={<PublicScanPage />} />

            {/* Protected Admin/Viewer Dashboard Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>

                <Route path="/assets" element={<AssetListPage />} />
                <Route path="/assets/:id" element={<AssetDetailPage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/locations" element={<LocationsPage />} />
              </Route>
            </Route>

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes></Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

