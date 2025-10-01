import { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../hooks/useAuth";
import "./AdminLayout.css";
import NotificationsBell from "../components/NotificationBell";

function AdminLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 992);

  // Keep sidebar open by default on lg+, closed on md-
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 992) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/app");
  };

  return (
    <div className={`admin-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      {/* Sidebar */}
      <aside className="sidebar bg-dark text-white">
        <div className="sidebar-header d-flex align-items-center justify-content-between">
          <h5 className="m-0 fw-bold text-center">Admin Panel</h5>
          <div className="d-flex align-items-center gap-2">
            {/* Close button (mobile) */}
            <button
              className="btn btn-sm btn-outline-light d-lg-none"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
        </div>

        <ul className="nav flex-column nav-scroller">
 


          <li className="nav-item">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                "nav-link" + (isActive ? " active" : "")
              }
            >
              <span className="icon">🏠</span>
              <span className="label">Dashboard</span>
            </NavLink>
          </li>

          <li className="nav-item mt-2 small text-uppercase text-secondary ps-3">Devices</li>
          <li className="nav-item">
            <NavLink to="/admin/device-approvals" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              <span className="icon">🔑</span>
              <span className="label">Device Approvals</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/admin/approved-devices" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              <span className="icon">✅</span>
              <span className="label">Approved Devices</span>
            </NavLink>
          </li>

          <li className="nav-item mt-2 small text-uppercase text-secondary ps-3">People</li>
          <li className="nav-item">
            <NavLink to="/admin/staff-register" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              <span className="icon">👥</span>
              <span className="label">Create Staff Account</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/admin/dentists" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              <span className="icon">🧑</span>
              <span className="label">Dentists</span>
            </NavLink>
          </li>

          <li className="nav-item mt-2 small text-uppercase text-secondary ps-3">Appointments</li>
          <li className="nav-item">
            <NavLink to="/admin/schedule" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              <span className="icon">📆</span>
              <span className="label">Clinic Schedule</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/admin/appointments" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              <span className="icon">📅</span>
              <span className="label">Appointments</span>
            </NavLink>
          </li>

          <li className="nav-item mt-2 small text-uppercase text-secondary ps-3">Services</li>
          <li className="nav-item">
            <NavLink to="/admin/services" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              <span className="icon">🦷</span>
              <span className="label">Manage Services</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/admin/service-discounts" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              <span className="icon">💸</span>
              <span className="label">Service Promos</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/admin/promo-archive" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              <span className="icon">📁</span>
              <span className="label">Promo Archive</span>
            </NavLink>
          </li>

          <li className="nav-item mt-2 small text-uppercase text-secondary ps-3">Ops</li>
          <li className="nav-item">
            <NavLink to="/admin/inventory" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              <span className="icon">📦</span>
              <span className="label">Inventory</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/admin/goals" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              <span className="icon">🎯</span>
              <span className="label">Goals</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/admin/monthly-report" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              <span className="icon">📈</span>
              <span className="label">Monthly Visits</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/admin/analytics" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              <span className="icon">📉</span>
              <span className="label">Analytics</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/admin/system-logs" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              <span className="icon">📊</span>
              <span className="label">System Logs</span>
            </NavLink>
          </li>

          <li className="nav-item mt-2 small text-uppercase text-secondary ps-3">Account</li>
          <li className="nav-item">
            <NavLink to="/admin/profile" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
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
    {/* Bootstrap Icon */}
    <i className="bi-box-arrow-right fs-5"></i>
    {/* If you don’t use Bootstrap Icons, use the emoji instead:
      <span role="img" aria-label="Logout" className="fs-5">🚪</span>
    */}
    <span className="visually-hidden">Logout</span>
  </button>
</li>

        </ul>
      </aside>

      {/* Main area */}
      <div className="content-area">
{/* Topbar */}
<div className="topbar d-flex align-items-center pe-0">
  <button
    className="btn btn-dark toggle-btn me-2"
    onClick={() => setSidebarOpen((v) => !v)}
    aria-label="Toggle sidebar"
  >
    <i className="bi bi-list"></i>
  </button>

  {/* push bell to the right without spacer */}
  <div className="notifications-bell me-0">
    <NotificationsBell />
  </div>
</div>


        {/* Routed content */}
        <main className="flex-grow-1">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      <div
        // className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`}
        // onClick={() => setSidebarOpen(false)}
      />
    </div>
  );
}

export default AdminLayout;
