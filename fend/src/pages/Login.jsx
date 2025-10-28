import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api/api";
import LoadingSpinner from "../components/LoadingSpinner";
import AuthLayout from "../layouts/AuthLayout";
import { getFingerprint } from "../utils/getFingerprint";
import { useAuth } from "../hooks/useAuth";
import toast, { Toaster } from "react-hot-toast";
// EmailVerificationModal removed - using Laravel's built-in email verification
import "./Logs.css"; // ✅ Your custom CSS
import logo from "./logo.png";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  // Email verification modal removed - using Laravel's built-in system

  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  
  // Get redirect info from navigation state
  const redirectMessage = location.state?.message || "";
  const redirectTo = location.state?.redirectTo || null;
  const preselectedService = location.state?.preselectedService || null;

  useEffect(() => {
    // Show redirect message if user was redirected from booking
    if (redirectMessage) {
      setMessage(redirectMessage);
    }
  }, [redirectMessage]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.get("/sanctum/csrf-cookie");

      const fingerprint = await getFingerprint();
      const res = await api.post("/api/login", { email, password, device_id: fingerprint });

      const user = res.data.user || res.data;
      
      // Check if password change is required for dentist
      if (res.data.requires_password_change) {
        setMessage("Login successful. Please change your password.");
        setUser(user);
        setShowDentistPwModal(true); // show modal inline
        setLoading(false);
        return;
      }
      
      setMessage("Login successful!");
      
      // Update authentication context
      setUser(user);

      setTimeout(() => {
        if (user.role === "admin") navigate("/admin");
        else if (user.role === "staff") navigate("/staff");
        else if (user.role === "patient") {
          // If user was redirected from booking, go to appointment page
          if (redirectTo === "/patient/appointment") {
            navigate("/patient/appointment", { 
              state: { preselectedService } 
            });
          } else {
            navigate("/patient");
          }
        }
        else if (user.role === "dentist") {
          navigate("/dentist");
        }
        else setMessage("Login successful, but no dashboard yet for this role.");
      }, 150);
    } catch (err) {
      console.error(err);
      
      // Email verification no longer required for dentists
      
      // Get error message from different possible locations in Laravel response
      const errorMessage = 
        err.response?.data?.errors?.email?.[0] || 
        err.response?.data?.message || 
        "Login failed";
      
      // Show error in red toast notification
      toast.error(errorMessage, {
        style: {
          background: '#dc3545',
          color: '#fff',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#dc3545',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // state
  const [showDentistPwModal, setShowDentistPwModal] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwErr, setPwErr] = useState("");

  // submit handler for modal
  const submitDentistPassword = async () => {
    setPwErr("");
    if (!pw1 || pw1.length < 8) {
      setPwErr("Password must be at least 8 characters.");
      return;
    }
    if (pw1 !== pw2) {
      setPwErr("Passwords do not match.");
      return;
    }
    try {
      await api.post("/api/dentist/change-password", { password: pw1 });
      setShowDentistPwModal(false);
      setMessage("Password changed successfully!");
      navigate("/dentist");
    } catch (err) {
      setPwErr(err.response?.data?.message || "Failed to change password");
    }
  };

  return (
    <AuthLayout>
      <Toaster position="top-center" />
       <div className="auth-layout">
      {loading && <LoadingSpinner message="Logging in..." />}

      <div className="login-container">
        {/* Left Side */}
        <div className="login-left">
          <div className="brand-block">
            <img src={logo} alt="Kreative Dental Logo" className="site-logo" />
            <div className="brand-text">
              <h2 className="clinic-name m-0">Kreative Dental & Orthodontics</h2>
              <span className="tagline">Your smile, thoughtfully crafted.</span>
            </div>
          </div>

          <h1 className="welcome-title">Hello, welcome!</h1>
          <p className="login-description">
            Please log in to access your appointments, treatment history, and personalized dental care. <br />
            Your oral health is just a click away!
          </p>
          
          {redirectMessage && (
            <div className="alert alert-info mb-4">
              <i className="bi bi-info-circle me-2"></i>
              {redirectMessage}
            </div>
          )}

          <div className="left-highlights">
            <div className="highlight">
              <span className="emoji"></span>
              <span>Comprehensive dental services</span>
            </div>
            <div className="highlight">
              <span className="emoji"></span>
              <span>Easy online appointment booking</span>
            </div>
            <div className="highlight">
              <span className="emoji"></span>
              <span>Secure and private records</span>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="login-right">
          <form className="login-form card-glass" onSubmit={handleLogin}>
            <div className="form-head">
              <h3 className="m-0">Sign in</h3>
          
            </div>

            <div className="form-group">
              <label>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@gmail.com"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
               
              />
            </div>

            <div className="form-options">
              <label className="form-check">
                <input type="checkbox" className="form-check-input me-2" /> Remember me
              </label>
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="btn-primary-lg w-100">Login</button>

            <div className="btn-row">
              <button
                type="button"
                className="btn-secondary-lg"
                onClick={() => navigate("/register")}
              >
                Create account
              </button>

              {/* ✅ New: Homepage button */}
              <button
                type="button"
                className="btn-outline-lg"
                onClick={() => navigate("/")}
              >
                Go to Homepage
              </button>
            </div>

            {message && !message.toLowerCase().includes("credentials") && !message.toLowerCase().includes("failed") && (
              <p className="login-message">{message}</p>
            )}
          </form>
        </div>
      </div>
      </div>
      
      {/* First login password change modal - no escape */}
      {showDentistPwModal && (
        <div style={{ 
          position: "fixed", 
          inset: 0, 
          background: "rgba(0,0,0,0.7)", 
          zIndex: 1050,
          backdropFilter: "blur(2px)"
        }}>
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
                {pwErr && (
                  <div className="alert alert-danger mb-3">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {pwErr}
                  </div>
                )}
                <div className="d-grid">
                  <button 
                    className="btn btn-primary btn-lg" 
                    onClick={submitDentistPassword}
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
      )}
    </AuthLayout>
  );
}

export default Login;
