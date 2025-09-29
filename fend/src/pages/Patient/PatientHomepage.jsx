import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";

function PatientHomepage() {
  const [user, setUser] = useState(null);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [paying, setPaying] = useState(null); // appointment_id being processed

  useEffect(() => {
    fetchUserData();
    fetchRecentAppointments();
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

  if (loading) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  return (
    <div className="container-fluid py-4">
      {/* Welcome Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-primary text-white">
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
                <div className="btn btn-primary">
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
                <div className="btn btn-success">
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
                <div className="btn btn-info">
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
                <Link to="/patient/appointments" className="btn btn-outline-primary btn-sm">
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
                  <Link to="/patient/appointment" className="btn btn-primary">
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
                      {recentAppointments.map((appointment) => (
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
                            {appointment.payment_method === "maya" && 
                             appointment.payment_status === "awaiting_payment" &&
                             appointment.status === "approved" && (
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={() => handlePayNow(appointment.id)}
                                disabled={paying === appointment.id}
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
                  <i className="bi bi-tooth fs-1 text-primary opacity-25"></i>
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
