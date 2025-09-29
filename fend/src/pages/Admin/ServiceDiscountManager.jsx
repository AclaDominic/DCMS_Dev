import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { ServiceSelectModal, EditPromoModal } from "../../components/ServiceDiscountModals";
import "./ServiceDiscountManager.css";

export default function ServiceDiscountManager() {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [promos, setPromos] = useState([]);
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

  const loadPromos = async (serviceId) => {
    try {
      setSelectedService(serviceId);
      const res = await api.get(`/api/services/${serviceId}/discounts`);

      setPromos(res.data.promos || []);
      if (res.data.cleanup_count > 0) {
        setCleanupMessage(
          `${res.data.cleanup_count} expired promo(s) marked as done.`
        );
        setTimeout(() => setCleanupMessage(null), 5000); // Hide after 5 seconds
      }
    } catch (err) {
      console.error("Failed to load promos", err);
      setPromos([]);
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

      // Reset form and reload promos
      setForm({ start_date: "", end_date: "", discounted_price: "" });
      setEditMode(false);
      await loadPromos(selectedService);
      await loadOverviewPromos();
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

  const launchPromo = async (id) => {
    if (window.confirm("Are you sure you want to launch this promo? This action cannot be undone easily.")) {
      try {
        await api.post(`/api/discounts/${id}/launch`);
        await loadPromos(selectedService);
      } catch (err) {
        console.error("Failed to launch promo", err);
        alert("Failed to launch promo: " + (err.response?.data?.message || "Unknown error"));
      }
    }
  };

  const cancelPromo = async (id) => {
    if (window.confirm("Are you sure you want to cancel this promo? This action cannot be undone.")) {
      try {
        await api.post(`/api/discounts/${id}/cancel`);
        await loadPromos(selectedService);
      } catch (err) {
        console.error("Failed to cancel promo", err);
        alert("Failed to cancel promo: " + (err.response?.data?.message || "Unknown error"));
      }
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
    await loadPromos(serviceId);
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
    // Restore body scroll
    document.body.style.overflow = '';
  }, []);

  const launchOverviewPromo = async (id) => {
    if (window.confirm("Are you sure you want to launch this promo? This action cannot be undone easily.")) {
      try {
        await api.post(`/api/discounts/${id}/launch`);
        await loadOverviewPromos();
      } catch (err) {
        console.error("Failed to launch promo", err);
        alert("Failed to launch promo: " + (err.response?.data?.message || "Unknown error"));
      }
    }
  };

  const cancelOverviewPromo = async (id) => {
    if (window.confirm("Are you sure you want to cancel this promo? This action cannot be undone.")) {
      try {
        await api.post(`/api/discounts/${id}/cancel`);
        await loadOverviewPromos();
      } catch (err) {
        console.error("Failed to cancel promo", err);
        alert("Failed to cancel promo: " + (err.response?.data?.message || "Unknown error"));
      }
    }
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

      {selectedService ? (
        <>
          {/* Service info section */}
          <div className="alert alert-info mb-4">
            <div className="row align-items-center">
              <div className="col-12 col-md-8">
                <h6 className="mb-1">
                  <i className="bi bi-gear me-2"></i>
                  Managing promos for: <strong>{selected?.name}</strong>
                </h6>
                {selected?.category && (
                  <p className="mb-0 text-muted">
                    <i className="bi bi-tag me-1"></i>
                    Category: <strong>{selected.category}</strong>
                  </p>
                )}
              </div>
              <div className="col-12 col-md-4 text-md-end mt-2 mt-md-0">
                {selected?.is_excluded_from_analytics && (
                  <span className="badge bg-secondary">
                    <i className="bi bi-lock me-1"></i>
                    Excluded from analytics
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ minWidth: '120px' }}>Start Date</th>
                  <th style={{ minWidth: '120px' }}>End Date</th>
                  <th style={{ minWidth: '140px' }}>Discounted Price</th>
                  <th style={{ minWidth: '100px' }}>Status</th>
                  <th style={{ minWidth: '120px' }}>Activated Date</th>
                  <th className="text-center" style={{ minWidth: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.length > 0 ? (
                  promos.map((promo) => (
                    <tr key={promo.id}>
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
                              onClick={() => launchPromo(promo.id)}
                              title="Launch this promo"
                            >
                              <i className="bi bi-play-fill"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => cancelPromo(promo.id)}
                              title="Cancel this promo"
                            >
                              <i className="bi bi-x-circle"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-info"
                              onClick={() => openEditModal(promo)}
                              title="Edit this promo"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                          </div>
                        )}
                        {promo.status === "launched" && isCancelable(promo) && (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => cancelPromo(promo.id)}
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
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-3">
                      <i className="bi bi-info-circle me-1"></i>
                      No promos available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
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
                              onClick={() => launchOverviewPromo(promo.id)}
                              title="Launch this promo"
                            >
                              <i className="bi bi-play-fill"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => cancelOverviewPromo(promo.id)}
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
                        {promo.status === "launched" && (
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
      )}

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

      {loading && <LoadingSpinner message="Saving promo..." />}
        </div>
      </div>
    </div>
  );
}
