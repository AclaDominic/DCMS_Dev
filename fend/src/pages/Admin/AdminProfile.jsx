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
    <div style={{ maxWidth: "600px" }}>
      <h2 className="mb-4">Admin Account</h2>

      <div className="mb-4 p-3 border rounded bg-light">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
      </div>

      {message && (
        <div className="alert alert-success mb-3">
          {message}
        </div>
      )}

      {error && (
        <div className="alert alert-danger mb-3">
          {error}
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleResetRequest}
        disabled={loading}
      >
        {loading ? "Sending..." : "Send Password Reset Link"}
      </button>
    </div>
  );
};

export default AdminProfile;
