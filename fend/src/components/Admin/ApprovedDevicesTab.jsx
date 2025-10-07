import React, { useEffect, useState } from 'react';
import api from '../../api/api';

const ApprovedDevicesTab = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');

  const fetchDevices = async () => {
    try {
      const res = await api.get('/api/approved-devices');
      setDevices(res.data);
    } catch (err) {
      console.error('Failed to load approved devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (id) => {
    try {
      await api.put('/api/rename-device', { device_id: id, device_name: newName });
      setEditingId(null);
      setNewName('');
      fetchDevices();
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  const handleRevoke = async (id) => {
    try {
      await api.post('/api/revoke-device', { device_id: id });
      fetchDevices();
    } catch (err) {
      console.error('Revoke failed:', err);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  return (
    <div>
      {/* Header Section */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4 gap-3">
        <div>
          <h3 className="m-0 fw-bold" style={{ color: '#1e293b' }}>
            ✅ Approved Staff Devices
          </h3>
          <p className="text-muted mb-0 mt-1">Manage and monitor approved staff devices</p>
        </div>
        <div className="d-flex align-items-center">
          <span className="badge bg-success fs-6">
            {devices.length} approved device{devices.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Approved Devices Table */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
        <div className="card-body p-0">
          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
              <div className="text-center">
                <div className="spinner-border text-success mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted">Loading approved devices...</p>
              </div>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center text-muted" style={{ height: '400px' }}>
              <div className="d-flex flex-column align-items-center justify-content-center py-5">
                <div className="bg-light rounded-circle mb-4 d-flex align-items-center justify-content-center" 
                     style={{ width: '120px', height: '120px', fontSize: '3rem' }}>
                  ✅
                </div>
                <h4 className="text-muted mb-3">No approved devices</h4>
                <p className="text-muted mb-4 fs-5">No devices have been approved yet.</p>
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
                      Device Name
                    </th>
                    <th className="px-4 py-3 border-0 fw-semibold" style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      Device Fingerprint
                    </th>
                    <th className="px-4 py-3 border-0 fw-semibold" style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      Last Updated
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
                          <div className="bg-success rounded-circle d-flex align-items-center justify-content-center me-3" 
                               style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                            <i className="bi bi-person text-white"></i>
                          </div>
                          <div>
                            <div className="fw-semibold" style={{ fontSize: '1rem', color: '#1e293b' }}>
                              {device.staff_name}
                            </div>
                            <div className="text-muted small">
                              {device.staff_role || 'Staff'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-0">
                        {editingId === device.id ? (
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              placeholder="New device name"
                              style={{ maxWidth: '200px' }}
                            />
                            <button 
                              className="btn btn-success btn-sm" 
                              onClick={() => handleRename(device.id)}
                            >
                              <i className="bi bi-check"></i>
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              onClick={() => setEditingId(null)}
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          </div>
                        ) : (
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-medium" style={{ fontSize: '1rem', color: '#374151' }}>
                              {device.device_name || '(Unnamed)'}
                            </span>
                            <button 
                              className="btn btn-link btn-sm p-0" 
                              onClick={() => {
                                setEditingId(device.id);
                                setNewName(device.device_name || '');
                              }}
                              title="Edit device name"
                            >
                              <i className="bi bi-pencil text-primary"></i>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 border-0">
                        <div className="font-monospace small text-muted">
                          {device.device_fingerprint?.substring(0, 30)}...
                        </div>
                      </td>
                      <td className="px-4 py-3 border-0" style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        {new Date(device.updated_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 border-0 text-center">
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRevoke(device.id)}
                          title="Revoke device access"
                        >
                          <i className="bi bi-x-circle me-1"></i>
                          Revoke
                        </button>
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

export default ApprovedDevicesTab;
