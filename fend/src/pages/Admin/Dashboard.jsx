import React from "react";

const AdminDashboard = () => {
  return (
    <div className="min-vh-100 vw-100 d-flex flex-column bg-light m-0 p-0">
      {/* Header */}
      <div className="bg-dark p-3 shadow-sm d-flex align-items-center justify-content-center">
        <i className="bi bi-house-door me-2 fs-3 text-white"></i>
        <h2 className="mb-0 fs-2 fw-bold text-white">
          Welcome, Admin!
        </h2>
      </div>

      {/* Body */}
      <div className="flex-grow-1 d-flex justify-content-center align-items-center">
          <p className="lead mb-0">
            🚧 This is your admin dashboard. (Under construction)
          </p>
        </div>
      </div>
   
  );
};

export default AdminDashboard;
