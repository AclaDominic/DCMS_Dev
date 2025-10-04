import { useEffect, useState } from "react";
import api from "../../api/api";

export default function AdminGoalsPage() {
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [metric, setMetric] = useState("visits");
  const [target, setTarget] = useState(100);
  const [serviceId, setServiceId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [goals, setGoals] = useState([]);
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);

  // Load services and packages
  useEffect(() => {
    const loadData = async () => {
      try {
        const servicesRes = await api.get("/api/services");
        
        setServices(servicesRes.data || []);
        
        // Filter services that are packages/promos (special services or have bundle items)
        const packageServices = servicesRes.data?.filter(service => 
          service.is_special || (service.bundleItems && service.bundleItems.length > 0)
        ) || [];
        setPackages(packageServices);
      } catch (e) {
        console.error("Failed to load data:", e);
      }
    };
    loadData();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/goals", { params: { period } });
      setGoals(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || "Failed to load goals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const createGoal = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        period_type: "month",
        metric: metric === "visits" ? "total_visits" : metric,
        target_value: target,
        period_start: period,
        period_end: null,
        service_id: metric === "service_availment" ? serviceId : null,
        package_id: metric === "package_promo_availment" ? packageId : null,
      };
      await api.post("/api/goals", payload);
      await load();
      setTarget(100);
      setServiceId("");
      setPackageId("");
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || "Failed to create goal.");
    } finally {
      setLoading(false);
    }
  };

  const derivedStatus = (g) => {
    const actual = Number(g.latest_actual || 0);
    const targetVal = Number(g.target_value || 1);
    const now = new Date();
    const start = new Date(g.period_start);
    const end = g.period_end ? new Date(g.period_end) : new Date(start.getFullYear(), start.getMonth() + 1, 0);
    
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.min(Math.ceil((now - start) / (1000 * 60 * 60 * 24)), totalDays);
    const expected = Math.round((targetVal * daysPassed) / totalDays);

    if (g.status === "missed") return { label: "Missed", color: "danger" };
    if (g.status === "done") return { label: "Completed", color: "success" };

    if (actual >= expected) return { label: "On track", color: "success" };
    if (actual >= expected * 0.8) return { label: "At risk", color: "warning" };
    return { label: "Behind", color: "danger" };
  };

  const progressPct = (g) => {
    const actual = Number(g.latest_actual || 0);
    const target = Number(g.target_value || 1);
    return Math.min(100, Math.round((actual / target) * 100));
  };

  const getMetricDisplayName = (metric) => {
    switch (metric) {
      case "total_visits": return "Visits";
      case "service_availment": return "Service Availment";
      case "package_promo_availment": return "Package/Promo Availment";
      default: return metric;
    }
  };

  const getGoalDescription = (goal) => {
    switch (goal.metric) {
      case "total_visits":
        return "Total number of visits";
      case "service_availment":
        const service = services.find(s => s.id === goal.service_id);
        return service ? `${service.name}` : "Unknown Service";
      case "package_promo_availment":
        const package_ = packages.find(p => p.id === goal.package_id);
        return package_ ? `${package_.name}` : "Unknown Package/Promo";
      default:
        return "";
    }
  };

  return (
    <div 
      className="admin-goals-page"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        minHeight: '100vh',
        width: '100%',
        padding: '1.5rem 1rem',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="m-0 fw-bold" style={{ color: '#1e293b' }}>
            <i className="bi bi-bullseye me-2"></i>
            Performance Goals
          </h2>
          <p className="text-muted mb-0 mt-1">Set and track your clinic's performance targets</p>
        </div>
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <input
            type="month"
            className="form-control border-0 shadow-sm"
            style={{ 
              width: 180,
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500'
            }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Select month"
          />
        </div>
      </div>

      {error && (
        <div className="alert alert-danger border-0 shadow-sm mb-4" role="alert" style={{ borderRadius: '12px' }}>
          <div className="d-flex align-items-center">
            <span className="me-2">⚠️</span>
            {error}
          </div>
        </div>
      )}

      <div className="row g-2 g-md-3 g-lg-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm" style={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px'
          }}>
            <div className="card-body p-4">
              <h5 className="card-title mb-4 fw-bold" style={{ color: '#1e293b' }}>
                <i className="bi bi-plus-circle me-2"></i>
                Create New Goal
              </h5>
              <form className="row g-3" onSubmit={createGoal}>
                <div className="col-12 col-md-6 col-lg-3">
                  <label className="form-label fw-medium">Metric</label>
                  <select 
                    className="form-select border-0 shadow-sm" 
                    style={{ borderRadius: '8px', padding: '12px 16px' }}
                    value={metric} 
                    onChange={(e) => setMetric(e.target.value)}
                  >
                    <option value="visits">Visits</option>
                    <option value="service_availment">Service Availment</option>
                    <option value="package_promo_availment">Package/Promo Availment</option>
                  </select>
                </div>

                <div className="col-12 col-md-6 col-lg-3">
                  <label className="form-label fw-medium">Period</label>
                  <input 
                    type="month" 
                    className="form-control border-0 shadow-sm" 
                    style={{ borderRadius: '8px', padding: '12px 16px' }}
                    value={period} 
                    onChange={(e) => setPeriod(e.target.value)} 
                  />
                </div>

                {metric === "service_availment" && (
                  <div className="col-12 col-md-6 col-lg-3">
                    <label className="form-label fw-medium">Service</label>
                    <select 
                      className="form-select border-0 shadow-sm" 
                      style={{ borderRadius: '8px', padding: '12px 16px' }}
                      value={serviceId} 
                      onChange={(e) => setServiceId(e.target.value)}
                      required
                    >
                      <option value="">Select a regular service...</option>
                      {services.filter(service => !service.is_special).map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {metric === "package_promo_availment" && (
                  <div className="col-12 col-md-6 col-lg-3">
                    <label className="form-label fw-medium">Package/Promo</label>
                    <select 
                      className="form-select border-0 shadow-sm" 
                      style={{ borderRadius: '8px', padding: '12px 16px' }}
                      value={packageId} 
                      onChange={(e) => setPackageId(e.target.value)}
                      required
                    >
                      <option value="">Select a package/promo...</option>
                      {packages.map(package_ => (
                        <option key={package_.id} value={package_.id}>
                          {package_.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="col-12 col-md-6 col-lg-3">
                  <label className="form-label fw-medium">Target Value</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="form-control border-0 shadow-sm" 
                    style={{ borderRadius: '8px', padding: '12px 16px' }}
                    value={target} 
                    onChange={(e) => setTarget(e.target.value)} 
                    placeholder={metric === "visits" ? "Number of visits" : "Target number"}
                    required
                  />
                </div>

                {/* Help text for service availment */}
                {metric === "service_availment" && (
                  <div className="col-12">
                    <div className="alert alert-info border-0 shadow-sm" style={{ borderRadius: '8px' }}>
                      <i className="bi bi-info-circle me-2"></i>
                      Only regular services (non-special) are shown. Patients who availed promos for these services will be excluded from the count.
                    </div>
                  </div>
                )}

                <div className="col-12 col-md-6 col-lg-3 d-flex align-items-end">
                  <button 
                    className="btn w-100 border-0 shadow-sm" 
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      color: 'white',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {loading ? '⟳' : '✓'} Create Goal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card border-0 shadow-sm" style={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px'
          }}>
            <div className="card-header bg-transparent border-0 p-4 pb-0">
              <h5 className="card-title mb-0 fw-bold" style={{ color: '#1e293b' }}>
                <i className="bi bi-list-check me-2"></i>
                Goals for {period}
              </h5>
            </div>
            <div className="card-body p-4">
              {loading ? (
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                  <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted">Loading goals...</p>
                  </div>
                </div>
              ) : goals.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <div className="fs-1 mb-3" style={{ color: '#e2e8f0' }}>
                    <i className="bi bi-inbox"></i>
                  </div>
                  <h6 className="fw-medium mb-1">No goals found for this period</h6>
                  <p className="small mb-0">Create your first goal using the form above</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0 w-100">
                    <colgroup>
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '15%' }} />
                    </colgroup>
                    <thead className="table-primary">
                      <tr>
                        <th className="fw-semibold px-3 px-md-4 py-3 border-0" style={{ fontSize: '1.1rem' }}>
                          <i className="bi bi-bullseye me-2"></i>Metric
                        </th>
                        <th className="fw-semibold px-3 px-md-4 py-3 border-0" style={{ fontSize: '1.1rem' }}>
                          <i className="bi bi-file-text me-2"></i>Description
                        </th>
                        <th className="fw-semibold px-3 px-md-4 py-3 border-0" style={{ fontSize: '1.1rem' }}>
                          <i className="bi bi-calendar me-2"></i>Period
                        </th>
                        <th className="fw-semibold px-3 px-md-4 py-3 border-0" style={{ fontSize: '1.1rem' }}>
                          <i className="bi bi-target me-2"></i>Target
                        </th>
                        <th className="fw-semibold px-3 px-md-4 py-3 border-0" style={{ fontSize: '1.1rem' }}>
                          <i className="bi bi-check-circle me-2"></i>Actual
                        </th>
                        <th className="fw-semibold px-3 px-md-4 py-3 border-0" style={{ fontSize: '1.1rem' }}>
                          <i className="bi bi-activity me-2"></i>Status
                        </th>
                        <th className="fw-semibold px-3 px-md-4 py-3 border-0" style={{ fontSize: '1.1rem' }}>
                          <i className="bi bi-graph-up me-2"></i>Progress
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {goals.map((g) => (
                        <tr key={g.id} className="align-middle" style={{ height: '60px' }}>
                          <td className="px-3 px-md-4 py-3 fw-medium border-0" style={{ fontSize: '1rem' }}>
                            <div className="d-flex align-items-center">
                              <div className="bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" 
                                   style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                                🎯
                              </div>
                              <div>
                                <div className="fw-bold text-dark">{getMetricDisplayName(g.metric)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 px-md-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                            <div className="text-truncate" style={{ maxWidth: '180px' }} title={getGoalDescription(g)}>
                              {getGoalDescription(g)}
                            </div>
                          </td>
                          <td className="px-3 px-md-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                            <div className="d-flex flex-column">
                              <span className="fw-semibold text-dark">
                                {g.period_type === "month" 
                                  ? new Date(g.period_start).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
                                  : `${new Date(g.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(g.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                }
                              </span>
                              <small className="text-muted">Period</small>
                            </div>
                          </td>
                          <td className="px-3 px-md-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                            <span className="badge bg-light text-dark fs-6">{g.target_value}</span>
                          </td>
                          <td className="px-3 px-md-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                            <div className="fw-bold text-success fs-5">{g.latest_actual || 0}</div>
                          </td>
                          <td className="px-3 px-md-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                            <div className="d-flex flex-column align-items-start">
                              {(() => {
                                const s = derivedStatus(g);
                                return <span className={`badge bg-${s.color} mb-1`}>{s.label}</span>;
                              })()}
                              <small className="text-muted">Current</small>
                            </div>
                          </td>
                          <td className="px-3 px-md-4 py-3 border-0">
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1 me-2" style={{ height: 24 }}>
                                <div
                                  className={`progress-bar ${progressPct(g) >= 100 ? 'bg-success' : progressPct(g) >= 70 ? 'bg-info' : 'bg-warning'}`}
                                  role="progressbar"
                                  style={{ width: `${progressPct(g)}%` }}
                                  aria-valuenow={progressPct(g)}
                                  aria-valuemin="0"
                                  aria-valuemax="100"
                                >
                                  <span className="text-white fw-medium small">{progressPct(g)}%</span>
                                </div>
                              </div>
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
      </div>
    </div>
  );
}