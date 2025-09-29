import { useState } from "react";
import ClinicCalendarManager from "./ClinicCalendarManager";
import WeeklyScheduleManager from "./WeeklyScheduleManager";
import CapacityPlanner from "./CapacityPlanner"; // NEW: 14-day capacity editor

function ScheduleManager() {
  // tabs: "calendar" | "weekly" | "capacity"
  const [activeTab, setActiveTab] = useState("calendar");

  const TabButton = ({ id, icon, label }) => (
    <button
      className={`btn btn-${activeTab === id ? "primary" : "outline-primary"}`}
      onClick={() => setActiveTab(id)}
      type="button"
    >
      <i className={`bi bi-${icon === "📅" ? "calendar" : icon === "🔁" ? "arrow-repeat" : "bar-chart"} me-2`}></i>
      {label}
    </button>
  );

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-primary text-white">
              <h2 className="card-title mb-0">
                <i className="bi bi-calendar3 me-2"></i>
                Clinic Schedule Management
              </h2>
            </div>
            <div className="card-body">
              <div className="btn-group mb-4" role="group" aria-label="Schedule tabs">
                <TabButton id="calendar" icon="📅" label="Calendar Overrides" />
                <TabButton id="weekly" icon="🔁" label="Weekly Defaults" />
                <TabButton id="capacity" icon="📊" label="Capacity (14 days)" />
              </div>

              <div className="tab-content">
                {activeTab === "calendar" && (
                  <div className="tab-pane fade show active">
                    <ClinicCalendarManager />
                  </div>
                )}
                {activeTab === "weekly" && (
                  <div className="tab-pane fade show active">
                    <WeeklyScheduleManager />
                  </div>
                )}
                {activeTab === "capacity" && (
                  <div className="tab-pane fade show active">
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

export default ScheduleManager;
