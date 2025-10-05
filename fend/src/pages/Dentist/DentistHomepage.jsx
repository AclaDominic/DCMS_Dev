import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function DentistHomepage() {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="container-fluid py-4">
      {/* Welcome Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm" style={{background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)', color: 'white'}}>
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h1 className="h3 mb-2">
                    {getGreeting()}, Dr. {user?.name?.split(' ')[0] || 'Dentist'}! 👋
                  </h1>
                  <p className="mb-0 opacity-75">
                    Welcome to your dental practice dashboard. Manage patient visits, 
                    view your schedule, and stay updated with your clinic operations.
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="d-flex flex-column align-items-md-end">
                    <div className="mb-2">
                      <i className="bi bi-calendar-check fs-1 opacity-50"></i>
                    </div>
                    <small className="opacity-75">
                      Last login: {new Date().toLocaleDateString()}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mb-4">
        <div className="col-12">
          <h2 className="h4 mb-3">Quick Actions</h2>
        </div>
        <div className="col-md-4 mb-3">
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
                  <div className="btn" style={{background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)', color: 'white', border: 'none'}}>
                    <i className="bi bi-qr-code me-2"></i>
                    Visit Codes
                  </div>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-4 mb-3">
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
                  <div className="btn" style={{background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)', color: 'white', border: 'none'}}>
                    <i className="bi bi-calendar-check me-2"></i>
                    View Schedule
                  </div>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-4 mb-3">
          <Link to="/dentist/profile" className="text-decoration-none">
            <div className="card h-100 border-0 shadow-sm hover-lift">
              <div className="card-body text-center p-4">
                <div className="mb-3">
                  <i className="bi bi-person-circle fs-1 text-info"></i>
                </div>
                <h5 className="card-title text-dark">My Profile</h5>
                <p className="card-text text-muted">
                  Update your personal information and preferences
                </p>
                  <div className="btn" style={{background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)', color: 'white', border: 'none'}}>
                    <i className="bi bi-gear me-2"></i>
                    Manage
                  </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Practice Tips Section */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-light">
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h4 className="h5 mb-2">
                    <i className="bi bi-lightbulb text-warning me-2"></i>
                    Practice Management Tip
                  </h4>
                  <p className="mb-0 text-muted">
                    Keep your schedule updated and maintain clear communication with patients. 
                    Regular follow-ups and efficient visit processing enhance patient satisfaction!
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <i className="bi bi-tooth fs-1 opacity-25" style={{color: '#00b4d8'}}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hover-lift {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
    </div>
  );
}

export default DentistHomepage;
