import React, { useEffect, useState } from 'react';
import api from '../../api/api';

const DeviceApprovalsTab = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approveLabels, setApproveLabels] = useState({});

  const fetchDevices = async () => {
    try {
      const res = await api.get('/api/admin/pending-devices');
      console.log('Pending devices:', res.data);
      setDevices(res.data);
    } catch (error) {
      console.error('Failed to load pending devices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleApprove = async (deviceId) => {
    try {
      await api.post('/api/admin/approve-device', {
        device_id: deviceId,
        device_name: approveLabels[deviceId] || ''
      });
      fetchDevices(); // Refresh list
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleReject = async (deviceId) => {
    try {
      await api.post('/api/admin/reject-device', {
        device_id: deviceId,
      });
      fetchDevices(); // Refresh list
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  return (
    <div>
      {/* Header Section */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4 gap-3">
        <div>
          <h3 className="m-0 fw-bold" style={{ color: '#1e293b' }}>
            📱 Pending Device Approvals
          </h3>
          <p className="text-muted mb-0 mt-1">Review and approve staff device registrations</p>
        </div>
        <div className="d-flex align-items-center">
          <span className="badge bg-warning fs-6">
            {devices.length} pending approval{devices.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Device Approvals Table */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
        <div className="card-body p-0">
          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
              <div className="text-center">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted">Loading pending devices...</p>
              </div>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center text-muted" style={{ height: '400px' }}>
              <div className="d-flex flex-column align-items-center justify-content-center py-5">
                <div className="bg-light rounded-circle mb-4 d-flex align-items-center justify-content-center" 
                     style={{ width: '120px', height: '120px', fontSize: '3rem' }}>
                  📱
                </div>
                <h4 className="text-muted mb-3">No devices pending approval</h4>
                <p className="text-muted mb-4 fs-5">All staff devices have been reviewed and approved.</p>
              </div>
            </div>
          ) : (
            <div className="table-responsive" style={{ width: '100%' }}>
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4 py-3 border-0 fw-semibold" style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      Staff Member
                    </th>
                    <th className="px-4 py-3 border-0 fw-semibold" style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      Device Info
                    </th>
                    <th className="px-4 py-3 border-0 fw-semibold" style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      Request Date
                    </th>
                    <th className="px-4 py-3 border-0 fw-semibold" style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      Device Name
                    </th>
                    <th className="px-4 py-3 border-0 fw-semibold text-center" style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => (
                    <tr key={device.id} className="border-bottom">
                      <td className="px-4 py-3 border-0">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" 
                               style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                            <i className="bi bi-person text-white"></i>
                          </div>
                          <div>
                            <div className="fw-semibold" style={{ fontSize: '1rem', color: '#1e293b' }}>
                              {device.staff_name}
                            </div>
                            <div className="text-muted small">
                              {device.staff_role}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-0">
                        <div>
                          <div className="fw-medium" style={{ fontSize: '0.9rem', color: '#374151' }}>
                            {device.device_type || 'Unknown Device'}
                          </div>
                          <div className="text-muted small font-monospace">
                            {device.device_fingerprint?.substring(0, 20)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-0" style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        {new Date(device.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                        <input
                          type="text"
                          className="form-control border-0 shadow-sm"
                          style={{ borderRadius: '8px', padding: '8px 12px', fontSize: '0.9rem' }}
                          placeholder="e.g. Front Desk PC"
                          value={approveLabels[device.id] || ''}
                          onChange={(e) =>
                            setApproveLabels((prev) => ({
                              ...prev,
                              [device.id]: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td className="px-4 py-3 border-0 text-center" style={{ fontSize: '1rem' }}>
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-sm btn-success me-1"
                            onClick={() => handleApprove(device.id)}
                            style={{ borderRadius: '8px' }}
                            title="Approve device"
                          >
                            <i className="bi bi-check-circle"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleReject(device.id)}
                            style={{ borderRadius: '8px' }}
                            title="Reject device"
                          >
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </div>
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
  );
};

export default DeviceApprovalsTab;
