import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

const DentistProfile = () => {
  const [user, setUser] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchUser = async () => {
    try {
      const res = await api.get("/api/user");
      setUser(res.data);
      console.log(res.data);
    } catch (err) {
      console.error("Failed to fetch user info", err);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handlePasswordChange = async () => {
    setMessage("");
    setErrors({});
    setLoading(true);

    // Validation
    if (!newPassword) {
      setErrors({ newPassword: "New password is required" });
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setErrors({ newPassword: "Password must be at least 8 characters" });
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      setLoading(false);
      return;
    }

    try {
      const res = await api.post("/api/dentist/change-password", {
        password: newPassword,
      });

      setMessage("✅ Password changed successfully!");
      setShowPasswordForm(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setMessage("❌ " + (err.response?.data?.message || "Failed to change password"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async () => {
    setMessage("");
    setErrors({});
    setLoading(true);

    try {
      const res = await api.post("/api/send-password-reset");
      setMessage(res.data.message || "Password reset link sent to your email!");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send reset link";
      setMessage("❌ " + msg);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <p>Loading your profile...</p>;

  const role = user.role; // 'admin' | 'staff' | 'patient' | 'dentist'

  return (
    <div className="w-100">
      <div className="container-fluid px-4 py-4">
        <div className="card border-0 shadow-lg w-100 dentist-page-card">
          <div className="card-header bg-gradient bg-primary text-white text-center py-4">
            <h2 className="h3 mb-2">
              <i className="bi bi-person-circle me-2"></i>
              My Account
            </h2>
            <p className="mb-0 opacity-75">Manage your personal information and account settings</p>
          </div>
          <div className="card-body p-5">
          {/* Personal Information Section */}
          <div className="row mb-5">
            <div className="col-12">
              <h4 className="h5 mb-3 text-primary">
                <i className="bi bi-person me-2"></i>
                Personal Information
              </h4>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label fw-semibold">Full Name</label>
                <div className="form-control-plaintext bg-light p-3 rounded">
                  {user.name || "Not provided"}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label fw-semibold">Email Address</label>
                <div className="form-control-plaintext bg-light p-3 rounded">
                  {user.email || "Not provided"}
                  {user.email_verified_at && (
                    <span className="badge bg-success ms-2">
                      <i className="bi bi-check-circle me-1"></i>
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label fw-semibold">Role</label>
                <div className="form-control-plaintext bg-light p-3 rounded">
                  <span className="badge bg-primary text-capitalize">
                    {role}
                  </span>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label fw-semibold">Contact Number</label>
                <div className="form-control-plaintext bg-light p-3 rounded">
                  {user.contact_number || "Not provided"}
                </div>
              </div>
            </div>
          </div>

          {/* Account Security Section */}
          <div className="row mb-5">
            <div className="col-12">
              <h4 className="h5 mb-3 text-primary">
                <i className="bi bi-shield-lock me-2"></i>
                Account Security
              </h4>
            </div>
            <div className="col-12">
              <div className="card border-0 bg-light">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1">Password</h6>
                      <p className="text-muted mb-0">Last updated: Recently</p>
                    </div>
                    <div>
                      <button
                        className="btn btn-outline-primary me-2"
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                      >
                        <i className="bi bi-key me-1"></i>
                        Change Password
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        onClick={handleResetRequest}
                        disabled={loading}
                      >
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Reset Password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Password Change Form */}
          {showPasswordForm && (
            <div className="row mb-5">
              <div className="col-12">
                <div className="card border-warning">
                  <div className="card-header bg-warning text-dark">
                    <h5 className="mb-0">
                      <i className="bi bi-key me-2"></i>
                      Change Password
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">New Password</label>
                          <input
                            type="password"
                            className={`form-control ${errors.newPassword ? "is-invalid" : ""}`}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                          />
                          {errors.newPassword && (
                            <div className="invalid-feedback">{errors.newPassword}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Confirm New Password</label>
                          <input
                            type="password"
                            className={`form-control ${errors.confirmPassword ? "is-invalid" : ""}`}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                          />
                          {errors.confirmPassword && (
                            <div className="invalid-feedback">{errors.confirmPassword}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-primary"
                            onClick={handlePasswordChange}
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Changing...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-check-circle me-1"></i>
                                Change Password
                              </>
                            )}
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setShowPasswordForm(false);
                              setNewPassword("");
                              setConfirmPassword("");
                              setErrors({});
                            }}
                          >
                            <i className="bi bi-x-circle me-1"></i>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div className="row mb-4">
              <div className="col-12">
                <div className={`alert ${message.includes("✅") ? "alert-success" : "alert-danger"} alert-dismissible fade show`}>
                  {message}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setMessage("")}
                  ></button>
                </div>
              </div>
            </div>
          )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default DentistProfile;
