import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/api";
import { useAuth } from "../hooks/useAuth";
import NotificationBell from "./NotificationBell";
import logo from "../pages/logo.png";

function DentistNavbar() {
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
          <Link className="navbar-brand d-flex align-items-center" to="/dentist">
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

          {/* Toggle for mobile menu */}
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#dentistNavbarNav"
            aria-controls="dentistNavbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Right: Navigation Items (collapsible) */}
          <div className="collapse navbar-collapse" id="dentistNavbarNav">
            <ul className="navbar-nav ms-auto d-flex align-items-center">
              {/* Home Link */}
              <li className="nav-item">
                <Link
                  className="nav-link"
                  to="/dentist"
                  style={{ fontWeight: "500" }}
                >
                  <i className="bi bi-house-door me-1"></i>
                  Home
                </Link>
              </li>

              {/* Visit Codes Link */}
              <li className="nav-item">
                <Link
                  className="nav-link"
                  to="/dentist/dashboard"
                  style={{ fontWeight: "500" }}
                >
                  <i className="bi bi-key me-1"></i>
                  Visit Codes
                </Link>
              </li>

              {/* Profile Link */}
              <li className="nav-item">
                <Link
                  className="nav-link"
                  to="/dentist/profile"
                  style={{ fontWeight: "500" }}
                >
                  <i className="bi bi-person-circle me-1"></i>
                  Profile
                </Link>
              </li>

              {/* Notifications */}
              <li className="nav-item">
                <div className="notification-bell">
                  <NotificationBell />
                </div>
              </li>

              {/* User Info & Logout */}
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle d-flex align-items-center"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  style={{ fontWeight: "500" }}
                >
                  <i className="bi bi-person-circle me-2"></i>
                  {user?.name || "Dentist"}
                </a>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <Link className="dropdown-item" to="/dentist/profile">
                      <i className="bi bi-person me-2"></i>
                      Profile
                    </Link>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <button
                      className="dropdown-item text-danger"
                      onClick={handleLogout}
                    >
                      <i className="bi bi-box-arrow-right me-2"></i>
                      Logout
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}

export default DentistNavbar;
