import React from "react";

const AdminDashboard = () => {
  return (
    <div className="min-vh-100 vw-100 d-flex flex-column m-0 p-0 bg-light">
      {/* Header */}
      <header className="bg-dark shadow-sm w-100 m-0 p-0">
        <div className="d-flex align-items-center justify-content-center p-3">
          <i className="bi bi-house-door me-2 fs-2 text-white"></i>
          <h2 className="mb-0 fs-3 fw-bold text-white text-center text-md-start">
            Welcome, Admin!
          </h2>
        </div>
      </header>

      {/* Body */}
      <main className="flex-grow-1 d-flex align-items-center justify-content-center text-center m-0 p-0">
        <div className="px-3">
          <p className="lead mb-0">
            🚧 This is your admin dashboard. (Under construction)
          </p>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
