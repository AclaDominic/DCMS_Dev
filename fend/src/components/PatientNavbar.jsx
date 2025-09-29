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
    navigate("/app");
  };

  return (
    <>
   <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm px-3">
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
      <span className="fst-bold">Kreative Dental & Orthodontics</span>
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
        <Link to="/patient" className="nav-link">
          <i className="bi bi-house me-1"></i>
          <span  >Home</span>
        </Link>
        <Link to="/patient/appointment" className="nav-link">
          <i className="bi bi-calendar-plus me-1"></i>
          <span  >Book</span>
        </Link>
        <Link to="/patient/appointments" className="nav-link">
          <i className="bi bi-calendar3 me-1"></i>
          <span  >Appointments</span>
        </Link>
        <Link to="/patient/profile" className="nav-link">
          <i className="bi bi-person me-1"></i>
          <span  >Profile</span>
        </Link>
        {user && <NotificationBell />}
        {user && (
          <button
            onClick={handleLogout}
            className="btn btn-outline-danger btn-sm ms-lg-3 mt-2 mt-lg-0"
          >
            <i className="bi bi-box-arrow-right me-1"></i>
            <span  >Logout</span>
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
