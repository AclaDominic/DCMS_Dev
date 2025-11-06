import { useEffect, useState } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function PolicySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [form, setForm] = useState({
    privacy_policy: "",
    terms_conditions: "",
    effective_date: "",
    contact_email: "",
    contact_phone: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [viewingPolicy, setViewingPolicy] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      // Load the currently active policies (what users currently see)
      const { data } = await api.get("/api/admin/policy-settings");
      setForm({
        privacy_policy: data.privacy_policy || "",
        terms_conditions: data.terms_conditions || "",
        effective_date: data.effective_date || new Date().toISOString().split('T')[0],
        contact_email: data.contact_email || "",
        contact_phone: data.contact_phone || "",
      });
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load policy settings.");
      console.error("Failed to load policy settings", e);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    
    // Validate effective date on frontend
    if (form.effective_date) {
      const selectedDate = new Date(form.effective_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        setError("Effective date cannot be in the past. Please select today or a future date.");
        setSaving(false);
        return;
      }
    }
    
    try {
      await api.put("/api/admin/policy-settings", form);
      setMessage("Policy settings saved successfully. All users have been notified about the policy update.");
      setTimeout(() => setMessage(""), 5000);
      // Reload history after saving
      loadHistory();
      // Reload current settings
      load();
    } catch (e) {
      const errorMessage = e?.response?.data?.message || "Failed to save policy settings.";
      const errorDetails = e?.response?.data?.errors;
      if (errorDetails?.effective_date) {
        setError(errorDetails.effective_date[0] || errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get("/api/admin/policy-settings/history");
      setHistory(data);
    } catch (e) {
      console.error("Failed to load policy history", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const viewPolicyVersion = async (id) => {
    try {
      const { data } = await api.get(`/api/admin/policy-settings/history/${id}`);
      setViewingPolicy(data);
      setShowHistoryModal(true);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load policy version.");
    }
  };

  useEffect(() => {
    load();
    loadHistory();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          minHeight: "100vh",
          width: "100%",
          padding: "1.5rem 1rem",
          boxSizing: "border-box",
        }}
      >
        <div className="container-fluid">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .table-row-hover:hover {
          background-color: #f0f0f0 !important;
        }
      `}</style>
      <div
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          minHeight: "100vh",
          width: "100%",
          padding: "1.5rem 1rem",
          boxSizing: "border-box",
        }}
      >
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10 col-xl-8">
            {/* Header Section */}
            <div className="text-center mb-4">
              <h2 className="fw-bold mb-2" style={{ color: "#1e293b" }}>
                <i className="bi bi-file-text me-2"></i>
                Terms & Privacy Policy Settings
              </h2>
              <p className="text-muted">
                Manage the Terms & Conditions and Privacy Policy content displayed to users
              </p>
            </div>

            {/* Messages */}
            {message && (
              <div
                className="alert alert-success alert-dismissible fade show"
                role="alert"
              >
                <i className="bi bi-check-circle me-2"></i>
                {message}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setMessage("")}
                ></button>
              </div>
            )}

            {error && (
              <div
                className="alert alert-danger alert-dismissible fade show"
                role="alert"
              >
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setError("")}
                ></button>
              </div>
            )}

            {/* Settings Card */}
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <form onSubmit={(e) => { e.preventDefault(); save(); }}>
                  {/* Contact Information */}
                  <div className="mb-4">
                    <h5 className="mb-3">
                      <i className="bi bi-telephone me-2"></i>
                      Contact Information
                    </h5>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Contact Email
                        </label>
                        <input
                          type="email"
                          className="form-control"
                          value={form.contact_email}
                          onChange={(e) =>
                            setForm({ ...form, contact_email: e.target.value })
                          }
                          placeholder="kreativedent@gmail.com"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Contact Phone
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={form.contact_phone}
                          onChange={(e) =>
                            setForm({ ...form, contact_phone: e.target.value })
                          }
                          placeholder="0927 759 2845"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Effective Date
                          <span className="text-danger ms-1">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={form.effective_date}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            const selectedDate = e.target.value;
                            const today = new Date().toISOString().split('T')[0];
                            if (selectedDate < today) {
                              setError("Effective date cannot be in the past. Please select today or a future date.");
                              return;
                            }
                            setForm({ ...form, effective_date: selectedDate });
                            setError("");
                          }}
                          required
                        />
                        <small className="text-muted">
                          <i className="bi bi-info-circle me-1"></i>
                          The effective date must be today or a future date. All users will be notified when the policy is updated.
                        </small>
                      </div>
                    </div>
                  </div>

                  <hr />

                  {/* Privacy Policy */}
                  <div className="mb-4">
                    <h5 className="mb-3">
                      <i className="bi bi-shield-lock me-2"></i>
                      Privacy Policy
                    </h5>
                    <label className="form-label fw-semibold">
                      Privacy Policy Content
                      <span className="badge bg-info ms-2" style={{ fontSize: "0.7rem" }}>
                        Currently Active
                      </span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={15}
                      value={form.privacy_policy}
                      onChange={(e) =>
                        setForm({ ...form, privacy_policy: e.target.value })
                      }
                      placeholder="Enter Privacy Policy content here..."
                      style={{ fontFamily: "monospace", fontSize: "0.9rem" }}
                    />
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      This field is pre-filled with the currently active Privacy Policy displayed to users. 
                      You can edit and amend it as needed.
                    </small>
                  </div>

                  <hr />

                  {/* Terms and Conditions */}
                  <div className="mb-4">
                    <h5 className="mb-3">
                      <i className="bi bi-file-earmark-text me-2"></i>
                      Terms and Conditions
                    </h5>
                    <label className="form-label fw-semibold">
                      Terms and Conditions Content
                      <span className="badge bg-info ms-2" style={{ fontSize: "0.7rem" }}>
                        Currently Active
                      </span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={15}
                      value={form.terms_conditions}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          terms_conditions: e.target.value,
                        })
                      }
                      placeholder="Enter Terms and Conditions content here..."
                      style={{ fontFamily: "monospace", fontSize: "0.9rem" }}
                    />
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      This field is pre-filled with the currently active Terms and Conditions displayed to users. 
                      You can edit and amend it as needed.
                    </small>
                  </div>

                  {/* Save Button */}
                  <div className="d-flex justify-content-end gap-2 mt-4">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={load}
                      disabled={saving}
                    >
                      <i className="bi bi-arrow-clockwise me-2"></i>
                      Reset
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-save me-2"></i>
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Policy History Card */}
            <div className="card shadow-sm border-0 mt-4">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">
                    <i className="bi bi-clock-history me-2"></i>
                    Policy History
                  </h5>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={loadHistory}
                    disabled={loadingHistory}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Refresh
                  </button>
                </div>
                <p className="text-muted small mb-3">
                  Click on any row to view the policy that was active on that date.
                </p>
                {loadingHistory ? (
                  <div className="text-center py-3">
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-inbox me-2"></i>
                    No policy history available yet.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Effective Date</th>
                          <th>Created At</th>
                          <th>Created By</th>
                          <th>Content</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((item) => (
                          <tr
                            key={item.id}
                            onClick={() => viewPolicyVersion(item.id)}
                            style={{ cursor: "pointer" }}
                            className="table-row-hover"
                          >
                            <td>
                              <strong>{item.effective_date}</strong>
                            </td>
                            <td>{item.created_at}</td>
                            <td>{item.created_by}</td>
                            <td>
                              {item.has_privacy_policy && (
                                <span className="badge bg-info me-1">
                                  <i className="bi bi-shield-lock me-1"></i>
                                  Privacy
                                </span>
                              )}
                              {item.has_terms_conditions && (
                                <span className="badge bg-primary">
                                  <i className="bi bi-file-earmark-text me-1"></i>
                                  Terms
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History View Modal */}
      {showHistoryModal && viewingPolicy && (
        <div
          className="modal fade show"
          style={{ display: "block" }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-file-text me-2"></i>
                  Policy Version - {viewingPolicy.effective_date}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowHistoryModal(false);
                    setViewingPolicy(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <small className="text-muted">
                    <strong>Created:</strong> {viewingPolicy.created_at} by {viewingPolicy.created_by}
                  </small>
                </div>

                <div className="mb-4">
                  <h6>
                    <i className="bi bi-shield-lock me-2"></i>
                    Privacy Policy
                  </h6>
                  <div
                    className="border rounded p-3"
                    style={{
                      backgroundColor: "#f8f9fa",
                      maxHeight: "300px",
                      overflowY: "auto",
                      fontFamily: "monospace",
                      fontSize: "0.9rem",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {viewingPolicy.privacy_policy || (
                      <span className="text-muted">No privacy policy content.</span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h6>
                    <i className="bi bi-file-earmark-text me-2"></i>
                    Terms and Conditions
                  </h6>
                  <div
                    className="border rounded p-3"
                    style={{
                      backgroundColor: "#f8f9fa",
                      maxHeight: "300px",
                      overflowY: "auto",
                      fontFamily: "monospace",
                      fontSize: "0.9rem",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {viewingPolicy.terms_conditions || (
                      <span className="text-muted">No terms and conditions content.</span>
                    )}
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <strong>Contact Email:</strong> {viewingPolicy.contact_email || "N/A"}
                  </div>
                  <div className="col-md-6">
                    <strong>Contact Phone:</strong> {viewingPolicy.contact_phone || "N/A"}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowHistoryModal(false);
                    setViewingPolicy(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </div>
      )}
      </div>
    </>
  );
}

