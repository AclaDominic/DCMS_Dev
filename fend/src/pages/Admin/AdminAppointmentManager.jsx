import { useState } from "react";
import StaffAppointmentManager from "../Staff/StaffAppointmentManager";
import VisitTrackerManager from "../../components/Staff/VisitTrackerManager";

function AdminAppointmentManager() {
  const [activeTab, setActiveTab] = useState("appointments");

  const TabButton = ({ id, icon, label }) => (
    <button
      className={`btn flex-fill flex-sm-grow-0 border-0 shadow-sm ${
        activeTab === id ? "" : "btn-outline-primary"
      }`}
      onClick={() => setActiveTab(id)}
      type="button"
      style={{
        background: activeTab === id 
          ? 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
          : 'transparent',
        color: activeTab === id ? '#1e293b' : '#6b7280',
        border: activeTab === id ? '1px solid #e2e8f0' : '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '12px 16px',
        fontWeight: '600',
        transition: 'all 0.3s ease',
        minWidth: '140px'
      }}
    >
      <i className={`bi bi-${icon === "📅" ? "calendar" : icon === "👥" ? "people" : "calendar-check"} me-2`}></i>
      <span className="d-none d-sm-inline">{label}</span>
      <span className="d-sm-none">{label.split(' ')[0]}</span>
    </button>
  );

  return (
    <div 
      className="admin-appointment-manager-page"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100%',
        padding: '1.5rem',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <div className="row g-2 g-md-3 g-lg-4 m-0">
        <div className="col-12 p-0">
          <div className="card border-0 shadow-sm" style={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '100%'
          }}>
            <div className="card-header border-0" style={{ 
              borderRadius: '16px 16px 0 0',
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              color: '#1e293b'
            }}>
              <h2 className="card-title mb-0 fw-bold" style={{ color: '#1e293b' }}>
                <i className="bi bi-calendar-check me-2"></i>
                Admin Appointment & Visit Management
              </h2>
              <p className="mb-0 mt-2" style={{ color: '#6b7280' }}>Comprehensive appointment approval and patient visit tracking system</p>
            </div>
            <div className="card-body p-4" style={{ width: '100%', maxWidth: '100%' }}>
              {/* Responsive Tab Navigation */}
              <div className="d-flex flex-column flex-sm-row gap-2 mb-4" role="group" aria-label="Appointment tabs">
                <TabButton id="appointments" icon="📅" label="Appointment Approval" />
                <TabButton id="visits" icon="👥" label="Visit Tracking" />
              </div>

              <div className="tab-content" style={{ width: '100%', maxWidth: '100%' }}>
                {activeTab === "appointments" && (
                  <div className="tab-pane fade show active" style={{ width: '100%', maxWidth: '100%' }}>
                    <StaffAppointmentManager />
                  </div>
                )}
                {activeTab === "visits" && (
                  <div className="tab-pane fade show active" style={{ width: '100%', maxWidth: '100%' }}>
                    <VisitTrackerManager />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminAppointmentManager;
