import { useEffect, useState } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";

function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [paying, setPaying] = useState(null); // appointment_id being processed

  useEffect(() => {
    (async () => {
      try {
        // ✅ prime CSRF once before any authenticated API calls
        await api.get("/sanctum/csrf-cookie");
      } catch (e) {
        // don't block; fetch may still work if cookie already present
        console.warn("CSRF prime failed (will retry later)", e);
      } finally {
        fetchAppointments(currentPage);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Refresh appointments when user returns to the page (e.g., after payment)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Page focused, refreshing appointments...');
      fetchAppointments(currentPage);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page visible, refreshing appointments...');
        fetchAppointments(currentPage);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentPage]);

  const fetchAppointments = async (page = 1) => {
    try {
      const res = await api.get(`/api/user-appointments?page=${page}`, {
        // this route often probes auth; ignore 401 auto-redirects
        skip401Handler: true,
      });
      
      // Debug: Log the response to see payment status
      console.log('Appointments API Response:', res.data.data);
      
      setAppointments(res.data.data);
      setMeta({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        per_page: res.data.per_page,
        total: res.data.total,
      });
    } catch (err) {
      console.error("Failed to fetch appointments", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await api.post(`/api/appointment/${id}/cancel`);
      alert("Appointment canceled.");
      fetchAppointments(currentPage);
    } catch (err) {
      console.error("Cancel failed", err);
      alert("Failed to cancel appointment.");
    }
  };

  const handlePayNow = async (appointmentId) => {
    try {
      setPaying(appointmentId);

      // ✅ 1) make sure we have fresh CSRF + session
      await api.get("/sanctum/csrf-cookie");

      // ✅ 2) let backend compute amount + create Maya checkout
      const { data } = await api.post(
        "/api/maya/payments",
        { appointment_id: appointmentId },
        { skip401Handler: true }
      );

      if (data?.redirect_url) {
        // ✅ 3) go to Maya sandbox hosted page
        window.location.href = data.redirect_url;
      } else {
        alert("Payment link not available. Please try again.");
      }
    } catch (err) {
      console.error("Create Maya payment failed", err);
      // surface server hint if available
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.maya?.message ||
        "Unable to start payment. Please try again.";
      alert(serverMsg);
    } finally {
      setPaying(null);
    }
  };

  const renderStatusBadge = (status) => {
    const map = {
      approved: "bg-success",
      pending: "bg-warning text-dark",
      rejected: "bg-danger",
      cancelled: "bg-secondary text-white fw-semibold",
      completed: "bg-primary",
    };
    return <span className={`badge ${map[status] || "bg-secondary"}`}>{status}</span>;
  };

  return (
    <div className="w-100">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
            <h2 className="h4 mb-3 mb-md-0">
              <i className="bi bi-calendar3 me-2"></i>
              My Appointments
            </h2>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => fetchAppointments(currentPage)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>

          {loading && <LoadingSpinner message="Loading appointments..." />}

          {!loading && appointments.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-calendar-x display-1 text-muted"></i>
              <h3 className="h5 mt-3 text-muted">No appointments yet</h3>
              <p className="text-muted">You haven't booked any appointments yet.</p>
              <a href="/patient/appointment" className="btn btn-primary">
                <i className="bi bi-calendar-plus me-2"></i>
                Book Your First Appointment
              </a>
            </div>
          )}

          {!loading && appointments.length > 0 && (
            <>
              {/* Desktop Table View */}
              <div className="d-none d-lg-block">
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Date & Time</th>
                            <th>Service</th>
                            <th>Payment Method</th>
                            <th>Payment Status</th>
                            <th>Appointment Status</th>
                            <th>Notes</th>
                            <th style={{ width: 160 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appointments.map((a) => {
                            const showPayNow =
                              a.payment_method === "maya" &&
                              a.payment_status === "awaiting_payment" &&
                              a.status === "approved";

                            return (
                              <tr key={a.id}>
                                <td>
                                  <div className="fw-medium">{a.date}</div>
                                  <small className="text-muted">{a.start_time}</small>
                                </td>
                                <td>
                                  <div className="fw-medium">{a.service?.name || "—"}</div>
                                </td>
                                <td>
                                  <span className="badge bg-light text-dark text-capitalize">
                                    {a.payment_method}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`badge ${
                                      a.payment_status === "paid"
                                        ? "bg-success"
                                        : a.payment_status === "awaiting_payment"
                                        ? "bg-warning text-dark"
                                        : "bg-secondary"
                                    }`}
                                  >
                                    {a.payment_status?.replace('_', ' ')}
                                  </span>
                                </td>
                                <td>{renderStatusBadge(a.status)}</td>
                                <td className="text-muted small">{a.notes || "—"}</td>
                                <td>
                                  <div className="d-flex gap-1 flex-wrap">
                                    {showPayNow && (
                                      <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handlePayNow(a.id)}
                                        disabled={paying === a.id}
                                      >
                                        {paying === a.id ? (
                                          <>
                                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                            Redirecting...
                                          </>
                                        ) : (
                                          "Pay now"
                                        )}
                                      </button>
                                    )}

                                    {a.status !== "cancelled" && a.status !== "rejected" && a.status !== "completed" && (
                                      <button
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => handleCancel(a.id)}
                                      >
                                        Cancel
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="d-lg-none">
                {appointments.map((a) => {
                  const showPayNow =
                    a.payment_method === "maya" &&
                    a.payment_status === "awaiting_payment" &&
                    a.status === "approved";

                  return (
                    <div key={a.id} className="card mb-3 border-0 shadow-sm">
                      <div className="card-body">
                        <div className="row">
                          <div className="col-8">
                            <h6 className="card-title mb-1">{a.service?.name || "—"}</h6>
                            <p className="card-text text-muted mb-2">
                              <i className="bi bi-calendar me-1"></i>
                              {a.date} at {a.start_time}
                            </p>
                          </div>
                          <div className="col-4 text-end">
                            {renderStatusBadge(a.status)}
                          </div>
                        </div>
                        
                        <div className="row mt-2">
                          <div className="col-6">
                            <small className="text-muted">Payment Method:</small>
                            <div className="badge bg-light text-dark text-capitalize">
                              {a.payment_method}
                            </div>
                          </div>
                          <div className="col-6">
                            <small className="text-muted">Payment Status:</small>
                            <div>
                              <span
                                className={`badge ${
                                  a.payment_status === "paid"
                                    ? "bg-success"
                                    : a.payment_status === "awaiting_payment"
                                    ? "bg-warning text-dark"
                                    : "bg-secondary"
                                }`}
                              >
                                {a.payment_status?.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {a.notes && (
                          <div className="mt-2">
                            <small className="text-muted">Notes:</small>
                            <p className="small mb-0">{a.notes}</p>
                          </div>
                        )}

                        <div className="d-flex gap-2 mt-3">
                          {showPayNow && (
                            <button
                              className="btn btn-primary btn-sm flex-fill"
                              onClick={() => handlePayNow(a.id)}
                              disabled={paying === a.id}
                            >
                              {paying === a.id ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                  Redirecting...
                                </>
                              ) : (
                                "Pay now"
                              )}
                            </button>
                          )}

                          {a.status !== "cancelled" && a.status !== "rejected" && a.status !== "completed" && (
                            <button
                              className="btn btn-outline-danger btn-sm flex-fill"
                              onClick={() => handleCancel(a.id)}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {meta.last_page > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-4">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    <i className="bi bi-chevron-left me-1"></i>
                    Previous
                  </button>

                  <span className="text-muted">
                    Page {meta.current_page} of {meta.last_page}
                  </span>

                  <button
                    className="btn btn-outline-secondary btn-sm"
                    disabled={currentPage === meta.last_page}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                    <i className="bi bi-chevron-right ms-1"></i>
                  </button>
                </div>
              )}
            </>
          )}
    </div>
  );
}

export default PatientAppointments;
