import { useState, useEffect } from "react";
import api from "../../api/api";
import LoadingSpinner from "../LoadingSpinner";
import teethChartImage from "../../pages/Dentist/Teeth_Chart.png";

const PatientServiceHistory = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [showToothChart, setShowToothChart] = useState(false);

  useEffect(() => {
    fetchVisitHistory(currentPage);
  }, [currentPage]);

  const fetchVisitHistory = async (page = 1) => {
    try {
      const res = await api.get(`/api/user-visit-history?page=${page}`, {
        skip401Handler: true,
      });
      
      setVisits(res.data.data);
      setMeta({
        current_page: res.data.meta.current_page,
        last_page: res.data.meta.last_page,
        per_page: res.data.meta.per_page,
        total: res.data.meta.total,
      });
    } catch (err) {
      console.error("Failed to fetch visit history", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTeethTreated = (teethString) => {
    if (!teethString) return "—";
    
    const teethArray = teethString.split(',').map(t => t.trim()).filter(t => t);
    if (teethArray.length === 0) return "—";
    
    return teethArray.join(', ');
  };

  const getTeethCount = (teethString) => {
    if (!teethString) return 0;
    const teethArray = teethString.split(',').map(t => t.trim()).filter(t => t);
    return teethArray.length;
  };

  if (loading) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-primary text-white">
          <h6 className="card-title mb-0">
            <i className="bi bi-clock-history me-2"></i>
            Service History
          </h6>
        </div>
        <div className="card-body text-center py-5">
          <LoadingSpinner message="Loading service history..." />
        </div>
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-primary text-white">
          <h6 className="card-title mb-0">
            <i className="bi bi-clock-history me-2"></i>
            Service History
          </h6>
        </div>
        <div className="card-body text-center py-5">
          <i className="bi bi-calendar-x display-4 text-muted"></i>
          <h6 className="mt-3 text-muted">No completed visits yet</h6>
          <p className="text-muted mb-0">Your completed dental visits will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-primary text-white">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="card-title mb-0">
            <i className="bi bi-clock-history me-2"></i>
            Service History
          </h6>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-sm btn-outline-light"
              onClick={() => setShowToothChart(!showToothChart)}
              title="Tooth Chart Reference"
            >
              <i className="bi bi-tooth me-1"></i>
              Chart
            </button>
            <button 
              className="btn btn-sm btn-outline-light"
              onClick={() => fetchVisitHistory(currentPage)}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              ) : (
                <i className="bi bi-arrow-clockwise me-1"></i>
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      {/* Tooth Chart Reference Panel */}
      {showToothChart && (
        <div 
          className="border-bottom"
          style={{
            backgroundColor: 'rgba(248, 249, 250, 0.95)',
            opacity: 0.95,
            padding: '15px',
            border: '1px solid #e5e7eb',
            borderRadius: '0'
          }}
        >
          <div className="row">
            <div className="col-md-6">
              <div className="text-center">
                <img 
                  src={teethChartImage} 
                  alt="Dental Chart Reference" 
                  className="img-fluid"
                  style={{ 
                    maxWidth: '250px', 
                    height: 'auto',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fa'
                  }}
                />
                <small className="text-muted d-block mt-2">Reference Chart</small>
              </div>
            </div>
            <div className="col-md-6">
              <div className="text-center">
                <h6 className="text-primary mb-3">Universal Numbering System</h6>
                
                {/* Upper Teeth Layout */}
                <div className="mb-3">
                  <small className="text-muted d-block mb-2">UPPER TEETH (1-16)</small>
                  <div className="d-flex justify-content-center flex-wrap gap-1">
                    {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(toothNumber => (
                      <span
                        key={toothNumber}
                        className="badge bg-light text-dark border"
                        style={{ 
                          width: '18px', 
                          height: '18px',
                          fontSize: '9px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {toothNumber}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Lower Teeth Layout */}
                <div className="mb-2">
                  <small className="text-muted d-block mb-2">LOWER TEETH (32-17)</small>
                  <div className="d-flex justify-content-center flex-wrap gap-1">
                    {[32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17].map(toothNumber => (
                      <span
                        key={toothNumber}
                        className="badge bg-light text-dark border"
                        style={{ 
                          width: '18px', 
                          height: '18px',
                          fontSize: '9px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {toothNumber}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="alert alert-info py-2 mb-0" style={{ fontSize: '11px' }}>
                  <i className="bi bi-info-circle me-1"></i>
                  Use this chart to understand which teeth were treated
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Teeth Done</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <tr key={visit.id}>
                  <td>
                    <div className="fw-medium">
                      {new Date(visit.visit_date).toLocaleDateString()}
                    </div>
                    <small className="text-muted">
                      {new Date(visit.visit_date).toLocaleDateString('en-US', { 
                        weekday: 'long' 
                      })}
                    </small>
                  </td>
                  <td>
                    <span className="badge bg-primary">
                      {visit.service_name || "Not specified"}
                    </span>
                  </td>
                  <td>
                    {visit.teeth_treated ? (
                      <div>
                        <span className="badge bg-info">
                          {formatTeethTreated(visit.teeth_treated)}
                        </span>
                        <br />
                        <small className="text-muted">
                          {getTeethCount(visit.teeth_treated)} tooth{getTeethCount(visit.teeth_treated) !== 1 ? 's' : ''}
                        </small>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {visit.has_notes ? (
                      <span className="badge bg-success">
                        <i className="bi bi-check-circle me-1"></i>
                        Has Notes
                      </span>
                    ) : (
                      <span className="badge bg-secondary">
                        <i className="bi bi-dash-circle me-1"></i>
                        No Notes
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
      {meta.last_page > 1 && (
        <div className="card-footer bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <i className="bi bi-chevron-left me-1"></i>
              Previous
            </button>

            <span className="text-muted">
              Page {meta.current_page} of {meta.last_page}
            </span>

            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={currentPage === meta.last_page}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
              <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientServiceHistory;
