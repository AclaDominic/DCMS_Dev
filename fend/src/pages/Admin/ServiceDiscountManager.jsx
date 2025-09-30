import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { ServiceSelectModal, EditPromoModal } from "../../components/ServiceDiscountModals";
import "./ServiceDiscountManager.css";

export default function ServiceDiscountManager() {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [form, setForm] = useState({
    start_date: "",
    end_date: "",
    discounted_price: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [overviewPromos, setOverviewPromos] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionPromo, setActionPromo] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesRes, overviewRes] = await Promise.all([
          api.get("/api/services"),
          api.get("/api/discounts-overview")
        ]);
        setServices(servicesRes.data);
        setOverviewPromos(overviewRes.data);
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    
    loadData();
  }, []);

  // Cleanup effect to restore body scroll when component unmounts
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const loadOverviewPromos = async () => {
    setOverviewLoading(true);
    try {
      const { data } = await api.get("/api/discounts-overview");
      setOverviewPromos(data || []);
    } catch (err) {
      console.error("Failed to load overview promos", err);
      setOverviewPromos([]);
    } finally {
      setOverviewLoading(false);
    }
  };


  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const savePromo = async (formData = null) => {
    const dataToSave = formData || form;
    setLoading(true);
    setErrors({});
    try {
      if (isCreatingNew) {
        // Creating new promo
        const res = await api.post(
          `/api/services/${selectedService}/discounts`,
          dataToSave
        );

        if (res.data.warning) {
          alert(
            `⚠ Promo saved, but some dates are clinic closed:\n${res.data.warning}`
          );
        }
        setShowEditModal(false);
        setIsCreatingNew(false);
      } else if (editingPromoId) {
        // Editing existing promo
        await api.put(`/api/discounts/${editingPromoId}`, dataToSave);
        setShowEditModal(false);
        setEditingPromo(null);
        setEditingPromoId(null);
      }

      // Reset form and reload overview only
      setForm({ start_date: "", end_date: "", discounted_price: "" });
      setEditMode(false);
      setSelectedService(null); // Clear selected service
      await loadOverviewPromos(); // Only reload overview
    } catch (err) {
      if (err.response?.status === 422) {
        const message = err.response.data.message;
        const fieldErrors = err.response.data.errors;

        if (message?.includes("clinic closed")) {
          alert(`❌ Cannot save promo: ${message}`);
          return; // stop here, don't reset form
        }

        setErrors(fieldErrors || { message });
        // Re-throw error for modal to handle
        throw err;
      } else {
        console.error("Unknown error", err);
        throw err;
      }
    } finally {
      setLoading(false);
    }
  };


  const selected = useMemo(() => 
    services.find((s) => s.id === Number(selectedService)), 
    [services, selectedService]
  );
  
  const openPromoCreation = useCallback(() => {
    setShowServiceModal(true);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }, []);

  const selectService = useCallback(async (serviceId) => {
    setShowServiceModal(false);
    setSelectedService(serviceId);
    setIsCreatingNew(true);
    setEditingPromo(null);
    setEditingPromoId(null);
    setShowEditModal(true);
    // Don't change table view - keep showing overview
  }, []);

  const openEditModal = useCallback((promo) => {
    setEditingPromo(promo);
    setEditingPromoId(promo.id);
    setIsCreatingNew(false);
    setShowEditModal(true);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }, []);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingPromo(null);
    setEditingPromoId(null);
    setIsCreatingNew(false);
    setSelectedService(null); // Clear selected service when closing modal
    // Restore body scroll
    document.body.style.overflow = '';
  }, []);

  const openLaunchConfirm = (promo) => {
    setActionPromo(promo);
    setShowLaunchConfirm(true);
    document.body.style.overflow = 'hidden';
  };

  const confirmLaunchPromo = async () => {
    if (!actionPromo) return;
    
    try {
      await api.post(`/api/discounts/${actionPromo.id}/launch`);
      await loadOverviewPromos();
      setShowLaunchConfirm(false);
      setActionPromo(null);
    } catch (err) {
      console.error("Failed to launch promo", err);
      alert("Failed to launch promo: " + (err.response?.data?.message || "Unknown error"));
    } finally {
      document.body.style.overflow = '';
    }
  };

  const cancelLaunchConfirm = () => {
    setShowLaunchConfirm(false);
    setActionPromo(null);
    document.body.style.overflow = '';
  };

  const openCancelConfirm = (promo) => {
    setActionPromo(promo);
    setShowCancelConfirm(true);
    document.body.style.overflow = 'hidden';
  };

  const confirmCancelPromo = async () => {
    if (!actionPromo) return;
    
    try {
      await api.post(`/api/discounts/${actionPromo.id}/cancel`);
      await loadOverviewPromos();
      setShowCancelConfirm(false);
      setActionPromo(null);
    } catch (err) {
      console.error("Failed to cancel promo", err);
      alert("Failed to cancel promo: " + (err.response?.data?.message || "Unknown error"));
    } finally {
      document.body.style.overflow = '';
    }
  };

  const cancelCancelConfirm = () => {
    setShowCancelConfirm(false);
    setActionPromo(null);
    document.body.style.overflow = '';
  };

  const editOverviewPromo = (promo) => {
    // Find the service for this promo
    const service = services.find(s => s.id === promo.service_id);
    if (service) {
      setSelectedService(service.id);
      setEditingPromo(promo);
      setEditingPromoId(promo.id);
      setIsCreatingNew(false);
      setShowEditModal(true);
    }
  };

  const isCancelable = (promo) => {
    if (promo.status !== "launched" || !promo.activated_at) return false;
    const activated = new Date(promo.activated_at);
    const now = new Date();
    const diff = (now - activated) / (1000 * 60 * 60 * 24); // in days
    return diff <= 1;
  };

  const renderStatusBadge = useCallback((status) => {
    switch (status) {
      case "planned":
        return <span className="badge bg-secondary">Planned</span>;
      case "launched":
        return <span className="badge bg-success">Launched</span>;
      case "canceled":
        return <span className="badge bg-warning text-dark">Canceled</span>;
      default:
        return <span className="badge bg-light text-dark">Unknown</span>;
    }
  }, []);

  const filteredServices = useMemo(() => 
    services.filter((s) => !s.is_special), 
    [services]
  );

  return (
    <div className="service-discounts-page">
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-primary text-white">
          <h1 className="card-title mb-0 fs-4 fs-md-3">
            <i className="bi bi-percent me-2"></i>
            Service Promo Discounts
          </h1>
        </div>
        <div className="card-body">

      {cleanupMessage && (
        <div className="alert alert-success d-flex align-items-center gap-2 mb-3">
          <i className="bi bi-check-circle me-2"></i>
          {cleanupMessage}
        </div>
      )}

      <div className="row mb-4">
        <div className="col-12 col-md-6">
          <button className="btn btn-primary btn-lg" onClick={openPromoCreation}>
            <i className="bi bi-plus-circle me-2"></i>
            Create New Promo
          </button>
        </div>
        <div className="col-12 col-md-6 text-md-end mt-2 mt-md-0">
          <span
            className="text-muted small d-inline-flex align-items-center"
            title="Services marked as Special/Package are excluded from discounts."
          >
            <i className="bi bi-info-circle me-2"></i>
            Specials/Packages cannot be discounted
          </span>
        </div>
      </div>

      {/* Always show overview table */}
        <div className="mt-4">
          <div className="d-flex align-items-center mb-4">
            <h5 className="mb-0 me-3">
              <i className="bi bi-list-ul me-2 text-primary"></i>
              Active and Planned Promos
            </h5>
            <div className="flex-grow-1"></div>
            <span className="badge bg-primary">
              {overviewPromos.length} promo{overviewPromos.length !== 1 ? 's' : ''}
            </span>
          </div>
          {overviewLoading ? (
            <LoadingSpinner message="Loading promos..." />
          ) : overviewPromos.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ minWidth: '150px' }}>Service Name</th>
                    <th style={{ minWidth: '120px' }}>Start Date</th>
                    <th style={{ minWidth: '120px' }}>End Date</th>
                    <th style={{ minWidth: '140px' }}>Discounted Price</th>
                    <th style={{ minWidth: '100px' }}>Status</th>
                    <th style={{ minWidth: '120px' }}>Activated Date</th>
                    <th className="text-center" style={{ minWidth: '150px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewPromos.map((promo) => (
                    <tr key={promo.id}>
                      <td>{promo.service?.name || "-"}</td>
                      <td>{promo.start_date}</td>
                      <td>{promo.end_date}</td>
                      <td>₱{Number(promo.discounted_price).toFixed(2)}</td>
                      <td>{renderStatusBadge(promo.status)}</td>
                      <td>{promo.activated_at?.split("T")[0] || "-"}</td>
                      <td className="text-center">
                        {promo.status === "planned" && (
                          <div className="btn-group" role="group">
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => openLaunchConfirm(promo)}
                              title="Launch this promo"
                            >
                              <i className="bi bi-play-fill"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => openCancelConfirm(promo)}
                              title="Cancel this promo"
                            >
                              <i className="bi bi-x-circle"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-info"
                              onClick={() => editOverviewPromo(promo)}
                              title="Edit this promo"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                          </div>
                        )}
                        {promo.status === "launched" && isCancelable(promo) && (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => openCancelConfirm(promo)}
                            title="Cancel this promo"
                          >
                            <i className="bi bi-x-circle me-1"></i>
                            Cancel
                          </button>
                        )}
                        {promo.status === "launched" && !isCancelable(promo) && (
                          <span className="text-muted small">
                            <i className="bi bi-check-circle text-success"></i> Active
                          </span>
                        )}
                        {promo.status === "canceled" && (
                          <span className="text-muted small">
                            <i className="bi bi-x-circle text-warning"></i> Canceled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted">No active or planned promos.</p>
          )}
        </div>

      {/* Modals from shared component */}
      <ServiceSelectModal
        show={showServiceModal}
        services={filteredServices}
        onSelect={selectService}
        onClose={() => {
          setShowServiceModal(false);
          document.body.style.overflow = '';
        }}
      />

      <EditPromoModal
        show={showEditModal}
        promo={editingPromo}
        service={selected}
        onSave={savePromo}
        onCancel={closeEditModal}
        loading={loading}
        isCreatingNew={isCreatingNew}
      />

      {/* Launch Confirmation Modal */}
      {showLaunchConfirm && actionPromo && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="bi bi-play-circle me-2"></i>
                  Launch Promo
                </h5>
                <button type="button" className="btn-close" onClick={cancelLaunchConfirm}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <strong>Warning:</strong> This action cannot be undone easily.
                </div>
                <p>Are you sure you want to launch this promo?</p>
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title">{actionPromo.service?.name}</h6>
                    <p className="card-text mb-1">
                      <strong>Start Date:</strong> {actionPromo.start_date}<br />
                      <strong>End Date:</strong> {actionPromo.end_date}<br />
                      <strong>Discounted Price:</strong> ₱{Number(actionPromo.discounted_price).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelLaunchConfirm}>
                  Cancel
                </button>
                <button type="button" className="btn btn-success" onClick={confirmLaunchPromo}>
                  <i className="bi bi-play-fill me-1"></i>
                  Launch Promo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && actionPromo && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">
                  <i className="bi bi-x-circle me-2"></i>
                  Cancel Promo
                </h5>
                <button type="button" className="btn-close" onClick={cancelCancelConfirm}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <strong>Warning:</strong> This action cannot be undone.
                </div>
                <p>Are you sure you want to cancel this promo?</p>
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title">{actionPromo.service?.name}</h6>
                    <p className="card-text mb-1">
                      <strong>Start Date:</strong> {actionPromo.start_date}<br />
                      <strong>End Date:</strong> {actionPromo.end_date}<br />
                      <strong>Discounted Price:</strong> ₱{Number(actionPromo.discounted_price).toFixed(2)}<br />
                      <strong>Status:</strong> {renderStatusBadge(actionPromo.status)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelCancelConfirm}>
                  Cancel
                </button>
                <button type="button" className="btn btn-warning" onClick={confirmCancelPromo}>
                  <i className="bi bi-x-circle me-1"></i>
                  Cancel Promo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && <LoadingSpinner message="Saving promo..." />}
        </div>
      </div>
    </div>
  );
}
