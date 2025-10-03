import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";

function DentistHomepage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await api.get("/api/user");
      setUser(res.data);
    } catch (err) {
      console.error("Failed to fetch user info", err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  if (loading) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  return (
    <div className="dentist-homepage">
      {/* Hero Section */}
      <div className="hero-section bg-gradient text-white py-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="display-4 fw-bold mb-3">
                {getGreeting()}, {user?.name || "Doctor"}! 👨‍⚕️
              </h1>
              <p className="lead mb-4">
                Welcome to your dental practice dashboard. Manage your schedule, 
                view patient information, and stay updated with your practice.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Link to="/dentist/profile" className="btn btn-light btn-lg">
                  <i className="bi bi-person-circle me-2"></i>
                  View Profile
                </Link>
                <button className="btn btn-outline-light btn-lg">
                  <i className="bi bi-calendar-check me-2"></i>
                  View Schedule
                </button>
              </div>
            </div>
            <div className="col-lg-4 text-center">
              <div className="hero-icon">
                <i className="bi bi-person-badge display-1 opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="container py-5">
        <div className="row">
          <div className="col-12">
            <h2 className="h3 mb-4 text-center">Quick Actions</h2>
          </div>
        </div>
        
        <div className="row g-4">
          {/* Profile Card */}
          <div className="col-md-6 col-lg-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body text-center">
                <div className="mb-3">
                  <i className="bi bi-person-circle text-primary" style={{ fontSize: "3rem" }}></i>
                </div>
                <h5 className="card-title">My Profile</h5>
                <p className="card-text text-muted">
                  Update your personal information, contact details, and account settings.
                </p>
                <Link to="/dentist/profile" className="btn btn-primary">
                  Manage Profile
                </Link>
              </div>
            </div>
          </div>

          {/* Schedule Card */}
          <div className="col-md-6 col-lg-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body text-center">
                <div className="mb-3">
                  <i className="bi bi-calendar-check text-success" style={{ fontSize: "3rem" }}></i>
                </div>
                <h5 className="card-title">My Schedule</h5>
                <p className="card-text text-muted">
                  View your upcoming appointments and manage your availability.
                </p>
                <button className="btn btn-success" disabled>
                  Coming Soon
                </button>
              </div>
            </div>
          </div>

          {/* Patients Card */}
          <div className="col-md-6 col-lg-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body text-center">
                <div className="mb-3">
                  <i className="bi bi-people text-info" style={{ fontSize: "3rem" }}></i>
                </div>
                <h5 className="card-title">My Patients</h5>
                <p className="card-text text-muted">
                  Access patient records and treatment history.
                </p>
                <button className="btn btn-info" disabled>
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dental Tips Section */}
      <div className="container py-5">
        <div className="row">
          <div className="col-12">
            <h2 className="h3 mb-4 text-center">Dental Practice Tips</h2>
          </div>
        </div>
        
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card border-0 bg-light">
              <div className="card-body">
                <h5 className="card-title text-primary">
                  <i className="bi bi-lightbulb me-2"></i>
                  Patient Communication
                </h5>
                <p className="card-text">
                  Effective communication with patients builds trust and improves treatment outcomes. 
                  Always explain procedures clearly and address patient concerns.
                </p>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card border-0 bg-light">
              <div className="card-body">
                <h5 className="card-title text-success">
                  <i className="bi bi-shield-check me-2"></i>
                  Infection Control
                </h5>
                <p className="card-text">
                  Maintain strict infection control protocols. Regular hand hygiene, 
                  proper sterilization, and PPE usage are essential for patient safety.
                </p>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card border-0 bg-light">
              <div className="card-body">
                <h5 className="card-title text-warning">
                  <i className="bi bi-clock me-2"></i>
                  Time Management
                </h5>
                <p className="card-text">
                  Efficient scheduling and time management help reduce patient wait times 
                  and improve overall practice productivity.
                </p>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card border-0 bg-light">
              <div className="card-body">
                <h5 className="card-title text-info">
                  <i className="bi bi-book me-2"></i>
                  Continuing Education
                </h5>
                <p className="card-text">
                  Stay updated with the latest dental techniques and technologies. 
                  Continuous learning ensures the best care for your patients.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-dark text-white py-4 mt-5">
        <div className="container">
          <div className="row">
            <div className="col-12 text-center">
              <p className="mb-0">
                &copy; 2024 Kreative Dental & Orthodontics. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DentistHomepage;
