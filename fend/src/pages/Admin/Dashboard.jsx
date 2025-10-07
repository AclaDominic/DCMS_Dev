import React, { useState } from "react";
import axios from "axios";

const AdminDashboard = () => {
  const [smsTest, setSmsTest] = useState({
    phoneNumber: '',
    message: '',
    loading: false,
    result: null,
    error: null
  });

  const handleSmsTest = async (e) => {
    e.preventDefault();
    
    if (!smsTest.phoneNumber.trim()) {
      setSmsTest(prev => ({ ...prev, error: 'Phone number is required' }));
      return;
    }

    // Validate Philippine mobile number format (10 digits starting with 9)
    const phoneRegex = /^9[0-9]{9}$/;
    if (!phoneRegex.test(smsTest.phoneNumber)) {
      setSmsTest(prev => ({ ...prev, error: 'Please enter a valid 10-digit Philippine mobile number (e.g., 9171234567)' }));
      return;
    }

    setSmsTest(prev => ({ ...prev, loading: true, error: null, result: null }));

    try {
      // Convert 9xxxxxxxxx to 09xxxxxxxxx format for backend
      const phoneNumber = '0' + smsTest.phoneNumber;
      
      const response = await axios.post('/api/admin/test-sms', {
        phone_number: phoneNumber,
        message: smsTest.message || undefined
      });

      setSmsTest(prev => ({ 
        ...prev, 
        loading: false, 
        result: response.data,
        phoneNumber: '',
        message: ''
      }));
    } catch (error) {
      setSmsTest(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.response?.data?.message || 'Failed to send test SMS'
      }));
    }
  };

  return (
    <div 
      className="admin-dashboard-page"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        minHeight: '100vh',
        width: '100%',
        padding: '1.5rem',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <div className="container-fluid" style={{ width: '100%', maxWidth: 'none', padding: 0 }}>
        <div className="row" style={{ margin: 0, width: '100%' }}>
          <div className="col-12" style={{ padding: 0 }}>
            {/* Header Section */}
            <div className="text-center mb-5">
              <div className="bg-primary rounded-circle mx-auto mb-4 d-flex align-items-center justify-content-center" 
                   style={{ width: '120px', height: '120px', fontSize: '3rem' }}>
                <i className="bi bi-house-door text-white"></i>
              </div>
              <h1 className="fw-bold mb-3" style={{ color: '#1e293b' }}>
                Welcome, Admin!
              </h1>
              <p className="text-muted fs-5">Your administrative control center</p>
            </div>

            {/* Dashboard Cards */}
            <div className="row g-4 mb-5" style={{ margin: 0, width: '100%' }}>
              <div className="col-12 col-sm-6 col-lg-3" style={{ padding: '0.5rem' }}>
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px', width: '100%' }}>
                  <div className="card-body p-4 text-center">
                    <div className="bg-primary rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" 
                         style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                      <i className="bi bi-people text-white"></i>
                    </div>
                    <h5 className="fw-bold text-primary">Patient Management</h5>
                    <p className="text-muted small">Manage patient records and appointments</p>
                  </div>
                </div>
              </div>
              
              <div className="col-12 col-sm-6 col-lg-3" style={{ padding: '0.5rem' }}>
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px', width: '100%' }}>
                  <div className="card-body p-4 text-center">
                    <div className="bg-success rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" 
                         style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                      <i className="bi bi-calendar-check text-white"></i>
                    </div>
                    <h5 className="fw-bold text-success">Appointments</h5>
                    <p className="text-muted small">Schedule and manage appointments</p>
                  </div>
                </div>
              </div>
              
              <div className="col-12 col-sm-6 col-lg-3" style={{ padding: '0.5rem' }}>
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px', width: '100%' }}>
                  <div className="card-body p-4 text-center">
                    <div className="bg-info rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" 
                         style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                      <i className="bi bi-bar-chart text-white"></i>
                    </div>
                    <h5 className="fw-bold text-info">Analytics</h5>
                    <p className="text-muted small">View reports and analytics</p>
                  </div>
                </div>
              </div>
              
              <div className="col-12 col-sm-6 col-lg-3" style={{ padding: '0.5rem' }}>
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px', width: '100%' }}>
                  <div className="card-body p-4 text-center">
                    <div className="bg-warning rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" 
                         style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                      <i className="bi bi-gear text-white"></i>
                    </div>
                    <h5 className="fw-bold text-warning">Settings</h5>
                    <p className="text-muted small">Configure system settings</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Card */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '16px', width: '100%' }}>
              <div className="card-header bg-primary text-white border-0" style={{ borderRadius: '16px 16px 0 0' }}>
                <h5 className="mb-0 fw-semibold">
                  <i className="bi bi-info-circle me-2"></i>
                  Dashboard Status
                </h5>
              </div>
              <div className="card-body p-5 text-center">
                <div className="bg-light rounded-circle mx-auto mb-4 d-flex align-items-center justify-content-center" 
                     style={{ width: '100px', height: '100px', fontSize: '2.5rem' }}>
                  🚧
                </div>
                <h4 className="fw-bold mb-3" style={{ color: '#1e293b' }}>
                  Dashboard Under Construction
                </h4>
                <p className="text-muted fs-5 mb-4">
                  We're working hard to bring you a comprehensive admin dashboard with all the features you need.
                </p>
                <div className="row g-3 justify-content-center" style={{ margin: 0, width: '100%' }}>
                  <div className="col-12 col-sm-6 col-md-4" style={{ padding: '0.5rem' }}>
                    <div className="d-flex align-items-center p-3 bg-light rounded" style={{ borderRadius: '12px', width: '100%' }}>
                      <div className="bg-success rounded-circle me-3 d-flex align-items-center justify-content-center" 
                           style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                        <i className="bi bi-check text-white"></i>
                      </div>
                      <div>
                        <div className="fw-semibold text-dark">User Management</div>
                        <small className="text-muted">Available</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-sm-6 col-md-4" style={{ padding: '0.5rem' }}>
                    <div className="d-flex align-items-center p-3 bg-light rounded" style={{ borderRadius: '12px', width: '100%' }}>
                      <div className="bg-success rounded-circle me-3 d-flex align-items-center justify-content-center" 
                           style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                        <i className="bi bi-check text-white"></i>
                      </div>
                      <div>
                        <div className="fw-semibold text-dark">System Logs</div>
                        <small className="text-muted">Available</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-sm-6 col-md-4" style={{ padding: '0.5rem' }}>
                    <div className="d-flex align-items-center p-3 bg-light rounded" style={{ borderRadius: '12px', width: '100%' }}>
                      <div className="bg-warning rounded-circle me-3 d-flex align-items-center justify-content-center" 
                           style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                        <i className="bi bi-clock text-white"></i>
                      </div>
                      <div>
                        <div className="fw-semibold text-dark">Analytics</div>
                        <small className="text-muted">Coming Soon</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SMS Test Section */}
            <div className="card border-0 shadow-sm mt-4" style={{ borderRadius: '16px', width: '100%' }}>
              <div className="card-header bg-info text-white border-0" style={{ borderRadius: '16px 16px 0 0' }}>
                <h5 className="mb-0 fw-semibold">
                  <i className="bi bi-chat-dots me-2"></i>
                  SMS Test
                </h5>
              </div>
              <div className="card-body p-4">
                <form onSubmit={handleSmsTest}>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label htmlFor="phoneNumber" className="form-label fw-semibold">
                        Phone Number (Philippines)
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">+63</span>
                        <input
                          type="text"
                          className="form-control border-start-0"
                          id="phoneNumber"
                          placeholder="9171234567"
                          value={smsTest.phoneNumber}
                          onChange={(e) => setSmsTest(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          disabled={smsTest.loading}
                          maxLength={10}
                        />
                      </div>
                      <div className="form-text">
                        Enter 10-digit Philippine mobile number (e.g., 9171234567)
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <label htmlFor="message" className="form-label fw-semibold">
                        Custom Message (Optional)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="message"
                        placeholder="Leave empty for default test message"
                        value={smsTest.message}
                        onChange={(e) => setSmsTest(prev => ({ ...prev, message: e.target.value }))}
                        disabled={smsTest.loading}
                        maxLength={160}
                      />
                      <div className="form-text">
                        {smsTest.message.length}/160 characters
                      </div>
                    </div>
                    <div className="col-12">
                      <button
                        type="submit"
                        className="btn btn-info btn-lg px-4"
                        disabled={smsTest.loading || !smsTest.phoneNumber.trim() || !/^9[0-9]{9}$/.test(smsTest.phoneNumber)}
                      >
                        {smsTest.loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Sending...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-send me-2"></i>
                            Send Test SMS
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Error Message */}
                {smsTest.error && (
                  <div className="alert alert-danger mt-3" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {smsTest.error}
                  </div>
                )}

                {/* Success Message */}
                {smsTest.result && (
                  <div className="alert alert-success mt-3" role="alert">
                    <i className="bi bi-check-circle me-2"></i>
                    <strong>Success!</strong> {smsTest.result.message}
                    {smsTest.result.data && (
                      <div className="mt-2">
                        <small>
                          <strong>Phone:</strong> +63{smsTest.result.data.phone_number.replace('+639', '')}<br/>
                          <strong>Message:</strong> {smsTest.result.data.message}<br/>
                          <strong>Sent at:</strong> {new Date(smsTest.result.data.sent_at).toLocaleString()}
                        </small>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
