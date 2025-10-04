import React from "react";

const AdminDashboard = () => {
  return (
    <div 
      className="admin-dashboard-page"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        minHeight: '100vh',
        width: '100%',
        padding: '1.5rem',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <div className="container-fluid" style={{ width: '100%', maxWidth: 'none', padding: 0 }}>
        <div className="row" style={{ margin: 0, width: '100%' }}>
          <div className="col-12" style={{ padding: 0 }}>
            {/* Header Section */}
            <div className="text-center mb-5">
              <div className="bg-primary rounded-circle mx-auto mb-4 d-flex align-items-center justify-content-center" 
                   style={{ width: '120px', height: '120px', fontSize: '3rem' }}>
                <i className="bi bi-house-door text-white"></i>
              </div>
              <h1 className="fw-bold mb-3" style={{ color: '#1e293b' }}>
                Welcome, Admin!
              </h1>
              <p className="text-muted fs-5">Your administrative control center</p>
            </div>

            {/* Dashboard Cards */}
            <div className="row g-4 mb-5" style={{ margin: 0, width: '100%' }}>
              <div className="col-12 col-sm-6 col-lg-3" style={{ padding: '0.5rem' }}>
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px', width: '100%' }}>
                  <div className="card-body p-4 text-center">
                    <div className="bg-primary rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" 
                         style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                      <i className="bi bi-people text-white"></i>
                    </div>
                    <h5 className="fw-bold text-primary">Patient Management</h5>
                    <p className="text-muted small">Manage patient records and appointments</p>
                  </div>
                </div>
              </div>
              
              <div className="col-12 col-sm-6 col-lg-3" style={{ padding: '0.5rem' }}>
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px', width: '100%' }}>
                  <div className="card-body p-4 text-center">
                    <div className="bg-success rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" 
                         style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                      <i className="bi bi-calendar-check text-white"></i>
                    </div>
                    <h5 className="fw-bold text-success">Appointments</h5>
                    <p className="text-muted small">Schedule and manage appointments</p>
                  </div>
                </div>
              </div>
              
              <div className="col-12 col-sm-6 col-lg-3" style={{ padding: '0.5rem' }}>
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px', width: '100%' }}>
                  <div className="card-body p-4 text-center">
                    <div className="bg-info rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" 
                         style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                      <i className="bi bi-bar-chart text-white"></i>
                    </div>
                    <h5 className="fw-bold text-info">Analytics</h5>
                    <p className="text-muted small">View reports and analytics</p>
                  </div>
                </div>
              </div>
              
              <div className="col-12 col-sm-6 col-lg-3" style={{ padding: '0.5rem' }}>
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px', width: '100%' }}>
                  <div className="card-body p-4 text-center">
                    <div className="bg-warning rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" 
                         style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                      <i className="bi bi-gear text-white"></i>
                    </div>
                    <h5 className="fw-bold text-warning">Settings</h5>
                    <p className="text-muted small">Configure system settings</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Card */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '16px', width: '100%' }}>
              <div className="card-header bg-primary text-white border-0" style={{ borderRadius: '16px 16px 0 0' }}>
                <h5 className="mb-0 fw-semibold">
                  <i className="bi bi-info-circle me-2"></i>
                  Dashboard Status
                </h5>
              </div>
              <div className="card-body p-5 text-center">
                <div className="bg-light rounded-circle mx-auto mb-4 d-flex align-items-center justify-content-center" 
                     style={{ width: '100px', height: '100px', fontSize: '2.5rem' }}>
                  🚧
                </div>
                <h4 className="fw-bold mb-3" style={{ color: '#1e293b' }}>
                  Dashboard Under Construction
                </h4>
                <p className="text-muted fs-5 mb-4">
                  We're working hard to bring you a comprehensive admin dashboard with all the features you need.
                </p>
                <div className="row g-3 justify-content-center" style={{ margin: 0, width: '100%' }}>
                  <div className="col-12 col-sm-6 col-md-4" style={{ padding: '0.5rem' }}>
                    <div className="d-flex align-items-center p-3 bg-light rounded" style={{ borderRadius: '12px', width: '100%' }}>
                      <div className="bg-success rounded-circle me-3 d-flex align-items-center justify-content-center" 
                           style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                        <i className="bi bi-check text-white"></i>
                      </div>
                      <div>
                        <div className="fw-semibold text-dark">User Management</div>
                        <small className="text-muted">Available</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-sm-6 col-md-4" style={{ padding: '0.5rem' }}>
                    <div className="d-flex align-items-center p-3 bg-light rounded" style={{ borderRadius: '12px', width: '100%' }}>
                      <div className="bg-success rounded-circle me-3 d-flex align-items-center justify-content-center" 
                           style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                        <i className="bi bi-check text-white"></i>
                      </div>
                      <div>
                        <div className="fw-semibold text-dark">System Logs</div>
                        <small className="text-muted">Available</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-sm-6 col-md-4" style={{ padding: '0.5rem' }}>
                    <div className="d-flex align-items-center p-3 bg-light rounded" style={{ borderRadius: '12px', width: '100%' }}>
                      <div className="bg-warning rounded-circle me-3 d-flex align-items-center justify-content-center" 
                           style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                        <i className="bi bi-clock text-white"></i>
                      </div>
                      <div>
                        <div className="fw-semibold text-dark">Analytics</div>
                        <small className="text-muted">Coming Soon</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
