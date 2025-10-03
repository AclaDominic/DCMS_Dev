import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function AuthRedirector() {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading) return;

    const publicRoutes = ['/app', '/login', '/register', '/forgot-password'];
    
    // If user is logged in and on a public route, redirect to their dashboard
    if (user && publicRoutes.includes(location.pathname)) {
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'staff') navigate('/staff');
      else if (user.role === 'patient') navigate('/patient');
      else if (user.role === 'dentist') navigate('/dentist');
    }
    
    // If no user is logged in and not on a public route, redirect to /app (landing page)
    if (!user && !publicRoutes.includes(location.pathname)) {
      navigate('/');
    }
  }, [user, authLoading, location.pathname, navigate]);

  if (authLoading) {
    return <LoadingSpinner message="Checking session..." />;
  }

  return null;
}
