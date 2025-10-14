import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import PatientNavbar from "../components/PatientNavbar";
import "./PatientLayout.css";

function PatientLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Role protection - only allow patient users
  useEffect(() => {
    if (user && user.role !== 'patient') {
      // Redirect non-patient users to their appropriate dashboard
      const redirectPath = user.role === 'admin' ? '/admin' : 
                          user.role === 'staff' ? '/staff' : 
                          user.role === 'dentist' ? '/dentist' : '/';
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate]);
  
  // Check if current route is the homepage
  const isHomepage = location.pathname === "/patient" || location.pathname === "/patient/";
  
  return (
    <div className="d-flex flex-column min-vh-100 bg-light patient-layout">
      <PatientNavbar />
      
      {isHomepage ? (
        // Full-width layout for homepage
        <main className="flex-grow-1">
          <Outlet />
        </main>
      ) : (
        // Full-width responsive layout for all other pages
        <main className="flex-grow-1 py-4">
          <div className="container-fluid px-2 px-md-3 px-lg-4">
            <Outlet />
          </div>
        </main>
      )}
    </div>
  );
}

export default PatientLayout;