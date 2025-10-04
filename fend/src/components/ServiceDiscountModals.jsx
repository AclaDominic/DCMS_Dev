import React, { useState } from "react";

// 🔹 Modal for selecting a service to create a promo
export function ServiceSelectModal({ show, services, onSelect, onClose }) {
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  
  // Reset selection when modal opens/closes
  React.useEffect(() => {
    if (!show) {
      setSelectedServiceId(null);
    }
  }, [show]);

  const handleServiceClick = (serviceId) => {
    setSelectedServiceId(serviceId);
  };

  const handleConfirm = () => {
    if (selectedServiceId) {
      onSelect(selectedServiceId);
      setSelectedServiceId(null);
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ 
      backgroundColor: "rgba(0,0,0,0.5)", 
      zIndex: 1055,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflowY: 'auto' // Allow scrolling when content exceeds viewport
    }}>
      <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered" style={{ 
        maxHeight: 'calc(100vh - 3.5rem)', 
        margin: '1.75rem auto',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div className="modal-content" style={{ 
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div className="modal-header flex-shrink-0">
            <h5 className="modal-title">🦷 Select Service</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body flex-grow-1" style={{ 
            overflowY: 'auto',
            minHeight: 0,
            padding: '1rem',
            maxHeight: 'calc(100vh - 200px)' // Reserve space for header and footer
          }}>
            <div className="alert alert-info border-0 mb-3" style={{ borderRadius: '12px' }}>
              <i className="bi bi-info-circle me-2"></i>
              Click on a service to select it, then click "Select Service" to confirm.
            </div>
            <ul className="list-group">
              {services.map((s) => (
                <li
                  key={s.id}
                  className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                    selectedServiceId === s.id ? 'active' : ''
                  }`}
                  onClick={() => handleServiceClick(s.id)}
                  role="button"
                  style={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderRadius: selectedServiceId === s.id ? '8px' : '0'
                  }}
                >
                  <div>
                    <strong>{s.name}</strong>
                    <br />
                    <small className="text-muted">{s.description}</small>
                  </div>
                  <span className="badge bg-primary">₱{s.price}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="modal-footer flex-shrink-0" style={{ 
            borderTop: '1px solid #dee2e6',
            padding: '1rem',
            backgroundColor: '#f8f9fa'
          }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button 
              className="btn btn-primary" 
              onClick={handleConfirm}
              disabled={!selectedServiceId}
            >
              <i className="bi bi-check-circle me-2"></i>
              Select Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🔸 Modal for editing a promo
export function EditPromoModal({ show, promo, service, onSave, onCancel, loading, isCreatingNew = false }) {
  const [form, setForm] = useState({
    start_date: "",
    end_date: "",
    discounted_price: "",
  });
  const [errors, setErrors] = useState({});

  // Update form when promo changes
  React.useEffect(() => {
    if (promo) {
      setForm({
        start_date: promo.start_date,
        end_date: promo.end_date,
        discounted_price: promo.discounted_price,
      });
    } else {
      // Reset form for new promo creation
      setForm({
        start_date: "",
        end_date: "",
        discounted_price: "",
      });
    }
    setErrors({});
  }, [promo]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear errors when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    try {
      await onSave(form);
    } catch (err) {
      if (err.response?.status === 422) {
        const fieldErrors = err.response.data.errors;
        setErrors(fieldErrors || {});
      }
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ 
      backgroundColor: "rgba(0,0,0,0.5)", 
      zIndex: 1055,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflowY: 'auto' // Allow scrolling when content exceeds viewport
    }}>
      <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered" style={{ 
        maxHeight: 'calc(100vh - 6rem)', 
        margin: '3rem auto',
        display: 'flex',
        alignItems: 'flex-start',
        paddingTop: '1rem'
      }}>
        <div className="modal-content" style={{ 
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div className={`modal-header ${isCreatingNew ? 'bg-success' : 'bg-info'} text-white flex-shrink-0`}>
            <h5 className="modal-title">
              <i className={`bi ${isCreatingNew ? 'bi-plus-circle' : 'bi-pencil'} me-2`}></i>
              {isCreatingNew ? 'Create New Promo' : 'Edit Promo'}
            </h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>
          <form onSubmit={handleSubmit} className="d-flex flex-column h-100">
            <div className="modal-body flex-grow-1" style={{ 
              overflowY: 'auto',
              minHeight: 0,
              padding: '1rem',
              maxHeight: 'calc(100vh - 280px)' // Reserve much more space for header and footer
            }}>
              <div className="alert alert-info">
                <strong>Service:</strong> {service?.name}<br />
                <strong>Original Price:</strong> ₱{service?.price}
              </div>

              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">Start Date</label>
                  <input
                    name="start_date"
                    type="date"
                    className={`form-control ${errors.start_date ? 'is-invalid' : ''}`}
                    value={form.start_date}
                    onChange={handleChange}
                    required
                  />
                  {errors.start_date && (
                    <div className="invalid-feedback">{errors.start_date[0]}</div>
                  )}
                </div>
                <div className="col-12">
                  <label className="form-label">End Date</label>
                  <input
                    name="end_date"
                    type="date"
                    className={`form-control ${errors.end_date ? 'is-invalid' : ''}`}
                    value={form.end_date}
                    onChange={handleChange}
                    required
                  />
                  {errors.end_date && (
                    <div className="invalid-feedback">{errors.end_date[0]}</div>
                  )}
                </div>
                <div className="col-12">
                  <label className="form-label">Discounted Price (₱)</label>
                  <input
                    name="discounted_price"
                    type="number"
                    step="0.01"
                    min="0"
                    max={service?.price}
                    className={`form-control ${errors.discounted_price ? 'is-invalid' : ''}`}
                    value={form.discounted_price}
                    onChange={handleChange}
                    required
                  />
                  {errors.discounted_price && (
                    <div className="invalid-feedback">{errors.discounted_price[0]}</div>
                  )}
                  <div className="form-text">
                    Maximum: ₱{service?.price}
                  </div>
                </div>
              </div>

              {errors.message && (
                <div className="alert alert-danger mt-3">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  {errors.message}
                </div>
              )}
            </div>
            <div className="modal-footer flex-shrink-0" style={{ 
              borderTop: '1px solid #dee2e6',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              position: 'relative',
              zIndex: 10
            }}>
              <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className={`btn ${isCreatingNew ? 'btn-success' : 'btn-primary'}`} disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    {isCreatingNew ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    <i className={`bi ${isCreatingNew ? 'bi-plus-circle' : 'bi-check-circle'} me-1`}></i>
                    {isCreatingNew ? 'Create Promo' : 'Update Promo'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// 🔸 Modal for confirming deletion of a promo
export function DeletePromoModal({ show, promo, onConfirm, onCancel }) {
  if (!show || !promo) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ 
      backgroundColor: "rgba(0,0,0,0.5)",
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1055,
      overflowY: 'auto' // Allow scrolling when content exceeds viewport
    }}>
      <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered" style={{ 
        maxHeight: 'calc(100vh - 3.5rem)', 
        margin: '1.75rem auto',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div className="modal-content" style={{ 
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div className="modal-header bg-danger text-white flex-shrink-0">
            <h5 className="modal-title">⚠️ Confirm Promo Deletion</h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>
          <div className="modal-body flex-grow-1" style={{ 
            overflowY: 'auto',
            minHeight: 0,
            padding: '1rem',
            maxHeight: 'calc(100vh - 200px)' // Reserve space for header and footer
          }}>
            <p>
              Delete promo for <strong>{promo.start_date}</strong> to{" "}
              <strong>{promo.end_date}</strong>?<br />
              <span className="text-danger">This action is permanent.</span>
            </p>
          </div>
          <div className="modal-footer flex-shrink-0">
            <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button className="btn btn-danger" onClick={onConfirm}>Yes, Delete Promo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
