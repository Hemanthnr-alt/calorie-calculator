import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from '../context/AppContext.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import Navbar from '../components/Navbar.jsx';
import Onboarding from '../pages/Onboarding.jsx';
import Dashboard from '../pages/Dashboard.jsx';

const FoodLog  = lazy(() => import('../pages/FoodLog.jsx'));
const Water    = lazy(() => import('../pages/Water.jsx'));
const Insights = lazy(() => import('../pages/Insights.jsx'));
const Settings = lazy(() => import('../pages/Settings.jsx'));
const Recipes  = lazy(() => import('../pages/Recipes.jsx'));

function Loading() {
  return (
    <div className="page">
      <div className="skel skel-block" />
      <div className="skel skel-line" />
      <div className="skel skel-line short" />
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <Suspense fallback={<Loading />}>
      <Routes location={location}>
        <Route path="/"         element={<Dashboard />} />
        <Route path="/log"      element={<FoodLog />} />
        <Route path="/recipes"  element={<Recipes />} />
        <Route path="/water"    element={<Water />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className="toast" key={toast.id}>
      <span style={{ fontSize: '1.1rem' }}>{toast.icon}</span>
      {toast.message}
    </div>
  );
}

function AppContent() {
  const { loading, setupDone } = useApp();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <span style={{ color: 'var(--tx-3)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em' }}>
          30 CALZ
        </span>
      </div>
    );
  }

  if (!setupDone) return <Onboarding />;

  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <Toast />
        <main><AppRoutes /></main>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}
