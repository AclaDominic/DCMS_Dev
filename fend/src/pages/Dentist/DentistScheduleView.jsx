import { useState } from "react";
import ClinicCalendarManager from "../Admin/ClinicCalendarManager";
import WeeklyScheduleManager from "../Admin/WeeklyScheduleManager";
import CapacityPlanner from "../Admin/CapacityPlanner";

function DentistScheduleView() {
  // tabs: "calendar" | "weekly" | "capacity"
  const [activeTab, setActiveTab] = useState("calendar");

  const TabButton = ({ id, icon, label }) => (
    <button
      className={`btn flex-fill flex-sm-grow-0 border-0 shadow-sm ${
        activeTab === id ? "" : "btn-outline-primary"
      }`}
      onClick={() => setActiveTab(id)}
      type="button"
      style={{
        background: activeTab === id 
          ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
          : 'transparent',
        color: activeTab === id ? 'white' : '#3b82f6',
        border: activeTab === id ? 'none' : '1px solid #3b82f6',
        borderRadius: '8px',
        padding: '12px 16px',
        fontWeight: '600',
        transition: 'all 0.3s ease',
        minWidth: '140px'
      }}
    >
      <i className={`bi bi-${icon === "📅" ? "calendar" : icon === "🔁" ? "arrow-repeat" : "bar-chart"} me-2`}></i>
      <span className="d-none d-sm-inline">{label}</span>
      <span className="d-sm-none">{label.split(' ')[0]}</span>
    </button>
  );

  return (
    <div 
      className="schedule-manager-page"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        minHeight: '100vh',
        padding: '2rem 0'
      }}
    >
      <div className="container-fluid px-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2 className="h3 mb-1 fw-bold text-dark">
                  <i className="bi bi-calendar-check me-2 text-primary"></i>
                  Clinic Schedule
                </h2>
                <p className="text-muted mb-0">
                  View clinic operating hours and capacity settings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex flex-column flex-sm-row gap-2">
              <TabButton id="calendar" icon="📅" label="Calendar Overrides" />
              <TabButton id="weekly" icon="🔁" label="Weekly Defaults" />
              <TabButton id="capacity" icon="📊" label="Capacity (14 days)" />
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-lg" style={{ borderRadius: '16px' }}>
              <div className="card-body p-4">
                {activeTab === "calendar" && (
                  <div>
                    <div className="d-flex align-items-center mb-4">
                      <div className="bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" 
                           style={{ width: '48px', height: '48px' }}>
                        <i className="bi bi-calendar text-white fs-5"></i>
                      </div>
                      <div>
                        <h4 className="mb-1 fw-bold text-dark">Calendar Overrides</h4>
                        <p className="text-muted mb-0">Manage specific date exceptions and holidays</p>
                      </div>
                    </div>
                    <ClinicCalendarManager />
                  </div>
                )}

                {activeTab === "weekly" && (
                  <div>
                    <div className="d-flex align-items-center mb-4">
                      <div className="bg-success rounded-circle me-3 d-flex align-items-center justify-content-center" 
                           style={{ width: '48px', height: '48px' }}>
                        <i className="bi bi-arrow-repeat text-white fs-5"></i>
                      </div>
                      <div>
                        <h4 className="mb-1 fw-bold text-dark">Weekly Defaults</h4>
                        <p className="text-muted mb-0">Set regular operating hours for each day of the week</p>
                      </div>
                    </div>
                    <WeeklyScheduleManager />
                  </div>
                )}

                {activeTab === "capacity" && (
                  <div>
                    <div className="d-flex align-items-center mb-4">
                      <div className="bg-info rounded-circle me-3 d-flex align-items-center justify-content-center" 
                           style={{ width: '48px', height: '48px' }}>
                        <i className="bi bi-bar-chart text-white fs-5"></i>
                      </div>
                      <div>
                        <h4 className="mb-1 fw-bold text-dark">Capacity Planner</h4>
                        <p className="text-muted mb-0">Adjust appointment capacity for the next 14 days</p>
                      </div>
                    </div>
                    <CapacityPlanner />
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

export default DentistScheduleView;
