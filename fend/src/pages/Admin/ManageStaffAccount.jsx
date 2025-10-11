import { useState, useEffect } from "react";
import api from "../../api/api";

const ManageStaffAccount = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagination, setPagination] = useState({});

  // Create account form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  // Fetch staff accounts
  const fetchStaffAccounts = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const response = await api.get("/api/admin/staff", {
        params: {
          page,
          search: search || undefined,
        },
      });
      setStaffList(response.data.data);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        per_page: response.data.per_page,
        total: response.data.total,
      });
      setTotalPages(response.data.last_page);
    } catch (err) {
      console.error("Failed to fetch staff accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "manage") {
      fetchStaffAccounts(currentPage, searchTerm);
    }
  }, [activeTab, currentPage, searchTerm]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setErrors({});

    try {
      const res = await api.post("/api/admin/staff", form);
      setMessage("✅ Staff account created successfully!");
      setForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
      });
      // Refresh staff list if on manage tab
      if (activeTab === "manage") {
        fetchStaffAccounts(currentPage, searchTerm);
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setMessage("❌ Something went wrong.");
      }
    }
  };

  const handleToggleStatus = async (staffId, currentStatus) => {
    if (!confirm(`Are you sure you want to ${currentStatus === 'activated' ? 'deactivate' : 'activate'} this staff account?`)) {
      return;
    }

    try {
      await api.post(`/api/admin/staff/${staffId}/toggle-status`);
      setMessage(`✅ Staff account ${currentStatus === 'activated' ? 'deactivated' : 'activated'} successfully!`);
      fetchStaffAccounts(currentPage, searchTerm);
    } catch (err) {
      setMessage("❌ Failed to update staff account status.");
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          className={`btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="d-flex justify-content-center gap-2 mt-3">
        {pages}
      </div>
    );
  };

  return (
    <div 
      className="manage-staff-page"
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
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="m-0 fw-bold" style={{ color: '#1e293b' }}>
            <i className="bi bi-people me-2"></i>
            Manage Staff Accounts
          </h2>
          <p className="text-muted mb-0 mt-1">Create new staff accounts and manage existing ones</p>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`} role="alert">
          <div className="d-flex align-items-center">
            <span className="me-2">ℹ️</span>
            {message}
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setMessage(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
        <div className="card-body p-0">
          <ul className="nav nav-tabs border-0" id="staffTabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === "create" ? "active" : ""}`}
                onClick={() => setActiveTab("create")}
                style={{
                  border: 'none',
                  borderRadius: '16px 16px 0 0',
                  fontWeight: '600',
                  padding: '1rem 1.5rem',
                  color: activeTab === "create" ? '#3b82f6' : '#6b7280',
                  backgroundColor: activeTab === "create" ? 'white' : 'transparent',
                }}
              >
                <i className="bi bi-person-plus me-2"></i>
                Create Staff Account
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === "manage" ? "active" : ""}`}
                onClick={() => setActiveTab("manage")}
                style={{
                  border: 'none',
                  borderRadius: '16px 16px 0 0',
                  fontWeight: '600',
                  padding: '1rem 1.5rem',
                  color: activeTab === "manage" ? '#3b82f6' : '#6b7280',
                  backgroundColor: activeTab === "manage" ? 'white' : 'transparent',
                }}
              >
                <i className="bi bi-gear me-2"></i>
                Manage Staff Accounts
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "create" && (
          <div className="row g-2 g-md-3 g-lg-4">
            <div className="col-12 col-lg-8 col-xl-6">
              <div className="card border-0 shadow-sm" style={{ 
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: '16px'
              }}>
                <div className="card-body p-4">
                  <h5 className="card-title mb-4 fw-bold" style={{ color: '#1e293b' }}>
                    <i className="bi bi-person-plus me-2"></i>
                    Staff Account Details
                  </h5>
                  
                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-medium">Full Name</label>
                        <input
                          name="name"
                          className="form-control border-0 shadow-sm"
                          style={{ borderRadius: '8px', padding: '12px 16px' }}
                          value={form.name}
                          onChange={handleChange}
                          placeholder="e.g. Jane Dela Cruz"
                          required
                        />
                        {errors.name && <div className="text-danger mt-1 small">{errors.name[0]}</div>}
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-medium">Email Address</label>
                        <input
                          name="email"
                          type="email"
                          className="form-control border-0 shadow-sm"
                          style={{ borderRadius: '8px', padding: '12px 16px' }}
                          value={form.email}
                          onChange={handleChange}
                          placeholder="e.g. jane.staff@clinic.com"
                          required
                        />
                        {errors.email && <div className="text-danger mt-1 small">{errors.email[0]}</div>}
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label fw-medium">Password</label>
                        <input
                          name="password"
                          type="password"
                          className="form-control border-0 shadow-sm"
                          style={{ borderRadius: '8px', padding: '12px 16px' }}
                          value={form.password}
                          onChange={handleChange}
                          placeholder="Enter password"
                          required
                        />
                        {errors.password && (
                          <div className="text-danger mt-1 small">{errors.password[0]}</div>
                        )}
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label fw-medium">Confirm Password</label>
                        <input
                          name="password_confirmation"
                          type="password"
                          className="form-control border-0 shadow-sm"
                          style={{ borderRadius: '8px', padding: '12px 16px' }}
                          value={form.password_confirmation}
                          onChange={handleChange}
                          placeholder="Re-enter password"
                          required
                        />
                      </div>

                      <div className="col-12">
                        <button 
                          className="btn w-100 border-0 shadow-sm" 
                          type="submit"
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            color: 'white',
                            borderRadius: '8px',
                            padding: '12px 24px',
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <i className="bi bi-person-plus me-2"></i>
                          Register Staff Member
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "manage" && (
          <div className="card border-0 shadow-sm" style={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px'
          }}>
            <div className="card-body p-4">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
                <h5 className="card-title mb-0 fw-bold" style={{ color: '#1e293b' }}>
                  <i className="bi bi-gear me-2"></i>
                  Staff Accounts ({pagination.total || 0})
                </h5>
                
                {/* Search Bar */}
                <div className="d-flex gap-2">
                  <div className="input-group" style={{ minWidth: '300px' }}>
                    <span className="input-group-text border-0 bg-light">
                      <i className="bi bi-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-0 bg-light"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={handleSearch}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading staff accounts...</p>
                </div>
              ) : staffList.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-people text-muted" style={{ fontSize: '3rem' }}></i>
                  <p className="text-muted mt-3">No staff accounts found</p>
                </div>
              ) : (
                <>
                  {/* Staff Table */}
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffList.map((staff) => (
                          <tr key={staff.id}>
                            <td className="fw-medium">{staff.name}</td>
                            <td>{staff.email}</td>
                            <td>
                              <span className={`badge ${staff.status === 'activated' ? 'bg-success' : 'bg-danger'}`}>
                                {staff.status}
                              </span>
                            </td>
                            <td>{new Date(staff.created_at).toLocaleDateString()}</td>
                            <td>
                              <button
                                className={`btn btn-sm ${
                                  staff.status === 'activated' ? 'btn-outline-danger' : 'btn-outline-success'
                                }`}
                                onClick={() => handleToggleStatus(staff.id, staff.status)}
                                title={staff.status === 'activated' ? 'Deactivate Account' : 'Activate Account'}
                              >
                                <i className={`bi ${staff.status === 'activated' ? 'bi-person-x' : 'bi-person-check'}`}></i>
                                {staff.status === 'activated' ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {renderPagination()}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageStaffAccount;
