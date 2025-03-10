import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

export function AuthGuard() {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user && location.pathname !== '/auth') {
    return <Navigate to="/auth" replace />;
  }

  if (user && location.pathname === '/auth') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}