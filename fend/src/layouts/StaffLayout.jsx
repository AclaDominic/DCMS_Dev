import { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../hooks/useAuth";
import NotificationsBell from "../components/NotificationBell";
import { getFingerprint } from "../utils/getFingerprint";
import "./StaffLayout.css";

function StaffLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [allowInventory, setAllowInventory] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [deviceLoaded, setDeviceLoaded] = useState(false);

  // Sidebar open/closed (same behavior as Admin)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 992);
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 992) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Inventory settings
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/api/inventory/settings");
        if (mounted) setAllowInventory(!!data?.staff_can_receive);
      } catch {
        /* ignore */
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Device approval status
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const fingerprint = await getFingerprint();
        api.defaults.headers.common["X-Device-Fingerprint"] = fingerprint;
        const res = await api.get("/api/device-status", {
          headers: { "X-Device-Fingerprint": fingerprint },
        });
        if (mounted) setDeviceStatus(res.data);
      } catch (err) {
        console.error("Device check failed", err);
        if (mounted) setDeviceStatus({ approved: false });
      } finally {
        if (mounted) setDeviceLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/app");
  };

  const linkState = (isActive) =>
    "nav-link" + (isActive ? " active" : "");

  const maybeDisable = () => deviceLoaded && deviceStatus && !deviceStatus.approved;

  return (
    <div className={`staff-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      {/* Sidebar */}
      <aside className="sidebar bg-dark text-white">
        <div className="sidebar-header d-flex align-items-center justify-content-between">
          <h6 className="m-0 fw-bold">Staff Menu</h6>
          {/* Close (mobile) */}
          <button
            className="btn btn-sm btn-outline-light d-lg-none"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <ul className="nav flex-column nav-scroller">
          <li className="nav-item">
            <NavLink to="/staff" end className={({ isActive }) => linkState(isActive)}>
              <span className="icon">🏠</span>
              <span className="label">Dashboard</span>
            </NavLink>
          </li>

          <li className="nav-item mt-2 small text-uppercase text-secondary ps-3">Appointments</li>

          <li className="nav-item">
            <NavLink
              to="/staff/appointments"
              className={({ isActive }) =>
                linkState(isActive) + (maybeDisable() ? " disabled text-muted" : "")
              }
              onClick={(e) => { if (maybeDisable()) e.preventDefault(); }}
              style={{ cursor: maybeDisable() ? "not-allowed" : "pointer", opacity: maybeDisable() ? 0.5 : 1 }}
            >
              <span className="icon">📅</span>
              <span className="label">Appointments</span>
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink
              to="/staff/appointment-reminders"
              className={({ isActive }) =>
                linkState(isActive) + (maybeDisable() ? " disabled text-muted" : "")
              }
              onClick={(e) => { if (maybeDisable()) e.preventDefault(); }}
              style={{ cursor: maybeDisable() ? "not-allowed" : "pointer", opacity: maybeDisable() ? 0.5 : 1 }}
            >
              <span className="icon">🔔</span>
              <span className="label">Reminders</span>
            </NavLink>
          </li>

          {loaded && allowInventory && (
            <>
              <li className="nav-item mt-2 small text-uppercase text-secondary ps-3">Operations</li>
              <li className="nav-item">
                <NavLink
                  to="/staff/inventory"
                  className={({ isActive }) =>
                    linkState(isActive) + (maybeDisable() ? " disabled text-muted" : "")
                  }
                  onClick={(e) => { if (maybeDisable()) e.preventDefault(); }}
                  style={{ cursor: maybeDisable() ? "not-allowed" : "pointer", opacity: maybeDisable() ? 0.5 : 1 }}
                >
                  <span className="icon">📦</span>
                  <span className="label">Inventory</span>
                </NavLink>
              </li>
            </>
          )}

          <li className="nav-item mt-2 small text-uppercase text-secondary ps-3">Account</li>
          <li className="nav-item">
            <NavLink to="/staff/profile" className={({ isActive }) => linkState(isActive)}>
              <span className="icon">👤</span>
              <span className="label">Account</span>
            </NavLink>
          </li>

          <li className="nav-item mt-4 px-3">
            <button
              className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center icon-only-btn"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <i className="bi-box-arrow-right fs-5"></i>
              <span className="visually-hidden">Logout</span>
            </button>
          </li>
        </ul>
      </aside>

      {/* Right side */}
      <div className="content-area">
       {/* Topbar (toggle + bell) */}
<div className="topbar d-flex align-items-center pe-0">
  <button
    className="btn btn-dark toggle-btn me-2"
    onClick={() => setSidebarOpen((v) => !v)}
    aria-label="Toggle sidebar"
  >
    ☰
  </button>
  <div className="flex-grow-1" />
  {/* push to right, no end margin */}
  <div className="ms-auto me-0 topbar-bell">
    <NotificationsBell />
  </div>
</div>


        <main className="flex-grow-1 p-4 overflow-auto">
          <div className="container-fluid h-100">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile overlay (transparent click catcher) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />
    </div>
  );
}

export default StaffLayout;
