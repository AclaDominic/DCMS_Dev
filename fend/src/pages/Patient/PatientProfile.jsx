import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import HmoCard from "../../components/HmoCard"; // ⬅️ add this import (adjust path if needed)

const PatientProfile = () => {
  const [user, setUser] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactNumber, setContactNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [sex, setSex] = useState("");
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


  const handleLinkSelf = async () => {
    setLoading(true);
    setErrors({});
    try {
      await api.post("/api/patients/link-self", {
        contact_number: contactNumber,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        birthdate: birthdate,
        sex: sex,
      });

      setMessage("✅ Profile linked successfully.");
      await fetchUser(); // 🔁 re-fetch updated user data here
      setShowContactForm(false);
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setMessage("❌ Failed to link profile.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <p>Loading your profile...</p>;

  const isLinked = !!user.patient && user.patient.is_linked;
  const role = user.role; // 'admin' | 'staff' | 'patient'
  const patientId = user.patient?.id; // will exist after linking

  return (
    <div className="w-100">
      <div className="card border-0 shadow-lg w-100 patient-page-card">
            <div className="card-header bg-gradient bg-primary text-white text-center py-4">
              <h2 className="h3 mb-2">
                <i className="bi bi-person-circle me-2"></i>
                My Account
              </h2>
              <p className="mb-0 opacity-75">Manage your personal information and preferences</p>
            </div>
            <div className="card-body p-5">

              {/* Personal Information Section */}
              <div className="mb-5">
                <h4 className="h5 mb-3">
                  <i className="bi bi-person me-2 text-primary"></i>
                  Personal Information
                </h4>
                <div className="card border-0 bg-light shadow-sm">
                  <div className="card-body p-4">
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-person-fill me-3 text-primary fs-5"></i>
                          <div>
                            <small className="text-muted d-block">Full Name</small>
                            <span className="fw-semibold">{user.name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-envelope-fill me-3 text-primary fs-5"></i>
                          <div>
                            <small className="text-muted d-block">Email Address</small>
                            <span className="fw-semibold">{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Reset Section */}
              <div className="mb-5">
                <h4 className="h5 mb-3">
                  <i className="bi bi-shield-lock me-2 text-primary"></i>
                  Account Security
                </h4>
                <div className="card border-0 bg-light shadow-sm">
                  <div className="card-body p-4">
                    <p className="text-muted mb-3">
                      Need to change your password? We'll send a secure reset link to your email address.
                    </p>
                    
                    {message && (
                      <div className="alert alert-success mb-3">
                        {message}
                      </div>
                    )}

                    <button
                      className="btn btn-primary btn-lg"
                      onClick={handleResetRequest}
                      disabled={loading}
                    >
                      <i className="bi bi-envelope me-2"></i>
                      {loading ? "Sending..." : "Send Password Reset Link"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Patient Profile Linking Section */}
              {!isLinked && (
                <div className="mb-5">
                  <h4 className="h5 mb-3">
                    <i className="bi bi-person-plus me-2 text-primary"></i>
                    Link Patient Profile
                  </h4>
                  <div className="card border-warning shadow-sm">
                    <div className="card-header bg-warning-subtle border-warning">
                      <h5 className="h6 mb-1">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Profile Not Linked
                      </h5>
                      <p className="mb-0 text-muted">You're not yet linked to a patient profile.</p>
                    </div>
                    <div className="card-body">
                      <p className="mb-3">Have you visited the clinic before?</p>

                      <div className="mb-4">
                        <div className="alert alert-info border-0 shadow-sm mb-3">
                          <i className="bi bi-check-circle me-2"></i>
                          <strong>Yes</strong> – Please visit the clinic for assistance with linking your profile
                        </div>
                        <button
                          className="btn btn-outline-primary btn-lg w-100"
                          onClick={() => {
                            if (user?.contact_number) setContactNumber(user.contact_number);
                            setShowContactForm(true);
                          }}
                        >
                          <i className="bi bi-x-circle me-2"></i>
                          No – I haven't visited before
                        </button>
                      </div>

                      {showContactForm && (
                        <div className="border-top pt-4">
                          <h6 className="mb-3">
                            <i className="bi bi-person-check me-2"></i>
                            Verify Your Information
                          </h6>
                          <p className="text-muted mb-4">
                            Please confirm your details to create your patient profile. This information will be used for senior discounts and VAT exemptions.
                          </p>
                          
                          <div className="row g-3">
                            <div className="col-12 col-md-4">
                              <label className="form-label fw-semibold">First Name *</label>
                              <input
                                className={`form-control form-control-lg border-2 ${errors.first_name ? 'is-invalid' : ''}`}
                                placeholder="e.g. Juan"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                style={{ fontSize: '1.1rem' }}
                              />
                              {errors.first_name && (
                                <div className="text-danger mt-2">
                                  <i className="bi bi-exclamation-triangle me-1"></i>
                                  {errors.first_name[0]}
                                </div>
                              )}
                            </div>
                            
                            <div className="col-12 col-md-4">
                              <label className="form-label fw-semibold">Middle Name</label>
                              <input
                                className={`form-control form-control-lg border-2 ${errors.middle_name ? 'is-invalid' : ''}`}
                                placeholder="e.g. Santos (optional)"
                                value={middleName}
                                onChange={(e) => setMiddleName(e.target.value)}
                                style={{ fontSize: '1.1rem' }}
                              />
                              {errors.middle_name && (
                                <div className="text-danger mt-2">
                                  <i className="bi bi-exclamation-triangle me-1"></i>
                                  {errors.middle_name[0]}
                                </div>
                              )}
                            </div>
                            
                            <div className="col-12 col-md-4">
                              <label className="form-label fw-semibold">Last Name *</label>
                              <input
                                className={`form-control form-control-lg border-2 ${errors.last_name ? 'is-invalid' : ''}`}
                                placeholder="e.g. Dela Cruz"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                style={{ fontSize: '1.1rem' }}
                              />
                              {errors.last_name && (
                                <div className="text-danger mt-2">
                                  <i className="bi bi-exclamation-triangle me-1"></i>
                                  {errors.last_name[0]}
                                </div>
                              )}
                            </div>
                            
                            <div className="col-12">
                              <label className="form-label fw-semibold">Contact Number *</label>
                              <input
                                className={`form-control form-control-lg border-2 ${errors.contact_number ? 'is-invalid' : ''}`}
                                placeholder="e.g. 09123456789"
                                value={contactNumber}
                                onChange={(e) => setContactNumber(e.target.value)}
                                style={{ fontSize: '1.1rem' }}
                              />
                              {errors.contact_number && (
                                <div className="text-danger mt-2">
                                  <i className="bi bi-exclamation-triangle me-1"></i>
                                  {errors.contact_number[0]}
                                </div>
                              )}
                            </div>
                            
                            <div className="col-12 col-md-6">
                              <label className="form-label fw-semibold">Birthdate *</label>
                              <input
                                type="date"
                                className={`form-control form-control-lg border-2 ${errors.birthdate ? 'is-invalid' : ''}`}
                                value={birthdate}
                                onChange={(e) => setBirthdate(e.target.value)}
                                style={{ fontSize: '1.1rem' }}
                              />
                              {errors.birthdate && (
                                <div className="text-danger mt-2">
                                  <i className="bi bi-exclamation-triangle me-1"></i>
                                  {errors.birthdate[0]}
                                </div>
                              )}
                            </div>
                            
                            <div className="col-12 col-md-6">
                              <label className="form-label fw-semibold">Sex *</label>
                              <select
                                className={`form-control form-control-lg border-2 ${errors.sex ? 'is-invalid' : ''}`}
                                value={sex}
                                onChange={(e) => setSex(e.target.value)}
                                style={{ fontSize: '1.1rem' }}
                              >
                                <option value="">Select your sex</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                              </select>
                              {errors.sex && (
                                <div className="text-danger mt-2">
                                  <i className="bi bi-exclamation-triangle me-1"></i>
                                  {errors.sex[0]}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <button
                              className="btn btn-success btn-lg w-100"
                              onClick={handleLinkSelf}
                              disabled={loading || !firstName || !lastName || !contactNumber || !birthdate || !sex}
                            >
                              {loading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                  Linking Profile...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-link me-2"></i>
                                  Link My Profile
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {message && (
                        <div className={`alert mt-4 border-0 shadow-sm ${message.includes('✅') ? 'alert-success' : 'alert-danger'}`}>
                          <i className={`bi ${message.includes('✅') ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
                          {message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================= HMO SECTION ========================= */}
              {isLinked && patientId && (
                <div className="mb-4">
                  <h4 className="h5 mb-3">
                    <i className="bi bi-hospital me-2 text-primary"></i>
                    Health Maintenance Organization (HMO)
                  </h4>
                  <div className="card border-0 shadow-sm">
                    <div className="card-body p-0">
                      {/* HmoCard uses Tailwind classes internally; it can live inside Bootstrap containers just fine. */}
                      <HmoCard
                        patientId={patientId}
                        currentUserRole={role}                 // 'patient' here
                        currentUserPatientId={patientId}       // so it knows this user is managing self
                        compact={false}
                        onChange={(items) => {
                          // optional: toast or side-effects after CRUD
                          // console.log("HMO updated:", items);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {/* =============================================================== */}
            </div>
          </div>
    </div>
  );
};

export default PatientProfile;
