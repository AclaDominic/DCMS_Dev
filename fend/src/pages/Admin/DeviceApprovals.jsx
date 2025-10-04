import React, { useEffect, useState } from 'react';
import api from '../../api/api';

const DeviceApprovals = () => {
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
    <div 
      className="device-approvals-page"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        minHeight: '100vh',
        width: '100vw',
        position: 'relative',
        left: 0,
        right: 0,
        padding: '1.5rem 2rem',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Section */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4 gap-3">
        <div>
          <h2 className="m-0 fw-bold" style={{ color: '#1e293b' }}>
            📱 Device Approvals
          </h2>
          <p className="text-muted mb-0 mt-1">Review and approve staff device registrations</p>
        </div>
        <div className="d-flex align-items-center">
          <span className="badge bg-primary fs-6">
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
                <h3 className="text-muted mb-3">No devices pending approval</h3>
                <p className="text-muted mb-4 fs-5">All staff devices have been reviewed and approved.</p>
              </div>
            </div>
          ) : (
            <div className="table-responsive" style={{ width: '100%' }}>
              <table className="table table-hover mb-0" style={{ width: '100%' }}>
                <thead className="table-primary">
                  <tr>
                    <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem', width: '5%' }}>
                      <i className="bi bi-hash me-2"></i>#
                    </th>
                    <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem', width: '20%' }}>
                      <i className="bi bi-person me-2"></i>Staff Name
                    </th>
                    <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem', width: '25%' }}>
                      <i className="bi bi-fingerprint me-2"></i>Fingerprint
                    </th>
                    <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem', width: '15%' }}>
                      <i className="bi bi-key me-2"></i>Temp Code
                    </th>
                    <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem', width: '20%' }}>
                      <i className="bi bi-laptop me-2"></i>Device Name
                    </th>
                    <th className="fw-semibold px-4 py-3 border-0 text-center" style={{ fontSize: '1.1rem', width: '15%' }}>
                      <i className="bi bi-gear me-2"></i>Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device, i) => (
                    <tr key={device.id} className="align-middle" style={{ height: '60px' }}>
                      <td className="px-4 py-3 border-0 text-center" style={{ fontSize: '1rem' }}>
                        <span className="badge bg-secondary">{i + 1}</span>
                      </td>
                      <td className="px-4 py-3 fw-medium border-0" style={{ fontSize: '1rem' }}>
                        <div className="d-flex align-items-center">
                          <div className="bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" 
                               style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                            <i className="bi bi-person text-white"></i>
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{device.staff_name}</div>
                            <small className="text-muted">Staff Member</small>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                        <div className="text-truncate" style={{ maxWidth: '200px' }} title={device.device_fingerprint}>
                          <code className="text-muted small">{device.device_fingerprint}</code>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                        <span className="badge bg-warning text-dark">{device.temporary_code}</span>
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

export default DeviceApprovals;
