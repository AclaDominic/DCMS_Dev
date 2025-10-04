import { useEffect, useState } from "react";
import api from "../api/api";

export default function DentistPasswordGate({ children }) {
  const [loading, setLoading] = useState(true);
  const [requiresChange, setRequiresChange] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/api/dentist/password-status");
        if (!mounted) return;
        // Use the same logic as admin table: if password_changed is false, force change
        const needsChange = !res?.data?.password_changed;
        setRequiresChange(needsChange);
      } catch (e) {
        console.error("DentistPasswordGate - API Error:", e);
        // If unable to check, do not block UI; backend will still protect APIs
        setRequiresChange(false);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const submit = async () => {
    setErr("");
    if (!pw1 || pw1.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (pw1 !== pw2) {
      setErr("Passwords do not match.");
      return;
    }
    try {
      await api.post("/api/dentist/change-password", { password: pw1 });
      setRequiresChange(false);
      setPw1("");
      setPw2("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to change password");
    }
  };

  if (loading) return <div className="p-4">Checking account…</div>;
  if (!requiresChange) return children;

  return (
    <div className="position-relative">
      {/* Full screen overlay - no escape */}
      <div style={{ 
        position: "fixed", 
        inset: 0, 
        background: "rgba(0,0,0,0.7)", 
        zIndex: 1050,
        backdropFilter: "blur(2px)"
      }} />
      <div style={{ 
        position: "fixed", 
        inset: 0, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        zIndex: 1060 
      }}>
        <div className="card shadow-lg border-warning" style={{ width: 450, maxWidth: "90vw" }}>
          <div className="card-header bg-warning text-dark text-center">
            <h4 className="mb-0">
              <i className="bi bi-shield-exclamation me-2"></i>
              Account Security Required
            </h4>
          </div>
          <div className="card-body">
            <div className="alert alert-warning mb-3">
              <i className="bi bi-info-circle me-2"></i>
              <strong>You must change your temporary password to continue.</strong>
              <br />
              <small>This is required for account security and cannot be skipped.</small>
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-semibold">New Password:</label>
              <input 
                type="password" 
                className="form-control" 
                value={pw1} 
                onChange={(e) => setPw1(e.target.value)}
                placeholder="Enter your new password"
                autoFocus
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Confirm Password:</label>
              <input 
                type="password" 
                className="form-control" 
                value={pw2} 
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Confirm your new password"
              />
            </div>
            {err && (
              <div className="alert alert-danger mb-3">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {err}
              </div>
            )}
            <div className="d-grid">
              <button 
                className="btn btn-primary btn-lg" 
                onClick={submit}
                disabled={!pw1 || !pw2}
              >
                <i className="bi bi-shield-check me-2"></i>
                Secure My Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


