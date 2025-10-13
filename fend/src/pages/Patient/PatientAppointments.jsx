import { useEffect, useState } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import PatientServiceHistory from "../../components/Patient/PatientServiceHistory";

function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [paying, setPaying] = useState(null); // appointment_id being processed
  const [generatingReceipt, setGeneratingReceipt] = useState(null); // appointment_id being processed
  const [rescheduleModal, setRescheduleModal] = useState(null); // appointment being rescheduled
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  
  // Tab state for switching between appointments and service history
  const [activeTab, setActiveTab] = useState("appointments");

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

  const handleViewReceipt = async (appointmentId) => {
    try {
      setGeneratingReceipt(appointmentId);

      // Generate and download receipt
      const response = await api.get(`/api/receipts/appointment/${appointmentId}`, {
        responseType: 'blob',
        skip401Handler: true
      });

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${appointmentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Failed to generate receipt", err);
      const serverMsg = err.response?.data?.message || "Failed to generate receipt. Please try again.";
      alert(serverMsg);
    } finally {
      setGeneratingReceipt(null);
    }
  };

  const handleOpenReschedule = (appointment) => {
    setRescheduleModal(appointment);
    setRescheduleDate("");
    setRescheduleSlots([]);
    setSelectedRescheduleSlot("");
  };

  const handleRescheduleDateChange = async (e) => {
    const date = e.target.value;
    setRescheduleDate(date);
    setRescheduleSlots([]);
    setSelectedRescheduleSlot("");

    if (date && rescheduleModal) {
      try {
        const res = await api.get(
          `/api/appointment/available-slots?date=${date}&service_id=${rescheduleModal.service.id}`
        );
        setRescheduleSlots(res.data.slots);
      } catch (err) {
        console.error("Failed to fetch available slots", err);
        setRescheduleSlots([]);
      }
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleDate || !selectedRescheduleSlot || !rescheduleModal) {
      alert("Please select both date and time slot.");
      return;
    }

    try {
      setRescheduleLoading(true);
      await api.post(`/api/appointment/${rescheduleModal.id}/reschedule`, {
        date: rescheduleDate,
        start_time: selectedRescheduleSlot,
      });

      alert("Appointment rescheduled successfully! It will need staff approval.");
      setRescheduleModal(null);
      setRescheduleDate("");
      setRescheduleSlots([]);
      setSelectedRescheduleSlot("");
      fetchAppointments(currentPage);
    } catch (err) {
      console.error("Reschedule failed", err);
      const errorData = err.response?.data;
      
      // Check if this is a blocked patient error
      if (errorData?.blocked) {
        alert(errorData.message);
      } else {
        const serverMsg = errorData?.message || "Failed to reschedule appointment.";
        alert(serverMsg);
      }
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleCloseReschedule = () => {
    setRescheduleModal(null);
    setRescheduleDate("");
    setRescheduleSlots([]);
    setSelectedRescheduleSlot("");
  };

  // Helper functions for date formatting
  const todayStr = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  };

  const tomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const sevenDaysOutStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
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
              My Appointments & History
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

          {/* Tab Navigation */}
          <div className="d-flex gap-2 mb-4" role="group" aria-label="Content tabs">
            <button
              className={`btn flex-fill flex-sm-grow-0 border-0 shadow-sm ${
                activeTab === "appointments" ? "" : "btn-outline-primary"
              }`}
              onClick={() => setActiveTab("appointments")}
              type="button"
              style={{
                background: activeTab === "appointments" 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                  : 'transparent',
                color: activeTab === "appointments" ? 'white' : '#3b82f6',
                border: activeTab === "appointments" ? 'none' : '1px solid #3b82f6',
                borderRadius: '8px',
                padding: '12px 16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                minWidth: '140px'
              }}
            >
              <i className="bi bi-calendar3 me-2"></i>
              <span className="d-none d-sm-inline">Appointments</span>
              <span className="d-sm-none">Appts</span>
            </button>
            <button
              className={`btn flex-fill flex-sm-grow-0 border-0 shadow-sm ${
                activeTab === "history" ? "" : "btn-outline-primary"
              }`}
              onClick={() => setActiveTab("history")}
              type="button"
              style={{
                background: activeTab === "history" 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                  : 'transparent',
                color: activeTab === "history" ? 'white' : '#3b82f6',
                border: activeTab === "history" ? 'none' : '1px solid #3b82f6',
                borderRadius: '8px',
                padding: '12px 16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                minWidth: '140px'
              }}
            >
              <i className="bi bi-clock-history me-2"></i>
              <span className="d-none d-sm-inline">Service History</span>
              <span className="d-sm-none">History</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === "appointments" && (
              <div className="tab-pane fade show active">
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

                            const showReceipt = a.status === "completed" && a.payment_status === "paid";
                            const showReschedule = a.payment_method === "maya" && a.payment_status === "paid" && (a.status === "approved" || a.status === "pending");

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

                                    {showReceipt && (
                                      <button
                                        className="btn btn-success btn-sm"
                                        onClick={() => handleViewReceipt(a.id)}
                                        disabled={generatingReceipt === a.id}
                                        title="Download Receipt"
                                      >
                                        {generatingReceipt === a.id ? (
                                          <>
                                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                            Generating...
                                          </>
                                        ) : (
                                          <>
                                            <i className="bi bi-receipt me-1"></i>
                                            Receipt
                                          </>
                                        )}
                                      </button>
                                    )}

                                    {showReschedule && (
                                      <button
                                        className="btn btn-warning btn-sm"
                                        onClick={() => handleOpenReschedule(a)}
                                        title="Reschedule Appointment"
                                      >
                                        <i className="bi bi-calendar-event me-1"></i>
                                        Reschedule
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

                  const showReceipt = a.status === "completed" && a.payment_status === "paid";
                  const showReschedule = a.payment_method === "maya" && a.payment_status === "paid" && (a.status === "approved" || a.status === "pending");

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

                          {showReceipt && (
                            <button
                              className="btn btn-success btn-sm flex-fill"
                              onClick={() => handleViewReceipt(a.id)}
                              disabled={generatingReceipt === a.id}
                            >
                              {generatingReceipt === a.id ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-receipt me-1"></i>
                                  Receipt
                                </>
                              )}
                            </button>
                          )}

                          {showReschedule && (
                            <button
                              className="btn btn-warning btn-sm flex-fill"
                              onClick={() => handleOpenReschedule(a)}
                            >
                              <i className="bi bi-calendar-event me-1"></i>
                              Reschedule
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
            )}

            {activeTab === "history" && (
              <div className="tab-pane fade show active">
                <PatientServiceHistory />
              </div>
            )}
          </div>

          {/* Reschedule Modal */}
          {rescheduleModal && (
            <div className="modal show d-block" style={{ 
              backgroundColor: 'rgba(0,0,0,0.5)',
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1050,
              overflowY: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem"
            }} tabIndex="-1">
              <div className="modal-dialog modal-dialog-centered" style={{
                margin: "0 auto",
                maxHeight: "calc(100vh - 2rem)",
                width: "100%"
              }}>
                <div className="modal-content" style={{
                  display: "flex",
                  flexDirection: "column",
                  maxHeight: "calc(100vh - 2rem)",
                  overflow: "hidden"
                }}>
                  <div className="modal-header flex-shrink-0" style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    backgroundColor: "#fff",
                    borderBottom: "1px solid #dee2e6"
                  }}>
                    <h5 className="modal-title">
                      <i className="bi bi-calendar-event me-2"></i>
                      Reschedule Appointment
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={handleCloseReschedule}
                      disabled={rescheduleLoading}
                    ></button>
                  </div>
                  <div className="modal-body flex-grow-1" style={{
                    overflowY: "auto",
                    overflowX: "hidden",
                    flex: "1 1 auto",
                    minHeight: 0
                  }}>
                    <div className="alert alert-info border-0">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>Service:</strong> {rescheduleModal.service?.name}
                      <br />
                      <strong>Current Date:</strong> {rescheduleModal.date} at {rescheduleModal.start_time}
                      <br />
                      <small>All other details (payment method, service, etc.) will remain the same.</small>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        <i className="bi bi-calendar3 me-2 text-primary"></i>
                        Select New Date
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={rescheduleDate}
                        onChange={handleRescheduleDateChange}
                        min={tomorrowStr()}
                        max={sevenDaysOutStr()}
                        disabled={rescheduleLoading}
                      />
                      <div className="form-text">
                        Appointments can be rescheduled from tomorrow up to 7 days in advance
                      </div>
                    </div>

                    {rescheduleDate && rescheduleSlots.length > 0 && (
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-clock me-2 text-primary"></i>
                          Available Time Slots
                        </label>
                        <select
                          className="form-select"
                          value={selectedRescheduleSlot}
                          onChange={(e) => setSelectedRescheduleSlot(e.target.value)}
                          disabled={rescheduleLoading}
                        >
                          <option value="">-- Select Time Slot --</option>
                          {rescheduleSlots.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {rescheduleDate && rescheduleSlots.length === 0 && (
                      <div className="alert alert-warning border-0">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        No available slots for this date. Please select a different date.
                      </div>
                    )}
                  </div>
                  <div className="modal-footer flex-shrink-0" style={{
                    position: "sticky",
                    bottom: 0,
                    zIndex: 1,
                    backgroundColor: "#fff",
                    borderTop: "1px solid #dee2e6"
                  }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCloseReschedule}
                      disabled={rescheduleLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning"
                      onClick={handleRescheduleSubmit}
                      disabled={!rescheduleDate || !selectedRescheduleSlot || rescheduleLoading}
                    >
                      {rescheduleLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          Rescheduling...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-calendar-event me-1"></i>
                          Reschedule Appointment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
    </div>
  );
}

export default PatientAppointments;
