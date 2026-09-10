import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Eager load critical pages (auth, dashboard, transactions)
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';

// Lazy load less frequently used pages
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Recurring = lazy(() => import('./pages/Recurring'));
const Goals = lazy(() => import('./pages/Goals'));
const Categories = lazy(() => import('./pages/Categories'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Reports = lazy(() => import('./pages/Reports'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Family = lazy(() => import('./pages/Family'));
const JoinFamily = lazy(() => import('./pages/JoinFamily'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" /> : children;
}

// Loading component for lazy loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <CurrencyProvider>
          <Router>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--toast-text)',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#ffffff',
                  },
                  style: {
                    background: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #86efac',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#ffffff',
                  },
                  style: {
                    background: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fca5a5',
                  },
                },
                loading: {
                  iconTheme: {
                    primary: '#3b82f6',
                    secondary: '#ffffff',
                  },
                  style: {
                    background: '#eff6ff',
                    color: '#1e40af',
                    border: '1px solid #93c5fd',
                  },
                },
              }}
            />
            <Suspense fallback={<PageLoader />}>
              <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/join-family" element={<PrivateRoute><JoinFamily /></PrivateRoute>} />
            
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="recurring" element={<Recurring />} />
              <Route path="goals" element={<Goals />} />
              <Route path="categories" element={<Categories />} />
              <Route path="budgets" element={<Budgets />} />
              <Route path="reports" element={<Reports />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="family" element={<Family />} />
              <Route path="profile" element={<Profile />} />
              <Route path="admin" element={<Admin />} />
            </Route>
          </Routes>
        </Suspense>
        </Router>
      </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
