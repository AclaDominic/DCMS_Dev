import { useState } from "react";
import api from "../../api/api";

const StaffRegister = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });

  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setErrors({});

    try {
      const res = await api.post("/api/admin/staff", form);
      setMessage("✅ Staff account created!");
      setForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
      });
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setMessage("❌ Something went wrong.");
      }
    }
  };

  return (
    <div 
      className="staff-register-page"
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
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="m-0 fw-bold" style={{ color: '#1e293b' }}>
            <i className="bi bi-person-plus me-2"></i>
            Register New Staff Account
          </h2>
          <p className="text-muted mb-0 mt-1">Create new staff member accounts for clinic management</p>
        </div>
      </div>

      {message && (
        <div className="alert alert-info border-0 shadow-sm mb-4" role="alert" style={{ borderRadius: '12px' }}>
          <div className="d-flex align-items-center">
            <span className="me-2">ℹ️</span>
            {message}
          </div>
        </div>
      )}

      <div className="row g-2 g-md-3 g-lg-4">
        <div className="col-12 col-lg-8 col-xl-6">
          <div className="card border-0 shadow-sm" style={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px'
          }}>
            <div className="card-body p-4">
              <h5 className="card-title mb-4 fw-bold" style={{ color: '#1e293b' }}>
                <i className="bi bi-person-plus me-2"></i>
                Staff Account Details
              </h5>
              
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-medium">Full Name</label>
                    <input
                      name="name"
                      className="form-control border-0 shadow-sm"
                      style={{ borderRadius: '8px', padding: '12px 16px' }}
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Jane Dela Cruz"
                      required
                    />
                    {errors.name && <div className="text-danger mt-1 small">{errors.name[0]}</div>}
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-medium">Email Address</label>
                    <input
                      name="email"
                      type="email"
                      className="form-control border-0 shadow-sm"
                      style={{ borderRadius: '8px', padding: '12px 16px' }}
                      value={form.email}
                      onChange={handleChange}
                      placeholder="e.g. jane.staff@clinic.com"
                      required
                    />
                    {errors.email && <div className="text-danger mt-1 small">{errors.email[0]}</div>}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-medium">Password</label>
                    <input
                      name="password"
                      type="password"
                      className="form-control border-0 shadow-sm"
                      style={{ borderRadius: '8px', padding: '12px 16px' }}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter password"
                      required
                    />
                    {errors.password && (
                      <div className="text-danger mt-1 small">{errors.password[0]}</div>
                    )}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-medium">Confirm Password</label>
                    <input
                      name="password_confirmation"
                      type="password"
                      className="form-control border-0 shadow-sm"
                      style={{ borderRadius: '8px', padding: '12px 16px' }}
                      value={form.password_confirmation}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      required
                    />
                  </div>

                  <div className="col-12">
                    <button 
                      className="btn w-100 border-0 shadow-sm" 
                      type="submit"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        color: 'white',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <i className="bi bi-person-plus me-2"></i>
                      Register Staff Member
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffRegister;
