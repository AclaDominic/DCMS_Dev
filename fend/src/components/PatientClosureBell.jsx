import { useState } from "react";
import usePatientClosureAlerts from "../hooks/usePatientClosureAlerts";
import { Link } from "react-router-dom";

export default function PatientClosureBell({ withinDays = 7, impactDays = 30 }) {
  const { closures, impacts, loading, dismissed, dismissForToday } =
    usePatientClosureAlerts({ withinDays, impactDays });
  const [open, setOpen] = useState(false);

  const hasPersonal = impacts.length > 0;
  const hasGeneral  = closures.length > 0;
  const hasAlerts   = !loading && (hasPersonal || hasGeneral) && !dismissed;

  return (
    <div className="position-relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="btn d-inline-flex align-items-center"
        title="Notifications"
        aria-label="Notifications"
        style={{
          background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
          border: 'none',
          color: 'white',
          borderRadius: '8px',
          padding: '0.5rem 0.75rem',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'linear-gradient(135deg, #0096c7 0%, #0056b3 100%)';
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        <span role="img" aria-label="bell">🔔</span>
        {hasAlerts && <span className="badge ms-2" style={{
          backgroundColor: '#dc3545',
          color: 'white',
          fontSize: '0.7rem',
          fontWeight: '600'
        }}>●</span>}
      </button>

      {open && (
        <div className="position-absolute end-0 mt-2" style={{ width: 340, zIndex: 1050 }}>
          <div className="card shadow" style={{ borderRadius: '12px', border: 'none' }}>
            <div className="card-header py-3" style={{
              background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
              color: 'white',
              borderRadius: '12px 12px 0 0'
            }}>
              <strong style={{ fontSize: '1.1rem' }}>Notifications</strong>
              <div className="small" style={{ opacity: 0.9 }}>Closures & affected appointments</div>
            </div>

            <div className="list-group list-group-flush" style={{ maxHeight: 340, overflow: "auto" }}>
              {loading && (
                <div className="list-group-item small text-muted p-3" style={{ textAlign: 'center' }}>
                  <i className="bi bi-hourglass-split me-2"></i>Loading…
                </div>
              )}

              {!loading && hasPersonal && (
                <>
                  <div className="list-group-item small fw-semibold p-3" style={{ 
                    backgroundColor: '#f8f9fa', 
                    color: '#495057',
                    borderBottom: '1px solid #e9ecef'
                  }}>
                    <i className="bi bi-calendar-x me-2"></i>Your appointments affected
                  </div>
                  {impacts.map((it, idx) => (
                    <div key={idx} className="list-group-item small p-3" style={{
                      borderLeft: 'none',
                      borderRight: 'none',
                      borderBottom: '1px solid #f1f3f4',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                    }}
                    >
                      <div className="fw-semibold mb-1" style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                        {it.date} {it.time_slot ? `(${it.time_slot})` : ""}
                      </div>
                      <div className="text-muted mb-2" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                        Clinic closed{it.closure_message ? ` — ${it.closure_message}` : ""}.
                      </div>
                      <div>
                        <Link 
                          to={`/patient/appointments`} 
                          className="btn btn-sm p-0"
                          style={{
                            color: '#00b4d8',
                            background: 'transparent',
                            border: 'none',
                            fontWeight: '600',
                            fontSize: '0.8rem'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.color = '#0077b6';
                            e.target.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.color = '#00b4d8';
                            e.target.style.textDecoration = 'none';
                          }}
                        >
                          View / reschedule
                        </Link>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {!loading && hasGeneral && (
                <>
                  <div className="list-group-item small fw-semibold p-3" style={{ 
                    backgroundColor: '#f8f9fa', 
                    color: '#495057',
                    borderBottom: '1px solid #e9ecef'
                  }}>
                    <i className="bi bi-building me-2"></i>Upcoming clinic closures
                  </div>
                  {closures.map((c, idx) => (
                    <div key={idx} className="list-group-item small p-3" style={{
                      borderLeft: 'none',
                      borderRight: 'none',
                      borderBottom: '1px solid #f1f3f4',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                    }}
                    >
                      <div className="fw-semibold mb-1" style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                        {c.date}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                        {c.closure_message || "Clinic closed"}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {!loading && !hasPersonal && !hasGeneral && (
                <div className="list-group-item small text-muted p-4" style={{ textAlign: 'center' }}>
                  <i className="bi bi-bell-slash display-6 d-block mb-2 text-muted"></i>
                  No notifications.
                </div>
              )}
            </div>

            {(hasPersonal || hasGeneral) && (
              <div className="card-footer py-3 text-end" style={{
                background: '#f8f9fa',
                borderRadius: '0 0 12px 12px',
                borderTop: '1px solid #e9ecef'
              }}>
                <button 
                  className="btn btn-sm"
                  onClick={() => { dismissForToday(); setOpen(false); }}
                  style={{
                    color: '#6c757d',
                    background: 'transparent',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '0.8rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = '#495057';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#6c757d';
                  }}
                >
                  Dismiss for today
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
