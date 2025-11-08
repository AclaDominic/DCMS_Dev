import { useEffect, useState } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function RefundSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cancellation_deadline_hours: 24,
    monthly_cancellation_limit: 3,
    create_zero_refund_request: false,
    reminder_days: 5,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/admin/refund-settings");
      setForm({
        cancellation_deadline_hours: data.cancellation_deadline_hours ?? 24,
        monthly_cancellation_limit: data.monthly_cancellation_limit ?? 3,
        create_zero_refund_request: data.create_zero_refund_request ?? false,
        reminder_days: data.reminder_days ?? 5,
      });
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load refund settings.");
      console.error("Failed to load refund settings", e);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await api.patch("/api/admin/refund-settings", form);
      setMessage("Refund settings saved successfully.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save refund settings.");
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
        className="refund-settings-page"
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
      className="refund-settings-page"
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
          <div className="col-12 col-md-10 col-lg-8 col-xl-7">
            {/* Header Section */}
            <div className="text-center mb-4">
              <h2 className="fw-bold mb-2" style={{ color: "#1e293b" }}>
                <i className="bi bi-arrow-counterclockwise me-2"></i>
                Refund & Cancellation Settings
              </h2>
              <p className="text-muted">
                Configure global settings for appointment cancellations and refunds
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
                  aria-label="Close"
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
                  aria-label="Close"
                ></button>
              </div>
            )}

            {/* Settings Card */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: "16px" }}>
              <div
                className="card-header border-0"
                style={{
                  borderRadius: "16px 16px 0 0",
                  background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                }}
              >
                <h5 className="mb-0 fw-bold" style={{ color: "#1e293b" }}>
                  <i className="bi bi-gear me-2"></i>
                  Settings
                </h5>
              </div>
              <div className="card-body p-4">
                {/* Cancellation Deadline Hours */}
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    <i className="bi bi-clock me-2"></i>
                    Cancellation Deadline (Hours)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    max="168"
                    value={form.cancellation_deadline_hours}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        cancellation_deadline_hours: Number(e.target.value),
                      })
                    }
                  />
                  <small className="text-muted">
                    Minimum hours before appointment that patients must cancel to be eligible for refunds.
                    (0-168 hours = 0-7 days)
                  </small>
                </div>

                {/* Monthly Cancellation Limit */}
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    <i className="bi bi-calendar-x me-2"></i>
                    Monthly Cancellation Limit per Patient
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    max="50"
                    value={form.monthly_cancellation_limit}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        monthly_cancellation_limit: Number(e.target.value),
                      })
                    }
                  />
                  <small className="text-muted">
                    Maximum number of cancellations allowed per patient per month.
                    Set to 0 to disable the limit.
                  </small>
                </div>

                {/* Create Zero Refund Request */}
                <div className="mb-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="createZeroRefund"
                      checked={form.create_zero_refund_request}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          create_zero_refund_request: e.target.checked,
                        })
                      }
                    />
                    <label
                      className="form-check-label fw-bold"
                      htmlFor="createZeroRefund"
                    >
                      <i className="bi bi-info-circle me-2"></i>
                      Create Refund Request Even if Amount is Zero
                    </label>
                  </div>
                  <small className="text-muted d-block mt-1">
                    If enabled, a refund request will be created even when the refund amount is zero
                    (e.g., when cancellation fee equals the payment amount).
                  </small>
                </div>

                {/* Reminder Days */}
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    <i className="bi bi-bell me-2"></i>
                    Reminder Days for Overdue Refunds
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    max="30"
                    value={form.reminder_days}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        reminder_days: Number(e.target.value),
                      })
                    }
                  />
                  <small className="text-muted">
                    Number of days after approval before sending reminders for unprocessed refund requests.
                    (1-30 days)
                  </small>
                </div>

                {/* Save Button */}
                <div className="d-flex justify-content-end mt-4">
                  <button
                    className="btn btn-primary"
                    onClick={save}
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
                        Save Settings
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}








