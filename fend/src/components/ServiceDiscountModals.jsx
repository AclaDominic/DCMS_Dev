import React, { useState } from "react";

// 🔹 Modal for selecting a service to create a promo
export function ServiceSelectModal({ show, services, onSelect, onClose }) {
  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">🦷 Select Service</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <ul className="list-group">
              {services.map((s) => (
                <li
                  key={s.id}
                  className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  onClick={() => onSelect(s.id)}
                  role="button"
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
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
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
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className={`modal-header ${isCreatingNew ? 'bg-success' : 'bg-info'} text-white`}>
            <h5 className="modal-title">
              <i className={`bi ${isCreatingNew ? 'bi-plus-circle' : 'bi-pencil'} me-2`}></i>
              {isCreatingNew ? 'Create New Promo' : 'Edit Promo'}
            </h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
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
            <div className="modal-footer">
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
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header bg-danger text-white">
            <h5 className="modal-title">⚠️ Confirm Promo Deletion</h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>
          <div className="modal-body">
            <p>
              Delete promo for <strong>{promo.start_date}</strong> to{" "}
              <strong>{promo.end_date}</strong>?<br />
              <span className="text-danger">This action is permanent.</span>
            </p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button className="btn btn-danger" onClick={onConfirm}>Yes, Delete Promo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
