import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthLayout from '../layouts/AuthLayout';
import toast, { Toaster } from 'react-hot-toast';
import logo from "../pages/logo.png"; // ✅ Use the same logo as login
import "./register.css"; 
function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    contact_number: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};

    if (!/^09\d{9}$/.test(form.contact_number)) {
      newErrors.contact_number = "Contact number must start with 09 and be 11 digits.";
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(form.password)) {
      newErrors.password = "Password must have at least 1 uppercase, 1 lowercase, 1 number, and be 8+ characters.";
    }

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!acceptedTerms) {
      newErrors.terms = "You must accept the Terms and Conditions and Privacy Policy to register.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: null });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!validate()) return;

    try {
      setLoading(true);
      await api.get('/sanctum/csrf-cookie');

      const res = await api.post('/api/register', {
        name: form.name,
        email: form.email,
        contact_number: form.contact_number,
        password: form.password,
        password_confirmation: form.confirmPassword
      });

      // Successfully registered
      localStorage.setItem('token', res.data.token);
      
      // Show green success toast notification
      toast.success('Successful registration', {
        style: {
          background: '#28a745',
          color: '#fff',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '16px',
        },
        duration: 3000,
        position: 'top-center',
      });

      // Clear form
      setForm({
        name: '',
        email: '',
        contact_number: '',
        password: '',
        confirmPassword: ''
      });

      setErrors({});
      setMessage('');

      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (err) {
      if (err.response?.data?.errors) {
        // Handle field-specific validation errors
        const fieldErrors = {};
        Object.keys(err.response.data.errors).forEach(key => {
          // Map server field names to form field names
          if (key === 'contact_number') {
            fieldErrors.contact_number = err.response.data.errors[key][0];
          } else if (key === 'password') {
            fieldErrors.password = err.response.data.errors[key][0];
          } else if (key === 'email') {
            fieldErrors.email = err.response.data.errors[key][0];
          } else if (key === 'name') {
            fieldErrors.name = err.response.data.errors[key][0];
          }
        });
        setErrors(fieldErrors);
      }
      const errorMessage = err.response?.data?.message || 'Registration failed';
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Toaster position="top-center" />
      {loading && <LoadingSpinner message="Registering patient..." />}
      
      <div className="auth-container">
        {/* ✅ Left Side (Logo + Message) */}
        <div className="auth-left">
          <img src={logo} alt="Kreative Dental Logo" className="auth-logo" />
          <h2 className="auth-title">Create Your Account</h2>
          <p className="auth-description">
            Join us today and manage your appointments, treatment history, and profile in one place.
          </p>
        </div>

        {/* ✅ Right Side (Register Form) */}
        <div className="auth-right">
          <div className="card shadow-sm p-4">
            <h3 className="text-center mb-4">Patient Registration</h3>
            <form onSubmit={handleRegister}>
              <div className="mb-3">
                <label className="form-label"><i className="bi bi-person me-2" />Full Name</label>
                <input
                  type="text"
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label"><i className="bi bi-envelope me-2" />Email</label>
                <input
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label"><i className="bi bi-telephone me-2" />Contact Number</label>
                <input
                  type="text"
                  className={`form-control ${errors.contact_number ? 'is-invalid' : ''}`}
                  name="contact_number"
                  value={form.contact_number}
                  onChange={handleChange}
                  required
                />
                {errors.contact_number && <div className="invalid-feedback">{errors.contact_number}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label"><i className="bi bi-lock me-2" />Password</label>
                <input
                  type="password"
                  className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                {errors.password && <div className="invalid-feedback">{errors.password}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label"><i className="bi bi-lock-fill me-2" />Confirm Password</label>
                <input
                  type="password"
                  className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
              </div>

              {/* Terms and Conditions Checkbox */}
              <div className="mb-3">
                <div className="form-check">
                  <input
                    className={`form-check-input ${errors.terms ? 'is-invalid' : ''}`}
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      setErrors({ ...errors, terms: null });
                    }}
                    required
                  />
                  <label className="form-check-label" htmlFor="acceptTerms">
                    I agree to the{' '}
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowPrivacyModal(true);
                      }}
                      style={{ verticalAlign: 'baseline' }}
                    >
                      Term, Privacy Policy
                    </button>
                  </label>
                  {errors.terms && <div className="invalid-feedback d-block">{errors.terms}</div>}
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={!acceptedTerms}>
                <i className="bi bi-person-plus me-2" />
                Register
              </button>
            </form>

            {message && (
              <div className={`alert text-center mt-3 ${message.includes('✅') || message.includes('⚠️') ? 'alert-info' : 'alert-danger'}`}>
                {message}
              </div>
            )}

            <div className="text-center mt-3">
              <Link to="/login" className="d-block text-decoration-none text-primary mb-2">
                <i className="bi bi-box-arrow-in-right me-2" />
                Already have an account? Login
              </Link>
              
          
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Policy and Terms Modal */}
      {showPrivacyModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Terms, Privacy Policy</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPrivacyModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <h6>Privacy Policy</h6>
                <p><strong>Data Protection Act Compliance</strong></p>
                <p>
                  Kreative Dental Clinic is committed to protecting your privacy and personal information in accordance 
                  with the Data Protection Act. We collect, use, store, and process your personal data only for the 
                  purpose of providing dental services and managing your patient records.
                </p>

                <p><strong>Information We Collect:</strong></p>
                <ul>
                  <li>Personal identification information (name, email, contact number)</li>
                  <li>Medical and dental history</li>
                  <li>Appointment records and treatment information</li>
                  <li>Billing and payment information</li>
                  <li>Device and usage information when you access our online services</li>
                </ul>

                <p><strong>How We Use Your Information:</strong></p>
                <ul>
                  <li>To provide and improve our dental services</li>
                  <li>To schedule and manage appointments</li>
                  <li>To communicate with you about your treatment and appointments</li>
                  <li>To maintain your medical records as required by law</li>
                  <li>To process payments and billing</li>
                  <li>To send important updates and notifications</li>
                </ul>

                <p><strong>Data Security:</strong></p>
                <p>
                  We implement appropriate technical and organizational measures to protect your personal information 
                  against unauthorized access, alteration, disclosure, or destruction. Your data is stored securely 
                  and access is restricted to authorized personnel only.
                </p>

                <p><strong>Your Rights:</strong></p>
                <ul>
                  <li>Right to access your personal information</li>
                  <li>Right to rectification of inaccurate data</li>
                  <li>Right to erasure (in certain circumstances)</li>
                  <li>Right to data portability</li>
                  <li>Right to object to processing</li>
                  <li>Right to withdraw consent</li>
                </ul>

                <p><strong>Data Retention:</strong></p>
                <p>
                  We retain your personal information for as long as necessary to provide our services and as required 
                  by applicable laws and regulations. Medical records are typically retained for a minimum period as 
                  mandated by law.
                </p>

                <hr />

                <h6>Terms and Conditions</h6>
                <p><strong>Acceptance of Terms:</strong></p>
                <p>
                  By creating an account and using our services, you agree to comply with and be bound by these 
                  Terms and Conditions. If you do not agree with any part of these terms, please do not use our services.
                </p>

                <p><strong>Account Responsibilities:</strong></p>
                <ul>
                  <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                  <li>You must provide accurate and complete information</li>
                  <li>You must notify us immediately of any unauthorized use of your account</li>
                  <li>You are responsible for all activities that occur under your account</li>
                </ul>

                <p><strong>Appointment Policies:</strong></p>
                <ul>
                  <li>Appointments should be made in advance through the system</li>
                  <li>Cancellations should be made at least 24 hours in advance</li>
                  <li>Late arrivals may result in rescheduling of your appointment</li>
                  <li>Missed appointments without proper notice may incur a fee</li>
                </ul>

                <p><strong>Medical Information:</strong></p>
                <p>
                  The information provided in this system is for your convenience only. It is not a substitute for 
                  professional medical advice, diagnosis, or treatment. Always consult with qualified dental professionals 
                  for proper diagnosis and treatment.
                </p>

                <p><strong>Service Availability:</strong></p>
                <p>
                  We reserve the right to modify, suspend, or discontinue any aspect of the service at any time. 
                  We do not guarantee uninterrupted or error-free access to our systems.
                </p>

                <p><strong>Limitation of Liability:</strong></p>
                <p>
                  To the fullest extent permitted by law, Kreative Dental Clinic shall not be liable for any indirect, 
                  incidental, special, consequential, or punitive damages resulting from your use of our services.
                </p>

                <p><strong>Changes to Terms:</strong></p>
                <p>
                  We reserve the right to modify these Terms and Conditions at any time. Continued use of our services 
                  after changes constitutes acceptance of the modified terms.
                </p>

                <hr />

                <p><strong>Contact Information:</strong></p>
                <p>
                  If you have any questions about this Privacy Policy or Terms and Conditions, please contact us at:
                </p>
                <p>
                  Kreative Dental Clinic<br />
                  Email: kreativedent@gmail.com<br />
                  Phone: 0927 759 2845
                </p>

                <p className="text-muted small mt-4">
                  <strong>Effective Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPrivacyModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setAcceptedTerms(true);
                    setShowPrivacyModal(false);
                  }}
                >
                  Accept and Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export default Register;
