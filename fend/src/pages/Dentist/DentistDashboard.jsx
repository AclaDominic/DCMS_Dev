import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";

const DentistDashboard = () => {
  const { user } = useAuth();
  return (
    <div className="w-100">
      <div className="container-fluid px-4 py-4">
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2>🦷 Dentist Dashboard</h2>
              <div className="text-muted">
                Welcome, Dr. {user?.name || 'Dentist'}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="row mb-4">
              <div className="col-md-6 mb-3">
                <Link to="/dentist/visit-manager" className="text-decoration-none">
                  <div className="card h-100 border-0 shadow-sm hover-lift">
                    <div className="card-body text-center p-4">
                      <div className="mb-3">
                        <i className="bi bi-key fs-1 text-primary"></i>
                      </div>
                      <h5 className="card-title text-dark">Visit Manager</h5>
                      <p className="card-text text-muted">
                        Enter visit codes to manage patient consultations, notes, and history
                      </p>
                      <div className="btn btn-primary">
                        <i className="bi bi-key me-2"></i>
                        Start Visit
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
              <div className="col-md-6 mb-3">
                <Link to="/dentist/schedule-view" className="text-decoration-none">
                  <div className="card h-100 border-0 shadow-sm hover-lift">
                    <div className="card-body text-center p-4">
                      <div className="mb-3">
                        <i className="bi bi-calendar-check fs-1 text-info"></i>
                      </div>
                      <h5 className="card-title text-dark">Clinic Schedule</h5>
                      <p className="card-text text-muted">
                        View clinic operating hours and capacity settings
                      </p>
                      <div className="btn btn-info">
                        <i className="bi bi-calendar me-2"></i>
                        View Schedule
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            <div className="alert alert-info">
              <h5>How to use the Visit Manager:</h5>
              <ol>
                <li>Click "Start Visit" to access the Visit Manager</li>
                <li>Enter the 6-character visit code provided by staff</li>
                <li>Switch between "Enter Notes" and "Patient History" tabs</li>
                <li>Enter your notes, findings, treatment plan, and teeth treated</li>
                <li>View complete patient history for better context</li>
                <li>Save your notes - staff can access them during completion</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DentistDashboard;
