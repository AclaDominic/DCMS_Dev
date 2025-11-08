import { useEffect, useState } from "react";
import api from "../api/api";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

function PatientEmailVerificationModal({ show }) {
  const { user, setUser } = useAuth();
  const [emailInput, setEmailInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show) {
      setEmailInput("");
      setError(null);
    }
  }, [show, user?.email]);

  if (!show || !user) return null;

  const currentEmail = user.email || "";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setError(null);

    const trimmedEmail = emailInput.trim();
    const payload = trimmedEmail ? { email: trimmedEmail } : {};

    try {
      await api.get("/sanctum/csrf-cookie");
      const { data } = await api.post("/api/patient/verification/resend", payload);

      toast.success(data.message || "Verification email sent!", {
        style: {
          background: "#0d6efd",
          color: "#fff",
          borderRadius: "8px",
          padding: "14px",
        },
      });

      setUser((prev) =>
        prev
          ? {
              ...prev,
              email: data.email ?? prev.email,
              email_verified_at: null,
            }
          : prev
      );

      if (trimmedEmail) {
        setEmailInput("");
      }
    } catch (err) {
      if (err.response?.status === 422) {
        const emailError = err.response?.data?.errors?.email?.[0];
        setError(emailError || "Please enter a valid email address.");
      } else {
        setError(
          err.response?.data?.message ||
            "We couldn't send the verification email. Please try again."
        );
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div
        className="modal show fade"
        style={{ display: "block", backgroundColor: "rgba(0, 0, 0, 0.65)" }}
        tabIndex="-1"
        aria-modal="true"
        role="dialog"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-warning text-dark">
              <h5 className="modal-title d-flex align-items-center gap-2">
                <i className="bi bi-envelope-check"></i>
                Verify Your Email
              </h5>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                We sent a verification link to your email. Please verify your email address to
                continue booking appointments and accessing your records.
              </p>

              <div className="mb-3">
                <label className="form-label fw-semibold">Current email on file</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-at"></i>
                  </span>
                  <input
                    type="email"
                    className="form-control"
                    value={currentEmail}
                    readOnly
                  />
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="newEmail" className="form-label fw-semibold">
                    Update email (optional)
                  </label>
                  <input
                    id="newEmail"
                    type="email"
                    className={`form-control ${error ? "is-invalid" : ""}`}
                    placeholder="Enter a new email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                  <div className="form-text">
                    Leave blank to resend the link to your current email.
                  </div>
                  {error && <div className="invalid-feedback">{error}</div>}
                </div>

                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary btn-lg" disabled={sending}>
                    {sending ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send me-2"></i>
                        Send Verification Email
                      </>
                    )}
                  </button>
                  <p className="small text-muted text-center mb-0">
                    Need help? Contact us at{" "}
                    <a href="mailto:kreativedent@gmail.com">kreativedent@gmail.com</a>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
}

export default PatientEmailVerificationModal;

