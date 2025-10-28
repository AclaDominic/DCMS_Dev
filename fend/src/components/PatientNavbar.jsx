import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/api";
import { useAuth } from "../hooks/useAuth";
import NotificationBell from "./NotificationBell"; // ✅ new bell
import logo from "../pages/logo.png"; // ✅ import your logo

function PatientNavbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { logout } = useAuth();

  useEffect(() => {
    api
      .get("/api/user")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <>
   <nav className="navbar navbar-expand-lg navbar-light shadow-sm px-3" style={{background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)'}}>
  <div className="container-fluid">
    {/* Left: Logo */}
    <Link className="navbar-brand d-flex align-items-center" to="/patient">
      <img
        src={logo}
        alt="Kreative Dental Clinic"
        style={{
          height: "32px",
          width: "32px",
          objectFit: "contain",
          marginRight: "8px",
        }}
      />
      <span className="fst-bold" style={{color: 'white'}}>Kreative Dental & Orthodontics</span>
    </Link>

    {/* ✅ Toggle for mobile menu */}
    <button
      className="navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#patientNavbarNav"
      aria-controls="patientNavbarNav"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <span className="navbar-toggler-icon"></span>
    </button>

    {/* Right: Navigation Items (collapsible) */}
    <div className="collapse navbar-collapse" id="patientNavbarNav">
      <div className="navbar-nav ms-auto align-items-lg-center">
        <Link to="/patient" className="nav-link" style={{color: 'white'}}>
          <i className="bi bi-house me-1"></i>
          <span  >Home</span>
        </Link>
        {user && <NotificationBell />}
        {user && (
          <button
            onClick={handleLogout}
            className="btn btn-sm ms-lg-3 mt-2 mt-lg-0 d-flex align-items-center"
            style={{
              background: 'linear-gradient(90deg, #0077b6 0%, #00b4d8 100%)',
              color: 'white',
              border: 'none',
              fontWeight: '600',
              padding: '0.5rem 1.2rem',
              borderRadius: '50px',
              boxShadow: '0 4px 12px rgba(0, 119, 182, 0.3)',
              transition: 'all 0.3s ease',
              fontSize: '0.9rem',
              letterSpacing: '0.5px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(90deg, #0056b3 0%, #0096c7 100%)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(0, 119, 182, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(90deg, #0077b6 0%, #00b4d8 100%)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(0, 119, 182, 0.3)';
            }}
          >
            <i className="bi bi-lock-fill me-2" style={{fontSize: '0.9rem', color: '#dc3545'}}></i>
            <span>LOG OUT</span>
          </button>
        )}
      </div>
    </div>
  </div>
</nav>


    </>
  );
}

export default PatientNavbar;
