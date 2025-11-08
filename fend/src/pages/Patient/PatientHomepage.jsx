import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import ConfirmationModal from "../../components/ConfirmationModal";
import toast, { Toaster } from "react-hot-toast";

function PatientHomepage() {
  const [user, setUser] = useState(null);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [paying, setPaying] = useState(null); // appointment_id being processed
  const [canceling, setCanceling] = useState(null); // appointment_id being cancelled
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [pendingRefunds, setPendingRefunds] = useState([]);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [confirmingRefund, setConfirmingRefund] = useState(null);

  useEffect(() => {
    fetchUserData();
    fetchRecentAppointments();
    fetchPendingRefunds();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await api.get("/api/user");
      setUser(res.data);
    } catch (err) {
      console.error("Failed to fetch user info", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentAppointments = async () => {
    try {
      const res = await api.get("/api/user-appointments?page=1&limit=3");
      setRecentAppointments(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch appointments", err);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const fetchPendingRefunds = async () => {
    try {
      const res = await api.get("/api/refunds/pending-claims");
      setPendingRefunds(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch pending refunds", err);
    }
  };

  const nextRefund = pendingRefunds.length
    ? [...pendingRefunds].sort((a, b) => {
        if (!a.deadline_at) return 1;
        if (!b.deadline_at) return -1;
        return new Date(a.deadline_at) - new Date(b.deadline_at);
      })[0]
    : null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      approved: "success",
      pending: "warning",
      rejected: "danger",
      cancelled: "secondary",
      completed: "primary",
    };
    return statusMap[status] || "secondary";
  };

  const getPaymentStatusBadge = (status) => {
    const statusMap = {
      paid: "success",
      awaiting_payment: "warning",
      failed: "danger",
      refunded: "info",
    };
    return statusMap[status] || "secondary";
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
        toast.error("Payment link not available. Please try again.", {
          style: {
            background: '#dc3545',
            color: '#fff',
            borderRadius: '8px',
            padding: '16px',
          },
        });
      }
    } catch (err) {
      console.error("Create Maya payment failed", err);
      // surface server hint if available
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.maya?.message ||
        "Unable to start payment. Please try again.";
      toast.error(serverMsg, {
        style: {
          background: '#dc3545',
          color: '#fff',
          borderRadius: '8px',
          padding: '16px',
        },
      });
    } finally {
      setPaying(null);
    }
  };

  const handleCancelClick = (appointmentId) => {
    setSelectedAppointmentId(appointmentId);
    setShowCancelModal(true);
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointmentId) return;

    try {
      setCanceling(selectedAppointmentId);
      setShowCancelModal(false);
      await api.get("/sanctum/csrf-cookie");
      await api.post(`/api/appointment/${selectedAppointmentId}/cancel`);
      
      toast.success("Appointment cancelled successfully!", {
        style: {
          background: '#28a745',
          color: '#fff',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '16px',
        },
        duration: 4000,
      });
      
      // Refresh appointments list
      fetchRecentAppointments();
      setSelectedAppointmentId(null);
    } catch (err) {
      console.error("Cancel appointment failed", err);
      const serverMsg =
        err.response?.data?.message ||
        "Unable to cancel appointment. Please try again.";
      toast.error(serverMsg, {
        style: {
          background: '#dc3545',
          color: '#fff',
          borderRadius: '8px',
          padding: '16px',
        },
      });
    } finally {
      setCanceling(null);
    }
  };

  const openRefundModal = (refund) => {
    setSelectedRefund(refund);
    setShowRefundModal(true);
  };

  const handleConfirmRefund = async () => {
    if (!selectedRefund || confirmingRefund) return;

    try {
      setConfirmingRefund(selectedRefund.id);
      await api.get("/sanctum/csrf-cookie");
      await api.post(`/api/refunds/${selectedRefund.id}/confirm`);

      toast.success("Thanks! We've marked your refund as claimed.", {
        style: {
          background: '#28a745',
          color: '#fff',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '16px',
        },
        duration: 4000,
      });

      await fetchPendingRefunds();

      setPendingRefunds((prev) =>
        prev.filter((refund) => refund.id !== selectedRefund.id)
      );
      setShowRefundModal(false);
      setSelectedRefund(null);
    } catch (err) {
      console.error("Confirm refund failed", err);
      const serverMsg =
        err.response?.data?.message ||
        "Unable to confirm refund right now. Please try again.";
      toast.error(serverMsg, {
        style: {
          background: '#dc3545',
          color: '#fff',
          borderRadius: '8px',
          padding: '16px',
        },
      });
    } finally {
      setConfirmingRefund(null);
    }
  };

  return (
    <div className="container-fluid py-4">
      <Toaster position="top-center" />
      <ConfirmationModal
        show={showCancelModal}
        onConfirm={handleCancelAppointment}
        onCancel={() => {
          setShowCancelModal(false);
          setSelectedAppointmentId(null);
        }}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment?"
        confirmText="Yes, Cancel"
        cancelText="No, Keep It"
        variant="danger"
      />
      <ConfirmationModal
        show={showRefundModal}
        onConfirm={handleConfirmRefund}
        onCancel={() => {
          setShowRefundModal(false);
          setSelectedRefund(null);
        }}
        title="Confirm Refund Received"
        message="This action cannot be undone. Please confirm only if you have already received your refund."
        confirmText={confirmingRefund ? "Confirming..." : "Yes, I picked it up"}
        cancelText="Not yet"
        variant="primary"
      />
      {/* Welcome Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm" style={{background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)', color: 'white'}}>
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h1 className="h3 mb-2">
                    {getGreeting()}, {user?.name?.split(' ')[0] || 'Patient'}! 👋
                  </h1>
                  <p className="mb-0 opacity-75">
                    Welcome to your dental care dashboard. Manage your appointments, 
                    view your profile, and stay updated with your dental health journey.
                  </p>
                  {nextRefund && (
                    <div className="alert alert-warning bg-white text-dark mt-3 mb-0 shadow-sm border-0">
                      <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-cash-coin fs-3 text-warning"></i>
                        <div>
                          <strong>Refund waiting for pickup!</strong>
                          <div>
                            Please visit the clinic to claim ₱
                            {Number(nextRefund.refund_amount).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            on or before{" "}
                            {nextRefund.formatted_deadline ||
                              (nextRefund.deadline_at
                                ? new Date(nextRefund.deadline_at).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "N/A")}
                            . Tap the “Refunded” button below once you've picked it up so we can update our records.
                          </div>
                          {nextRefund.service_name && (
                            <small className="text-muted">
                              Service: {nextRefund.service_name}
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="d-flex flex-column align-items-md-end">
                    <div className="mb-2">
                      <i className="bi bi-calendar-check fs-1 opacity-50"></i>
                    </div>
                    <small className="opacity-75">
                      Last login: {new Date().toLocaleDateString()}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mb-4">
        <div className="col-12">
          <h2 className="h4 mb-3">Quick Actions</h2>
        </div>
        <div className="col-md-4 mb-3">
          <Link to="/patient/appointment" className="text-decoration-none">
            <div className="card h-100 border-0 shadow-sm hover-lift">
              <div className="card-body text-center p-4">
                <div className="mb-3">
                  <i className="bi bi-calendar-plus fs-1 text-primary"></i>
                </div>
                <h5 className="card-title text-dark">Book Appointment</h5>
                <p className="card-text text-muted">
                  Schedule your next dental visit with our experienced team
                </p>
                <div className="btn" style={{background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)', color: 'white', border: 'none'}}>
                  <i className="bi bi-plus-circle me-2"></i>
                  Book Now
                </div>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-4 mb-3">
          <Link to="/patient/appointments" className="text-decoration-none">
            <div className="card h-100 border-0 shadow-sm hover-lift">
              <div className="card-body text-center p-4">
                <div className="mb-3">
                  <i className="bi bi-calendar3 fs-1 text-success"></i>
                </div>
                <h5 className="card-title text-dark">My Appointments</h5>
                <p className="card-text text-muted">
                  View and manage your upcoming and past appointments
                </p>
                <div className="btn" style={{background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)', color: 'white', border: 'none'}}>
                  <i className="bi bi-list-ul me-2"></i>
                  View All
                </div>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-4 mb-3">
          <Link to="/patient/profile" className="text-decoration-none">
            <div className="card h-100 border-0 shadow-sm hover-lift">
              <div className="card-body text-center p-4">
                <div className="mb-3">
                  <i className="bi bi-person-circle fs-1 text-info"></i>
                </div>
                <h5 className="card-title text-dark">My Profile</h5>
                <p className="card-text text-muted">
                  Update your personal information and HMO details
                </p>
                <div className="btn" style={{background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)', color: 'white', border: 'none'}}>
                  <i className="bi bi-gear me-2"></i>
                  Manage
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h3 className="h5 mb-0">Recent Appointments</h3>
                <Link to="/patient/appointments" className="btn btn-sm" style={{border: '2px solid #00b4d8', color: '#00b4d8', background: 'transparent'}}>
                  View All
                </Link>
              </div>
            </div>
            <div className="card-body">
              {appointmentsLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading appointments...</p>
                </div>
              ) : recentAppointments.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-calendar-x fs-1 text-muted"></i>
                  <p className="mt-2 text-muted">No appointments yet</p>
                  <Link to="/patient/appointment" className="btn" style={{background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)', color: 'white', border: 'none'}}>
                    Book Your First Appointment
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Service</th>
                        <th>Payment Status</th>
                        <th>Appointment Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAppointments.map((appointment) => {
                        const refundForAppointment = pendingRefunds.find(
                          (refund) => refund.appointment_id === appointment.id
                        );

                        return (
                        <tr key={appointment.id}>
                          <td>
                            <div>
                              <div className="fw-medium">{appointment.date}</div>
                              <small className="text-muted">
                                {appointment.start_time}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div className="fw-medium">{appointment.service?.name || '—'}</div>
                            <small className="text-muted">
                              {appointment.payment_method}
                            </small>
                          </td>
                          <td>
                            <span className={`badge bg-${getPaymentStatusBadge(appointment.payment_status)}`}>
                              {appointment.payment_status?.replace('_', ' ') || '—'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-${getStatusBadge(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              {appointment.payment_method === "maya" && 
                               appointment.payment_status === "awaiting_payment" &&
                               appointment.status === "approved" && (
                                <button 
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handlePayNow(appointment.id)}
                                  disabled={paying === appointment.id || canceling === appointment.id}
                                >
                                  {paying === appointment.id ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                      Redirecting...
                                    </>
                                  ) : (
                                    "Pay Now"
                                  )}
                                </button>
                              )}

                              {appointment.payment_method === "maya" &&
                                appointment.payment_status === "refunded" &&
                                refundForAppointment && (
                                  <button
                                    className="btn btn-sm btn-outline-info"
                                    onClick={() => openRefundModal(refundForAppointment)}
                                    disabled={confirmingRefund === refundForAppointment.id}
                                  >
                                    {confirmingRefund === refundForAppointment.id ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <i className="bi bi-check2-circle me-1"></i>
                                        Refunded
                                      </>
                                    )}
                                  </button>
                                )}
                              
                              {/* Show cancel button for pending or (approved + unpaid) appointments */}
                              {(appointment.status === "pending" || 
                                (appointment.status === "approved" && 
                                 (appointment.payment_status === "unpaid" || appointment.payment_status === "awaiting_payment"))) && (
                                <button 
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleCancelClick(appointment.id)}
                                  disabled={canceling === appointment.id || paying === appointment.id}
                                >
                                  {canceling === appointment.id ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                      Canceling...
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-x-circle me-1"></i>
                                      Cancel
                                    </>
                                  )}
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Health Tips Section */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-light">
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h4 className="h5 mb-2">
                    <i className="bi bi-lightbulb text-warning me-2"></i>
                    Dental Health Tip
                  </h4>
                  <p className="mb-0 text-muted">
                    Remember to brush your teeth twice daily and floss regularly. 
                    Regular dental check-ups help maintain optimal oral health!
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <i className="bi bi-tooth fs-1 opacity-25" style={{color: '#00b4d8'}}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hover-lift {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
    </div>
  );
}

export default PatientHomepage;
