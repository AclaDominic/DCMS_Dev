import { useEffect, useState } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function PolicySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    privacy_policy: "",
    terms_conditions: "",
    effective_date: "",
    contact_email: "",
    contact_phone: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
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
    try {
      await api.put("/api/admin/policy-settings", form);
      setMessage("Policy settings saved successfully.");
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save policy settings.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    load();
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
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={form.effective_date}
                          onChange={(e) =>
                            setForm({ ...form, effective_date: e.target.value })
                          }
                        />
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
                      This content will be displayed in the Privacy Policy modal
                      on the registration page.
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
                      This content will be displayed in the Terms & Conditions
                      section on the registration page.
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
          </div>
        </div>
      </div>
    </div>
  );
}

