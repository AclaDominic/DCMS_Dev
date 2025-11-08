import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import PatientNavbar from "../components/PatientNavbar";
import { usePolicyConsent } from "../context/PolicyConsentContext";
import "./PatientLayout.css";
import PatientEmailVerificationModal from "../components/PatientEmailVerificationModal";
import { Toaster } from "react-hot-toast";

function PatientLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    loading: consentLoading,
    accepting: policyAccepting,
    error: consentError,
    policy,
    shouldShowModal,
    accept,
    dismissModal,
  } = usePolicyConsent();
  
  // Role protection - only allow patient users
  useEffect(() => {
    if (user && user.role !== 'patient') {
      // Redirect non-patient users to their appropriate dashboard
      const redirectPath = user.role === 'admin' ? '/admin' : 
                          user.role === 'staff' ? '/staff' : 
                          user.role === 'dentist' ? '/dentist' : '/';
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate]);
  
  // Check if current route is the homepage
  const isHomepage = location.pathname === "/patient" || location.pathname === "/patient/";
  
  const requiresVerification =
    user && user.role === "patient" && !user.email_verified_at;

  return (
    <div className="d-flex flex-column min-vh-100 bg-light patient-layout">
      <Toaster position="top-center" />
      <PatientNavbar />
      
      {isHomepage ? (
        // Full-width layout for homepage
        <main className="flex-grow-1">
          <Outlet />
        </main>
      ) : (
        // Full-width responsive layout for all other pages
        <main className="flex-grow-1 py-4">
          <div className="container-fluid px-2 px-md-3 px-lg-4">
            <Outlet />
          </div>
        </main>
      )}

      {shouldShowModal && (
        <div
          className="modal show fade"
          style={{ display: "block", backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <i className="bi bi-shield-lock"></i>
                  Updated Terms & Privacy Policy
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={dismissModal}
                  disabled={policyAccepting}
                ></button>
              </div>
              <div className="modal-body">
                {consentError && (
                  <div className="alert alert-danger" role="alert">
                    {consentError}
                  </div>
                )}

                {consentLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-muted mb-3">
                      We’ve updated our Terms & Conditions and Privacy Policy. Please review the latest version and click <strong>Accept & Agree</strong> to continue booking new appointments.
                    </p>

                    {policy?.effective_date && (
                      <p className="small text-muted">
                        <strong>Effective Date:</strong>{" "}
                        {new Date(policy.effective_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    )}

                    <div className="mb-4">
                      <h6 className="fw-bold mb-2 d-flex align-items-center gap-2">
                        <i className="bi bi-shield-check text-primary"></i>
                        Privacy Policy
                      </h6>
                      <div
                        className="border rounded p-3 bg-light"
                        style={{ maxHeight: "220px", overflowY: "auto", whiteSpace: "pre-wrap" }}
                      >
                        {policy?.privacy_policy || "No privacy policy content available."}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h6 className="fw-bold mb-2 d-flex align-items-center gap-2">
                        <i className="bi bi-file-earmark-text text-primary"></i>
                        Terms and Conditions
                      </h6>
                      <div
                        className="border rounded p-3 bg-light"
                        style={{ maxHeight: "220px", overflowY: "auto", whiteSpace: "pre-wrap" }}
                      >
                        {policy?.terms_conditions || "No terms and conditions content available."}
                      </div>
                    </div>

                    <div className="alert alert-info">
                      <strong>Need help?</strong> If you have any questions, you can reach us at{" "}
                      <a href={`mailto:${policy?.contact_email || "kreativedent@gmail.com"}`}>
                        {policy?.contact_email || "kreativedent@gmail.com"}
                      </a>{" "}
                      or call{" "}
                      <a href={`tel:${policy?.contact_phone || "09277592845"}`}>
                        {policy?.contact_phone || "0927 759 2845"}
                      </a>.
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={dismissModal}
                  disabled={policyAccepting}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={accept}
                  disabled={policyAccepting || consentLoading}
                >
                  {policyAccepting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle me-2"></i>
                      Accept & Agree
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {shouldShowModal && <div className="modal-backdrop fade show"></div>}
      <PatientEmailVerificationModal show={requiresVerification} />
    </div>
  );
}

export default PatientLayout;