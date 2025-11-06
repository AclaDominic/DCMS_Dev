import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthLayout from '../layouts/AuthLayout';
import toast, { Toaster } from 'react-hot-toast';
import logo from "../pages/logo.png"; // ✅ Use the same logo as login
import "./register.css"; 

// Default fallback policy content
const defaultPolicy = {
  privacy_policy: `**Data Protection Act Compliance**

Kreative Dental Clinic is committed to protecting your privacy and personal information in accordance with the Data Protection Act. We collect, use, store, and process your personal data only for the purpose of providing dental services and managing your patient records.

**Information We Collect:**

- Personal identification information (name, email, contact number)
- Medical and dental history
- Appointment records and treatment information
- Billing and payment information
- Device and usage information when you access our online services

**How We Use Your Information:**

- To provide and improve our dental services
- To schedule and manage appointments
- To communicate with you about your treatment and appointments
- To maintain your medical records as required by law
- To process payments and billing
- To send important updates and notifications

**Data Security:**

We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Your data is stored securely and access is restricted to authorized personnel only.

**Your Rights:**

- Right to access your personal information
- Right to rectification of inaccurate data
- Right to erasure (in certain circumstances)
- Right to data portability
- Right to object to processing
- Right to withdraw consent

**Data Retention:**

We retain your personal information for as long as necessary to provide our services and as required by applicable laws and regulations. Medical records are typically retained for a minimum period as mandated by law.`,
  terms_conditions: `**Acceptance of Terms:**

By creating an account and using our services, you agree to comply with and be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our services.

**Account Responsibilities:**

- You are responsible for maintaining the confidentiality of your account credentials
- You must provide accurate and complete information
- You must notify us immediately of any unauthorized use of your account
- You are responsible for all activities that occur under your account

**Appointment Policies:**

- Appointments should be made in advance through the system
- Cancellations should be made at least 24 hours in advance
- Late arrivals may result in rescheduling of your appointment
- Missed appointments without proper notice may incur a fee

**Medical Information:**

The information provided in this system is for your convenience only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with qualified dental professionals for proper diagnosis and treatment.

**Service Availability:**

We reserve the right to modify, suspend, or discontinue any aspect of the service at any time. We do not guarantee uninterrupted or error-free access to our systems.

**Limitation of Liability:**

To the fullest extent permitted by law, Kreative Dental Clinic shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services.

**Changes to Terms:**

We reserve the right to modify these Terms and Conditions at any time. Continued use of our services after changes constitutes acceptance of the modified terms.`,
  contact_email: 'kreativedent@gmail.com',
  contact_phone: '0927 759 2845',
  effective_date: new Date().toISOString().split('T')[0]
};

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
  const [policyContent, setPolicyContent] = useState(defaultPolicy);
  const [policyLoading, setPolicyLoading] = useState(false);

  const navigate = useNavigate();

  // Fetch policy content when modal opens
  useEffect(() => {
    if (showPrivacyModal) {
      fetchPolicy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPrivacyModal]);

  const fetchPolicy = async () => {
    setPolicyLoading(true);
    try {
      const { data } = await api.get('/api/policy', { skip401Handler: true });
      setPolicyContent({
        privacy_policy: data.privacy_policy || defaultPolicy.privacy_policy,
        terms_conditions: data.terms_conditions || defaultPolicy.terms_conditions,
        contact_email: data.contact_email || defaultPolicy.contact_email,
        contact_phone: data.contact_phone || defaultPolicy.contact_phone,
        effective_date: data.effective_date || defaultPolicy.effective_date,
      });
    } catch (err) {
      console.error('Failed to fetch policy, using default', err);
      // Keep default policy content
    } finally {
      setPolicyLoading(false);
    }
  };

  const formatPolicyText = (text) => {
    if (!text) return '';
    // Convert markdown-style formatting to HTML
    const lines = text.split('\n');
    const elements = [];
    let inList = false;
    let listItems = [];

    lines.forEach((line, idx) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        if (inList) {
          elements.push(<ul key={`ul-${idx}`}>{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<p key={idx}><strong>{line.replace(/\*\*/g, '')}</strong></p>);
      } else if (line.startsWith('- ')) {
        if (!inList) {
          inList = true;
        }
        listItems.push(<li key={`li-${idx}`}>{line.substring(2)}</li>);
      } else if (line.trim() === '') {
        if (inList) {
          elements.push(<ul key={`ul-${idx}`}>{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<br key={idx} />);
      } else {
        if (inList) {
          elements.push(<ul key={`ul-${idx}`}>{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<p key={idx}>{line}</p>);
      }
    });

    if (inList && listItems.length > 0) {
      elements.push(<ul key="ul-final">{listItems}</ul>);
    }

    return elements;
  };

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
                {policyLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <h6>Privacy Policy</h6>
                    <div className="policy-content">
                      {formatPolicyText(policyContent.privacy_policy)}
                    </div>

                    <hr />

                    <h6>Terms and Conditions</h6>
                    <div className="policy-content">
                      {formatPolicyText(policyContent.terms_conditions)}
                    </div>

                    <hr />

                    <p><strong>Contact Information:</strong></p>
                    <p>
                      If you have any questions about this Privacy Policy or Terms and Conditions, please contact us at:
                    </p>
                    <p>
                      Kreative Dental Clinic<br />
                      Email: {policyContent.contact_email}<br />
                      Phone: {policyContent.contact_phone}
                    </p>

                    <p className="text-muted small mt-4">
                      <strong>Effective Date:</strong>{' '}
                      {policyContent.effective_date
                        ? new Date(policyContent.effective_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                    </p>
                  </>
                )}
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
