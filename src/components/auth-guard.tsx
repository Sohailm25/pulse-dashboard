import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useProjectStore } from '@/stores/project-store';
import { useHabitStore } from '@/stores/habit-store';

export function AuthGuard() {
  const { user, isLoading, checkAuth } = useAuthStore();
  const { fetchProjects } = useProjectStore();
  const { fetchHabits } = useHabitStore();
  const location = useLocation();

  useEffect(() => {
    // Check authentication status if not already loading
    if (!isLoading && !user) {
      checkAuth();
    }
    
    // Fetch projects and habits if authenticated
    if (user) {
      fetchProjects();
      fetchHabits();
    }
  }, [user, isLoading, checkAuth, fetchProjects, fetchHabits]);

  // Show loading state while checking authentication
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!user && location.pathname !== '/auth') {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to dashboard if already authenticated and trying to access login page
  if (user && location.pathname === '/auth') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}