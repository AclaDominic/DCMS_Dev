import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api/api";
import LoadingSpinner from "../components/LoadingSpinner";
import AuthLayout from "../layouts/AuthLayout";
import { getFingerprint } from "../utils/getFingerprint";
import { useAuth } from "../hooks/useAuth";
import "./Logs.css"; // ✅ Your custom CSS
import logo from "./logo.png";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
        else setMessage("Login successful, but no dashboard yet for this role.");
      }, 150);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
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

            {message && <p className="login-message">{message}</p>}
          </form>
        </div>
      </div>
      </div>
    </AuthLayout>
  );
}

export default Login;
