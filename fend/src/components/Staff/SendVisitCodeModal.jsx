import { useState, useEffect } from "react";
import api from "../../api/api";

export default function SendVisitCodeModal({ visit, onClose, onSuccess }) {
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDentist, setSelectedDentist] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAvailableDentists();
  }, []);

  const fetchAvailableDentists = async () => {
    setLoading(true);
    setError("");
    try {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const todayName = dayNames[dayOfWeek];
      
      // Get all active dentists and filter by today's schedule
      const response = await api.get('/api/dentists', {
        params: { status: 'active' }
      });
      
      // Filter dentists who are working today
      const availableDentists = response.data.filter(dentist => {
        return dentist[todayName] === true && 
               dentist.status === 'active' &&
               (!dentist.contract_end_date || new Date(dentist.contract_end_date) >= today);
      });

      console.log('Available dentists:', availableDentists);
      setDentists(availableDentists);
    } catch (err) {
      console.error("Failed to fetch dentists:", err);
      setError("Failed to load available dentists. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!selectedDentist) {
      setError("Please select a dentist to send the visit code to.");
      return;
    }

    // Check if dentist has email
    if (!selectedDentist.email) {
      setError("Selected dentist does not have an email address configured.");
      return;
    }

    setSending(true);
    setError("");

    try {
      console.log('Sending visit code to dentist:', selectedDentist);
      
      // Send visit code notification to the selected dentist
      const response = await api.post('/api/visits/send-visit-code', {
        visit_id: visit.id,
        dentist_id: selectedDentist.id,
        dentist_email: selectedDentist.email
      });
      
      // Show success message
      alert(`Visit code sent successfully to Dr. ${selectedDentist.dentist_name || selectedDentist.dentist_code}!`);
      
      if (onSuccess) {
        onSuccess(selectedDentist);
      }
      
      onClose();
    } catch (err) {
      console.error("Failed to send visit code:", err);
      
      // Extract error message from response
      let errorMessage = "Failed to send visit code. Please try again.";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-send me-2"></i>
              Send Visit Code to Dentist
            </h5>
            <button
              className="btn-close"
              onClick={onClose}
              disabled={sending}
            ></button>
          </div>
          
          <div className="modal-body">
            {/* Visit Information */}
            <div className="alert alert-info mb-4">
              <h6 className="alert-heading">
                <i className="bi bi-info-circle me-2"></i>
                Visit Information
              </h6>
              <div className="row">
                <div className="col-md-6">
                  <strong>Patient:</strong> {visit.patient?.first_name} {visit.patient?.last_name}
                </div>
                <div className="col-md-6">
                  <strong>Visit Code:</strong> 
                  <span className="badge bg-primary ms-2 fs-6">{visit.visit_code}</span>
                </div>
                <div className="col-md-6 mt-2">
                  <strong>Service:</strong> {visit.service?.name || 'Not specified'}
                </div>
                <div className="col-md-6 mt-2">
                  <strong>Started:</strong> {new Date(visit.start_time).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Dentist Selection */}
            <div className="mb-4">
              <label className="form-label fw-semibold">
                <i className="bi bi-person-badge me-2"></i>
                Select Available Dentist Today
              </label>
              
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <div className="mt-2 text-muted">Loading available dentists...</div>
                </div>
              ) : error && !dentists.length ? (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              ) : dentists.length === 0 ? (
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  No dentists are scheduled to work today. Please check the dentist schedule.
                </div>
              ) : (
                <div className="row">
                  {dentists.map((dentist) => (
                    <div key={dentist.id} className="col-md-6 mb-3">
                      <div 
                        className={`card h-100 cursor-pointer border-2 ${
                          selectedDentist?.id === dentist.id 
                            ? 'border-primary bg-light' 
                            : 'border-light'
                        }`}
                        style={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => setSelectedDentist(dentist)}
                        onMouseEnter={(e) => {
                          if (selectedDentist?.id !== dentist.id) {
                            e.target.style.borderColor = '#0d6efd';
                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedDentist?.id !== dentist.id) {
                            e.target.style.borderColor = '#e9ecef';
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                      >
                        <div className="card-body p-3">
                          <div className="d-flex align-items-center">
                            <div className="me-3">
                              <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                                   style={{ width: '40px', height: '40px' }}>
                                <i className="bi bi-person-fill"></i>
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="card-title mb-1">
                                Dr. {dentist.dentist_name || dentist.dentist_code}
                              </h6>
                              <small className="text-muted">
                                {dentist.dentist_code && (
                                  <span className="badge bg-secondary me-2">{dentist.dentist_code}</span>
                                )}
                                {dentist.employment_type && (
                                  <span className="text-capitalize">{dentist.employment_type.replace('_', ' ')}</span>
                                )}
                              </small>
                              {dentist.email && (
                                <div className="mt-1">
                                  <small className="text-muted">
                                    <i className="bi bi-envelope me-1"></i>
                                    {dentist.email}
                                  </small>
                                </div>
                              )}
                            </div>
                            {selectedDentist?.id === dentist.id && (
                              <div className="text-primary">
                                <i className="bi bi-check-circle-fill fs-5"></i>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="alert alert-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSendCode}
              disabled={sending || !selectedDentist || dentists.length === 0}
            >
              {sending ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Sending...
                </>
              ) : (
                <>
                  <i className="bi bi-send me-2"></i>
                  Send Visit Code
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
