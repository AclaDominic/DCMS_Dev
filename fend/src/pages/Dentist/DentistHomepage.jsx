import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function DentistHomepage() {
  const { user } = useAuth();

  return (
    <div className="dentist-homepage">
      {/* Welcome Section */}
      <div className="container py-4">
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h3 mb-0">🦷 Dentist Dashboard</h2>
              <div className="text-muted">
                Welcome, Dr. {user?.name || 'Dentist'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="row mb-4">
          <div className="col-12">
            <h2 className="h4 mb-3">Quick Actions</h2>
          </div>
          <div className="col-md-6 mb-3">
            <Link to="/dentist/dashboard" className="text-decoration-none">
              <div className="card h-100 border-0 shadow-sm hover-lift">
                <div className="card-body text-center p-4">
                  <div className="mb-3">
                    <i className="bi bi-key fs-1 text-primary"></i>
                  </div>
                  <h5 className="card-title text-dark">Process Visit</h5>
                  <p className="card-text text-muted">
                    Enter visit codes to start patient consultations
                  </p>
                  <div className="btn btn-primary">
                    <i className="bi bi-qr-code me-2"></i>
                    Visit Codes
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col-md-6 mb-3">
            <Link to="/dentist/schedule" className="text-decoration-none">
              <div className="card h-100 border-0 shadow-sm hover-lift">
                <div className="card-body text-center p-4">
                  <div className="mb-3">
                    <i className="bi bi-calendar3 fs-1 text-success"></i>
                  </div>
                  <h5 className="card-title text-dark">View Schedule</h5>
                  <p className="card-text text-muted">
                    View your clinic schedule and working hours
                  </p>
                  <div className="btn btn-success">
                    <i className="bi bi-calendar-check me-2"></i>
                    View Schedule
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export default DentistHomepage;
