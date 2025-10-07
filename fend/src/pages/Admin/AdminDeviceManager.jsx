import { useState } from "react";
import DeviceApprovalsTab from "../../components/Admin/DeviceApprovalsTab";
import ApprovedDevicesTab from "../../components/Admin/ApprovedDevicesTab";

function AdminDeviceManager() {
  const [activeTab, setActiveTab] = useState("approvals");

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
      <i className={`bi bi-${icon === "📱" ? "phone" : "check-circle"} me-2`}></i>
      <span className="d-none d-sm-inline">{label}</span>
      <span className="d-sm-none">{label.split(' ')[0]}</span>
    </button>
  );

  return (
    <div 
      className="admin-device-manager-page"
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
            <div className="card-header bg-primary text-white border-0" style={{ borderRadius: '16px 16px 0 0' }}>
              <h2 className="card-title mb-0 fw-bold">
                <i className="bi bi-phone me-2"></i>
                Admin Device Management
              </h2>
              <p className="mb-0 mt-2 opacity-75">Comprehensive device approval and management system</p>
            </div>
            <div className="card-body p-4" style={{ width: '100%', maxWidth: '100%' }}>
              {/* Responsive Tab Navigation */}
              <div className="d-flex flex-column flex-sm-row gap-2 mb-4" role="group" aria-label="Device tabs">
                <TabButton id="approvals" icon="📱" label="Device Approvals" />
                <TabButton id="approved" icon="✅" label="Approved Devices" />
              </div>

              <div className="tab-content" style={{ width: '100%', maxWidth: '100%' }}>
                {activeTab === "approvals" && (
                  <div className="tab-pane fade show active" style={{ width: '100%', maxWidth: '100%' }}>
                    <DeviceApprovalsTab />
                  </div>
                )}
                {activeTab === "approved" && (
                  <div className="tab-pane fade show active" style={{ width: '100%', maxWidth: '100%' }}>
                    <ApprovedDevicesTab />
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

export default AdminDeviceManager;
