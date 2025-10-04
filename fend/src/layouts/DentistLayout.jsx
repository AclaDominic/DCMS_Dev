import { Outlet, useLocation } from "react-router-dom";
import DentistNavbar from "../components/DentistNavbar";
import "./DentistLayout.css";
import DentistPasswordGate from "../components/DentistPasswordGate";

function DentistLayout() {
  const location = useLocation();
  
  // Check if current route is the homepage
  const isHomepage = location.pathname === "/dentist" || location.pathname === "/dentist/";
  
  return (
    <div className="d-flex flex-column min-vh-100 bg-light dentist-layout">
      <DentistNavbar />
      
      {isHomepage ? (
        // Full-width layout for homepage
        <main className="flex-grow-1">
          <DentistPasswordGate>
            <Outlet />
          </DentistPasswordGate>
        </main>
      ) : (
        // Full-width responsive layout for all other pages
        <main className="flex-grow-1 py-4">
          <div className="container-fluid px-2 px-md-3 px-lg-4">
            <DentistPasswordGate>
              <Outlet />
            </DentistPasswordGate>
          </div>
        </main>
      )}
    </div>
  );
}

export default DentistLayout;
