import { useEffect, useState } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function RefundRequestManager() {
  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const loadRefundRequests = async () => {
    setLoading(true);
    try {
      const params = filterStatus !== "all" ? { status: filterStatus } : {};
      const { data } = await api.get("/api/admin/refund-requests", { params });
      setRefundRequests(data);
    } catch (e) {
      console.error("Failed to load refund requests", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefundRequests();
  }, [filterStatus]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await api.post(`/api/admin/refund-requests/${id}/approve`, {
        admin_notes: adminNotes,
      });
      await loadRefundRequests();
      setAdminNotes("");
      setShowDetailsModal(false);
      setSelectedRequest(null);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to approve refund request.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Are you sure you want to reject this refund request?")) {
      return;
    }
    setActionLoading(id);
    try {
      await api.post(`/api/admin/refund-requests/${id}/reject`, {
        admin_notes: adminNotes,
      });
      await loadRefundRequests();
      setAdminNotes("");
      setShowDetailsModal(false);
      setSelectedRequest(null);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to reject refund request.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleProcess = async (id) => {
    setProcessing(true);
    try {
      await api.post(`/api/admin/refund-requests/${id}/process`, {
        admin_notes: adminNotes,
      });
      await loadRefundRequests();
      setAdminNotes("");
      setShowProcessModal(false);
      setSelectedRequest(null);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to process refund request.");
    } finally {
      setProcessing(false);
    }
  };

  const openDetails = (request) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || "");
    setShowDetailsModal(true);
  };

  const openProcess = (request) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || "");
    setShowProcessModal(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "warning",
      approved: "info",
      rejected: "danger",
      processed: "success",
    };
    return badges[status] || "secondary";
  };

  const formatCurrency = (amount) => {
    return `₱${Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDeadlineStatus = (request) => {
    if (!request.deadline_at) return { badge: "secondary", text: "No deadline", icon: "calendar-x" };
    
    const deadline = new Date(request.deadline_at);
    const now = new Date();
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { 
        badge: "danger", 
        text: `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`, 
        icon: "exclamation-triangle",
        isOverdue: true 
      };
    } else if (diffDays <= 2) {
      return { 
        badge: "warning", 
        text: `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`, 
        icon: "clock",
        isApproaching: true 
      };
    } else {
      return { 
        badge: "success", 
        text: `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`, 
        icon: "check-circle",
        isOnTime: true 
      };
    }
  };

  const formatDeadlineDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const statusCounts = {
    all: refundRequests.length,
    pending: refundRequests.filter((r) => r.status === "pending").length,
    approved: refundRequests.filter((r) => r.status === "approved").length,
    rejected: refundRequests.filter((r) => r.status === "rejected").length,
    processed: refundRequests.filter((r) => r.status === "processed").length,
  };

  return (
    <div
      className="refund-request-manager-page"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        minHeight: "100vh",
        width: "100%",
        padding: "1.5rem 1rem",
        boxSizing: "border-box",
      }}
    >
      <div className="container-fluid">
        {/* Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: "#1e293b" }}>
              <i className="bi bi-arrow-counterclockwise me-2"></i>
              Refund Requests
            </h2>
            <p className="text-muted mb-0">
              Manage patient refund requests and process refunds
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: "12px" }}>
          <div className="card-body p-3">
            <div className="d-flex flex-wrap gap-2">
              {[
                { key: "all", label: "All", icon: "list" },
                { key: "pending", label: "Pending", icon: "clock" },
                { key: "approved", label: "Approved", icon: "check-circle" },
                { key: "rejected", label: "Rejected", icon: "x-circle" },
                { key: "processed", label: "Processed", icon: "check2" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`btn ${
                    filterStatus === tab.key
                      ? "btn-primary"
                      : "btn-outline-primary"
                  } btn-sm`}
                  onClick={() => setFilterStatus(tab.key)}
                >
                  <i className={`bi bi-${tab.icon} me-1`}></i>
                  {tab.label}
                  {statusCounts[tab.key] > 0 && (
                    <span className="badge bg-secondary ms-2">
                      {statusCounts[tab.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Refund Requests List */}
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner />
          </div>
        ) : refundRequests.length === 0 ? (
          <div className="card border-0 shadow-sm" style={{ borderRadius: "12px" }}>
            <div className="card-body text-center py-5">
              <i className="bi bi-inbox fs-1 text-muted mb-3"></i>
              <p className="text-muted mb-0">No refund requests found.</p>
            </div>
          </div>
        ) : (
          <div className="card border-0 shadow-sm" style={{ borderRadius: "12px" }}>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Patient</th>
                      <th>Appointment</th>
                      <th>Original Amount</th>
                      <th>Cancellation Fee</th>
                      <th>Refund Amount</th>
                      <th>Status</th>
                      <th>Requested At</th>
                      <th>Deadline</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundRequests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <strong>#{request.id}</strong>
                        </td>
                        <td>
                          {request.patient?.user?.name ||
                            request.patient?.name ||
                            `Patient #${request.patient_id}`}
                        </td>
                        <td>
                          {request.appointment_id ? (
                            <small>
                              Appointment #{request.appointment_id}
                              <br />
                              {request.appointment?.date && (
                                <span className="text-muted">
                                  {new Date(request.appointment.date).toLocaleDateString()}
                                </span>
                              )}
                            </small>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{formatCurrency(request.original_amount)}</td>
                        <td>{formatCurrency(request.cancellation_fee)}</td>
                        <td>
                          <strong className="text-success">
                            {formatCurrency(request.refund_amount)}
                          </strong>
                        </td>
                        <td>
                          <span
                            className={`badge bg-${getStatusBadge(request.status)}`}
                          >
                            {request.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <small>{formatDate(request.requested_at)}</small>
                        </td>
                        <td>
                          {request.deadline_at && (
                            <div>
                              <small className="d-block text-muted mb-1">
                                {formatDeadlineDate(request.deadline_at)}
                              </small>
                              {(() => {
                                const deadlineStatus = getDeadlineStatus(request);
                                return (
                                  <span
                                    className={`badge bg-${deadlineStatus.badge} d-inline-flex align-items-center gap-1`}
                                    title={deadlineStatus.isOverdue ? "Deadline has passed" : deadlineStatus.isApproaching ? "Approaching deadline" : "On track"}
                                  >
                                    <i className={`bi bi-${deadlineStatus.icon}`}></i>
                                    {deadlineStatus.text}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                          {!request.deadline_at && <span className="text-muted">—</span>}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-outline-info"
                              onClick={() => openDetails(request)}
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            {request.status === "pending" && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() => handleApprove(request.id)}
                                  disabled={actionLoading === request.id}
                                  title="Approve"
                                >
                                  {actionLoading === request.id ? (
                                    <span
                                      className="spinner-border spinner-border-sm"
                                      role="status"
                                    ></span>
                                  ) : (
                                    <i className="bi bi-check"></i>
                                  )}
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleReject(request.id)}
                                  disabled={actionLoading === request.id}
                                  title="Reject"
                                >
                                  <i className="bi bi-x"></i>
                                </button>
                              </>
                            )}
                            {request.status === "approved" && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => openProcess(request)}
                                title="Mark as Processed"
                              >
                                <i className="bi bi-check2-circle"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedRequest && (
          <div
            className="modal d-block"
            tabIndex="-1"
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1050,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    Refund Request #{selectedRequest.id} Details
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedRequest(null);
                      setAdminNotes("");
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <strong>Status:</strong>
                      <br />
                      <span
                        className={`badge bg-${getStatusBadge(
                          selectedRequest.status
                        )}`}
                      >
                        {selectedRequest.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="col-md-4">
                      <strong>Requested At:</strong>
                      <br />
                      {formatDate(selectedRequest.requested_at)}
                    </div>
                    <div className="col-md-4">
                      <strong>Processing Deadline:</strong>
                      <br />
                      {selectedRequest.deadline_at ? (
                        <div>
                          <div className="mb-1">
                            {formatDeadlineDate(selectedRequest.deadline_at)}
                          </div>
                          {(() => {
                            const deadlineStatus = getDeadlineStatus(selectedRequest);
                            return (
                              <span
                                className={`badge bg-${deadlineStatus.badge} d-inline-flex align-items-center gap-1`}
                              >
                                <i className={`bi bi-${deadlineStatus.icon}`}></i>
                                {deadlineStatus.text}
                              </span>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-muted">No deadline set</span>
                      )}
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <strong>Patient:</strong>
                      <br />
                      {selectedRequest.patient?.user?.name ||
                        selectedRequest.patient?.name ||
                        `Patient #${selectedRequest.patient_id}`}
                    </div>
                    <div className="col-md-6">
                      <strong>Appointment:</strong>
                      <br />
                      {selectedRequest.appointment_id
                        ? `#${selectedRequest.appointment_id}`
                        : "—"}
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <strong>Original Amount:</strong>
                      <br />
                      {formatCurrency(selectedRequest.original_amount)}
                    </div>
                    <div className="col-md-4">
                      <strong>Cancellation Fee:</strong>
                      <br />
                      {formatCurrency(selectedRequest.cancellation_fee)}
                    </div>
                    <div className="col-md-4">
                      <strong>Refund Amount:</strong>
                      <br />
                      <span className="text-success fw-bold">
                        {formatCurrency(selectedRequest.refund_amount)}
                      </span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <strong>Reason:</strong>
                    <br />
                    <p className="border rounded p-2 bg-light">
                      {selectedRequest.reason || "—"}
                    </p>
                  </div>
                  {selectedRequest.admin_notes && (
                    <div className="mb-3">
                      <strong>Admin Notes:</strong>
                      <br />
                      <p className="border rounded p-2 bg-light">
                        {selectedRequest.admin_notes}
                      </p>
                    </div>
                  )}
                  {(selectedRequest.status === "pending" ||
                    selectedRequest.status === "approved") && (
                    <div className="mb-3">
                      <label className="form-label">
                        <strong>Admin Notes:</strong>
                      </label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add notes about this refund request..."
                      />
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedRequest(null);
                      setAdminNotes("");
                    }}
                  >
                    Close
                  </button>
                  {selectedRequest.status === "pending" && (
                    <>
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => handleApprove(selectedRequest.id)}
                        disabled={actionLoading === selectedRequest.id}
                      >
                        {actionLoading === selectedRequest.id ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                            ></span>
                            Approving...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check me-2"></i>
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleReject(selectedRequest.id)}
                        disabled={actionLoading === selectedRequest.id}
                      >
                        <i className="bi bi-x me-2"></i>
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Process Modal */}
        {showProcessModal && selectedRequest && (
          <div
            className="modal d-block"
            tabIndex="-1"
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1050,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    Process Refund Request #{selectedRequest.id}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => {
                      setShowProcessModal(false);
                      setSelectedRequest(null);
                      setAdminNotes("");
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <strong>Refund Amount:</strong>{" "}
                    {formatCurrency(selectedRequest.refund_amount)}
                  </div>
                  <p>
                    Mark this refund request as processed after completing the
                    refund transaction.
                  </p>
                  <div className="mb-3">
                    <label className="form-label">
                      <strong>Admin Notes (optional):</strong>
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about the refund processing..."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowProcessModal(false);
                      setSelectedRequest(null);
                      setAdminNotes("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleProcess(selectedRequest.id)}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        ></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle me-2"></i>
                        Mark as Processed
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
