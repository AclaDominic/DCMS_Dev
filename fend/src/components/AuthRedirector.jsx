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

    // Router uses basename "/"; path is already normalized
    const normalized = location.pathname || '/';
    const publicRoutes = ['/', '/login', '/register', '/forgot-password'];
    
    // Check if route is public/allowed
    const isPublicRoute = publicRoutes.some(route => normalized === route) || 
                          normalized.startsWith('/password-reset/') ||
                          normalized.startsWith('/verify-email') ||
                          normalized.startsWith('/verify-success') ||
                          normalized.startsWith('/pay/'); // Payment result pages
    
    // Helper function to get user's default dashboard
    const getUserDashboard = (role) => {
      switch(role) {
        case 'admin': return '/admin';
        case 'staff': return '/staff';
        case 'patient': return '/patient';
        case 'dentist': return '/dentist';
        default: return '/';
      }
    };
    
    // If user is logged in
    if (user) {
      const userDashboard = getUserDashboard(user.role);
      
      // Redirect from public routes to their dashboard
      if (publicRoutes.includes(normalized)) {
        navigate(userDashboard, { replace: true });
        return;
      }

      // Role-based route protection - prevent cross-role access
      const roleRouteMap = {
        'admin': ['/admin'],
        'staff': ['/staff'],
        'patient': ['/patient'],
        'dentist': ['/dentist']
      };

      // Check if user is trying to access routes not for their role
      for (const [role, routes] of Object.entries(roleRouteMap)) {
        if (user.role !== role) {
          for (const route of routes) {
            if (normalized.startsWith(route)) {
              // Unauthorized access attempt - redirect to their dashboard
              navigate(userDashboard, { replace: true });
              return;
            }
          }
        }
      }
    }
    
    // If no user is logged in and not on a public/allowed route
    if (!user && !isPublicRoute && normalized !== '/notifications') {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, location.pathname, navigate]);

  if (authLoading) {
    return <LoadingSpinner message="Checking session..." />;
  }

  return null;
}
