import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

const AdminProfile = () => {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/api/user");
        setUser(res.data);
      } catch (err) {
        console.error("Failed to fetch user info", err);
      }
    };
    fetchUser();
  }, []);

  const handleResetRequest = async () => {
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/api/send-password-reset");
      setMessage(res.data.message || "Password reset link sent to your email!");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send reset link";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };


  if (!user) return <p>Loading...</p>;

  return (
    <div 
      className="admin-profile-page"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        minHeight: '100vh',
        width: '100vw',
        position: 'relative',
        left: 0,
        right: 0,
        padding: '1.5rem 2rem',
        boxSizing: 'border-box'
      }}
    >
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6 col-xl-5">
            {/* Header Section */}
            <div className="text-center mb-4">
              <h2 className="fw-bold mb-2" style={{ color: '#1e293b' }}>
                👤 Admin Account
              </h2>
              <p className="text-muted">Manage your account settings and security</p>
            </div>

            {/* Profile Card */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
              <div className="card-header border-0" style={{ 
                borderRadius: '16px 16px 0 0',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                color: '#1e293b'
              }}>
                <h5 className="mb-0 fw-semibold">
                  <i className="bi bi-person-circle me-2"></i>
                  Profile Information
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-12">
                    <div className="d-flex align-items-center p-3 bg-light rounded" style={{ borderRadius: '12px' }}>
                      <div className="rounded-circle me-3 d-flex align-items-center justify-content-center" 
                           style={{ 
                             width: '50px', 
                             height: '50px', 
                             fontSize: '1.5rem',
                             background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                             border: '2px solid #e2e8f0'
                           }}>
                        <i className="bi bi-person" style={{ color: '#1e293b' }}></i>
                      </div>
                      <div>
                        <div className="text-muted small fw-semibold">Full Name</div>
                        <div className="fw-bold text-dark">{user.name}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="d-flex align-items-center p-3 bg-light rounded" style={{ borderRadius: '12px' }}>
                      <div className="bg-info rounded-circle me-3 d-flex align-items-center justify-content-center" 
                           style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                        <i className="bi bi-envelope text-white"></i>
                      </div>
                      <div>
                        <div className="text-muted small fw-semibold">Email Address</div>
                        <div className="fw-bold text-dark">{user.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="d-flex align-items-center p-3 bg-light rounded" style={{ borderRadius: '12px' }}>
                      <div className="bg-success rounded-circle me-3 d-flex align-items-center justify-content-center" 
                           style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                        <i className="bi bi-shield-check text-white"></i>
                      </div>
                      <div>
                        <div className="text-muted small fw-semibold">Role</div>
                        <div className="fw-bold text-dark">
                          <span className="badge bg-success">{user.role}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            {message && (
              <div className="alert alert-success border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }} role="alert">
                <i className="bi bi-check-circle me-2"></i>
                {message}
              </div>
            )}

            {error && (
              <div className="alert alert-danger border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }} role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            {/* Password Reset Card */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
              <div className="card-header bg-warning text-dark border-0" style={{ borderRadius: '16px 16px 0 0' }}>
                <h5 className="mb-0 fw-semibold">
                  <i className="bi bi-key me-2"></i>
                  Security Settings
                </h5>
              </div>
              <div className="card-body p-4">
                <p className="text-muted mb-4">
                  Need to change your password? We'll send you a secure reset link to your email address.
                </p>
                <button
                  className="btn border-0 shadow-sm w-100"
                  onClick={handleResetRequest}
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-envelope me-2"></i>
                      Send Password Reset Link
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
