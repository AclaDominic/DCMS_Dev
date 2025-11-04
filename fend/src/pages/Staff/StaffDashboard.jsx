import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { getFingerprint } from "../../utils/getFingerprint";

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [todayVisits, setTodayVisits] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const [pendingVisits, setPendingVisits] = useState(0);
  const [remindersCount, setRemindersCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const checkDevice = async () => {
      try {
        const fingerprint = await getFingerprint();
        api.defaults.headers.common["X-Device-Fingerprint"] = fingerprint;
        const res = await api.get("/api/device-status", {
          headers: {
            "X-Device-Fingerprint": fingerprint,
          },
        });
        setStatus(res.data);
      } catch (err) {
        console.error("Device check failed", err);
      }
    };

    checkDevice();
  }, []);

  const fetchStatistics = useCallback(async () => {
    setLoadingStats(true);
    try {
      // Fetch visit statistics from dedicated endpoint
      const visitsStatsRes = await api.get("/api/visits/stats");
      setTodayVisits(visitsStatsRes.data.today_visits || 0);
      setPendingVisits(visitsStatsRes.data.pending_visits || 0);

      // Fetch pending appointments
      const appointmentsRes = await api.get("/api/appointments?status=pending");
      setPendingAppointments(appointmentsRes.data.length || 0);

      // Fetch remindable appointments
      const remindersRes = await api.get("/api/appointments/remindable");
      setRemindersCount(remindersRes.data.length || 0);
    } catch (err) {
      console.error("Failed to load statistics", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch statistics when device is approved
  useEffect(() => {
    if (status && status.approved) {
      fetchStatistics();
    }
  }, [status, fetchStatistics]);

  if (!status) return <p>Loading dashboard...</p>;

  if (!status.approved) {
    const wasRejected = !status.temporary_code;
    return (
      <div className="alert alert-warning">
        {wasRejected ? (
          <>
            ❌ <strong>This device has been rejected by the admin.</strong>
            <br />
            If you believe this was a mistake, please contact the admin for
            clarification.
          </>
        ) : (
          <>
            🚫 <strong>This device is not yet approved.</strong>
            <br />
            Provide the code below to the admin:
            <br />
            <strong>Temporary Code:</strong>{" "}
            <span className="badge bg-secondary">{status.temporary_code}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Welcome, Staff Member!</h2>
      <p className="text-muted mb-4">
        ✅ Your device is approved. You can now access all staff features from the menu.
      </p>

      {/* Statistics Cards */}
      <div className="row g-3 mb-4">
        {/* Today's Visits Card */}
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px', cursor: 'pointer' }}
               onClick={() => navigate('/staff/visit-tracker')}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div className="bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center flex-shrink-0" 
                     style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                  <i className="bi bi-calendar-day text-white"></i>
                </div>
                <div className="flex-grow-1 min-width-0">
                  <div className="text-muted small fw-semibold">Today's Visits</div>
                  <div className="fs-3 fw-bold text-primary">
                    {loadingStats ? '...' : todayVisits}
                  </div>
                  <small className="text-muted">Running & Finished</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Appointments Card */}
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px', cursor: 'pointer' }}
               onClick={() => navigate('/staff/appointments')}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div className="bg-warning rounded-circle me-3 d-flex align-items-center justify-content-center flex-shrink-0" 
                     style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                  <i className="bi bi-clock-history text-white"></i>
                </div>
                <div className="flex-grow-1 min-width-0">
                  <div className="text-muted small fw-semibold">Pending Appointments</div>
                  <div className="fs-3 fw-bold text-warning">
                    {loadingStats ? '...' : pendingAppointments}
                  </div>
                  <small className="text-muted">Needs approval</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Visits Card */}
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px', cursor: 'pointer' }}
               onClick={() => navigate('/staff/visit-tracker')}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div className="bg-info rounded-circle me-3 d-flex align-items-center justify-content-center flex-shrink-0" 
                     style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                  <i className="bi bi-hourglass-split text-white"></i>
                </div>
                <div className="flex-grow-1 min-width-0">
                  <div className="text-muted small fw-semibold">Pending Visits</div>
                  <div className="fs-3 fw-bold text-info">
                    {loadingStats ? '...' : pendingVisits}
                  </div>
                  <small className="text-muted">Awaiting completion</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Reminders Card */}
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px', cursor: 'pointer' }}
               onClick={() => navigate('/staff/appointment-reminders')}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div className="bg-success rounded-circle me-3 d-flex align-items-center justify-content-center flex-shrink-0" 
                     style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                  <i className="bi bi-bell text-white"></i>
                </div>
                <div className="flex-grow-1 min-width-0">
                  <div className="text-muted small fw-semibold">Appointment Reminders</div>
                  <div className="fs-3 fw-bold text-success">
                    {loadingStats ? '...' : remindersCount}
                  </div>
                  <small className="text-muted">Needs to be sent</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
