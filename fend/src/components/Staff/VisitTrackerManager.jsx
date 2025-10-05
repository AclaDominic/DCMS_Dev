import { useEffect, useState } from "react";
import api from "../../api/api";
import LoadingSpinner from "../LoadingSpinner";
import VisitCompletionModal from "./VisitCompletionModal";
import VisitNotesModal from "./VisitNotesModal";

function VisitTrackerManager() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [visitType, setVisitType] = useState("walkin");
  const [refCode, setRefCode] = useState("");
  const [appointmentData, setAppointmentData] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingVisitId, setRejectingVisitId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [offeredAppointment, setOfferedAppointment] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    contact: "",
    service_id: "",
  });
  const [availableServices, setAvailableServices] = useState([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchingPatients, setMatchingPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showAllVisits, setShowAllVisits] = useState(false);
  const [completingVisit, setCompletingVisit] = useState(null);
  const [viewingNotes, setViewingNotes] = useState(null);

  useEffect(() => {
    fetchVisits();
  }, []);

  // Debug: Log when visits state changes
  useEffect(() => {
    console.log("🔄 Visits state updated:", visits);
    console.log("📊 Visit counts:", {
      total: visits.length,
      pending: visits.filter(v => v.status === 'pending').length,
      completed: visits.filter(v => v.status === 'completed').length,
      rejected: visits.filter(v => v.status === 'rejected').length
    });
  }, [visits]);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      console.log("🌐 Fetching visits from API...");
      const res = await api.get("/api/visits");
      console.log("📥 API response received:", res.data);
      console.log("📈 Number of visits received:", res.data.length);
      console.log("⏳ Visits with pending status:", res.data.filter(v => v.status === 'pending'));
      console.log("🔍 Visit IDs:", res.data.map(v => ({ id: v.id, status: v.status, patient: v.patient?.first_name + ' ' + v.patient?.last_name })));
      setVisits(res.data);
    } catch (err) {
      console.error("❌ Failed to load visits", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartVisit = async () => {
    setSubmitting(true);
    try {
      let payload;
      if (visitType === "walkin") {
        payload = { visit_type: "walkin" };
      } else if (visitType === "appointment") {
        if (!appointmentData) {
          alert("Search and select a valid appointment first.");
          setSubmitting(false);
          return;
        }
        payload = {
          visit_type: "appointment",
          reference_code: (refCode || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, ""),
        };
      }
      console.log("🚀 Creating visit with payload:", payload);
      const response = await api.post("/api/visits", payload);
      const visit = response.data;
      console.log("✅ Visit created successfully:", visit);
      console.log("📋 Visit details:", {
        id: visit.id,
        status: visit.status,
        visit_code: visit.visit_code,
        patient_id: visit.patient_id,
        patient_name: visit.patient?.first_name + ' ' + visit.patient?.last_name,
        start_time: visit.start_time
      });
      
      // Show visit code to staff
      if (visit.visit_code) {
        alert(`Visit started successfully!\n\nVisit Code: ${visit.visit_code}\n\nShare this code with the dentist to begin consultation.`);
      }
      
      // Add the newly created visit to the state immediately
      console.log("➕ Adding new visit to state:", visit);
      setVisits(prevVisits => {
        const newVisits = [visit, ...prevVisits];
        console.log("🔄 Updated visits state with new visit:", newVisits);
        console.log("🎯 New visit should now be visible in the list");
        return newVisits;
      });
      
      setRefCode("");
      setAppointmentData(null);
      
      // Also fetch from server to ensure consistency
      console.log("🔄 Fetching visits after creation to ensure consistency...");
      await new Promise(resolve => setTimeout(resolve, 200));
      await fetchVisits();
      console.log("✅ Visit creation process completed");
    } catch (err) {
      console.error("Error creating visit:", err);
      alert("Failed to start visit.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id, action) => {
    if (action === "finish") {
      const visit = visits.find(v => v.id === id);
      
      // Check if service is selected for walk-in patients
      if (!visit.service_id) {
        alert("Please select a service for this patient before finishing the visit. Use the 'Edit' button to assign a service.");
        return;
      }
      
      setCompletingVisit(visit);
      return;
    }
    
    try {
      await api.post(`/api/visits/${id}/${action}`);
      await fetchVisits();
    } catch (err) {
      alert(`Failed to ${action} visit.`);
    }
  };

  const handleVisitComplete = async () => {
    await fetchVisits();
  };

  const handleSearchRefCode = async () => {
    setSearching(true);
    setAppointmentData(null);
    setSearchError("");

    try {
      const code = (refCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length !== 8) {
        setSearchError("Enter the full 8-character code.");
        return;
      }
      const res = await api.get(`/api/appointment/resolve/${code}`);
      setAppointmentData(res.data);
    } catch {
      setSearchError("Invalid or used reference code.");
    } finally {
      setSearching(false);
    }
  };

  const handleEditClick = async (visit) => {
    setEditingVisit(visit);
    setEditForm({
      first_name: visit.patient?.first_name || "",
      last_name: visit.patient?.last_name || "",
      contact: visit.patient?.contact || "",
      service_id: visit.service_id || "",
    });

    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await api.get(
        `/api/appointment/available-services?date=${today}`
      );
      setAvailableServices(
        Array.isArray(res.data) ? res.data : res.data.data || []
      );
    } catch (err) {
      alert("Failed to load services.");
    }
  };

  const handleEditSave = async () => {
    try {
      await api.put(`/api/visits/${editingVisit.id}/update-patient`, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        contact_number:
          editForm.contact.trim() !== ""
            ? editForm.contact.trim()
            : editingVisit.patient?.contact_number,
        service_id: editForm.service_id || null,
      });
      setEditingVisit(null);
      await fetchVisits();
    } catch (err) {
      alert("Failed to update patient.");
    }
  };

  return (
    <div className="h-100 d-flex flex-column">
      <h3>📝 Patient Visit Tracker</h3>

      <div className="card p-3 mb-4">
        <label>Visit Type</label>
        <select
          className="form-select mb-2"
          value={visitType}
          onChange={(e) => {
            setVisitType(e.target.value);
            setAppointmentData(null);
            setRefCode("");
            setSearchError("");
          }}
        >
          <option value="walkin">Walk-in</option>
          <option value="appointment">Appointment</option>
        </select>

        {visitType === "appointment" && (
          <>
            <div className="input-group mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="Enter Appointment Reference Code"
                value={refCode}
                onChange={(e) => setRefCode(e.target.value.toUpperCase())}
              />
              <button
                className="btn btn-outline-primary"
                onClick={handleSearchRefCode}
                disabled={searching || !refCode}
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
            {searchError && <div className="text-danger">{searchError}</div>}
            {appointmentData && (
              <div className="alert alert-success">
                <strong>{appointmentData.patient_name}</strong> —{" "}
                {appointmentData.service_name} @ {appointmentData.date} /{" "}
                {appointmentData.time_slot}
              </div>
            )}
          </>
        )}

        <button
          className="btn btn-primary mt-2"
          onClick={handleStartVisit}
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Start Visit"}
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading patient visits..." />
      ) : (
        <div className="flex-grow-1 d-flex flex-column">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>Ongoing Visits ({visits.length} total, {visits.filter(v => v.status === 'pending').length} pending)</h5>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={fetchVisits}
              >
                🔄 Refresh
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowAllVisits((prev) => !prev)}
              >
                {showAllVisits
                  ? "🔽 Hide Completed/Rejected"
                  : "🔼 Show All Today's Visits"}
              </button>
            </div>
          </div>
          <div className="table-responsive flex-grow-1">
            <table className="table table-bordered table-hover mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Visit Code</th>
                  <th>Service</th>
                  <th>Note</th>
                  <th>Started At</th>
                  <th>Status</th>
                  <th style={{minWidth: '200px'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
              {(() => {
                const filteredVisits = visits.filter((v) => showAllVisits || v.status === "pending");
                console.log("All visits:", visits);
                console.log("Show all visits:", showAllVisits);
                console.log("Filtered visits:", filteredVisits);
                return filteredVisits;
              })()
                .map((v) => {
                  console.log("Rendering visit:", v.id, "Patient:", v.patient);
                  return (
                  <tr key={v.id}>
                    <td>
                      {v.patient?.first_name} {v.patient?.last_name}
                    </td>
                    <td>{v.patient?.contact_number || "—"}</td>
                    <td>
                      {v.visit_code ? (
                        <span className="badge bg-primary">{v.visit_code}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {v.service ? (
                        <span className="badge bg-info">{v.service.name}</span>
                      ) : (
                        <span className="badge bg-warning">
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          No Service
                        </span>
                      )}
                    </td>
                    <td>
                      {v.status === "completed" && v.visit_notes ? (
                        <button
                          className="btn btn-sm btn-outline-info"
                          onClick={() => setViewingNotes(v)}
                        >
                          🔒 View Notes
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {v.start_time
                        ? new Date(v.start_time).toLocaleString("en-PH", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>

                    <td>{v.status}</td>
                    <td>
                      {v.status === "pending" && (
                        <div className="d-flex gap-1 flex-wrap">
                          <button
                            className={`btn btn-sm ${
                              v.service_id ? "btn-success" : "btn-outline-secondary"
                            }`}
                            onClick={() => handleAction(v.id, "finish")}
                            disabled={!v.service_id}
                            title={
                              !v.service_id 
                                ? "Please select a service first" 
                                : "Complete this visit"
                            }
                          >
                            {!v.service_id ? (
                              <>
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                Finish
                              </>
                            ) : (
                              "Finish"
                            )}
                          </button>
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => handleEditClick(v)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              setRejectingVisitId(v.id);
                              setRejectReason("");
                              setOfferedAppointment(false);
                              setShowRejectModal(true);
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {rejectReason === "inquiry_only" ? "Mark as Inquiry" : "Reject Visit"}
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setShowRejectModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label className="form-label">
                  {rejectReason === "inquiry_only" ? "Reason for inquiry:" : "Reason for rejection:"}
                </label>
                <select
                  className="form-select"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                >
                  <option value="">Select reason</option>
                  <option value="human_error">Human Error</option>
                  <option value="left">Patient Left</option>
                  <option value="line_too_long">Line Too Long</option>
                  <option value="inquiry_only">Inquiry Only</option>
                </select>
                {rejectReason === "line_too_long" && (
                  <div className="form-check mt-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={offeredAppointment}
                      onChange={(e) => setOfferedAppointment(e.target.checked)}
                      id="offerAppt"
                    />
                    <label htmlFor="offerAppt" className="form-check-label">
                      Patient was offered an appointment
                    </label>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  disabled={!rejectReason}
                  onClick={async () => {
                    await api.post(`/api/visits/${rejectingVisitId}/reject`, {
                      reason: rejectReason,
                      offered_appointment: offeredAppointment,
                    });
                    setShowRejectModal(false);
                    setRejectingVisitId(null);
                    await fetchVisits();
                  }}
                >
                  {rejectReason === "inquiry_only" ? "Mark as Inquiry" : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingVisit && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Patient Info</h5>
                <button
                  className="btn-close"
                  onClick={() => setEditingVisit(null)}
                ></button>
              </div>
              <div className="modal-body">
                <label className="form-label">First Name</label>
                <input
                  className="form-control mb-2"
                  value={editForm.first_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, first_name: e.target.value })
                  }
                />
                <label className="form-label">Last Name</label>
                <input
                  className="form-control mb-2"
                  value={editForm.last_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, last_name: e.target.value })
                  }
                />
                <label className="form-label">Contact</label>
                <input
                  className="form-control mb-2"
                  value={editForm.contact}
                  onChange={(e) =>
                    setEditForm({ ...editForm, contact: e.target.value })
                  }
                />
                <label className="form-label">Service</label>
                <select
                  className="form-select"
                  value={editForm.service_id}
                  onChange={(e) =>
                    setEditForm({ ...editForm, service_id: e.target.value })
                  }
                >
                  <option value="">— Select —</option>
                  {availableServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} –{" "}
                      {s.type === "promo"
                        ? `₱${Number(s.promo_price).toLocaleString()} (${
                            s.discount_percent
                          }% off)`
                        : s.type === "special"
                        ? `₱${Number(s.price).toLocaleString()} Special Service`
                        : `₱${Number(s.price).toLocaleString()}`}
                    </option>
                  ))}
                </select>
                <hr />
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    // trigger modal to search existing patients
                    setShowLinkModal(true);
                    setSearchQuery("");
                    setMatchingPatients([]);
                    setSelectedPatient(null);
                  }}
                >
                  🔗 Link to Existing Patient
                </button>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setEditingVisit(null)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleEditSave}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Link to Existing Patient</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowLinkModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <input
                  className="form-control mb-2"
                  placeholder="Search by name or contact (min 2 characters)"
                  value={searchQuery}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    setMatchingPatients([]);
                    setSelectedPatient(null);

                    if (val.length >= 2) {
                      try {
                        const res = await api.get("/api/patients/search", {
                          params: { q: val.trim() },
                        });
                        setMatchingPatients(res.data);
                      } catch {
                        alert("Search failed.");
                      }
                    }
                  }}
                />

                {matchingPatients.filter(
                  (p) => p.id !== editingVisit?.patient?.id
                ).length > 0 ? (
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Birthdate</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchingPatients
                        .filter((p) => p.id !== editingVisit?.patient?.id)
                        .map((p) => (
                          <tr key={p.id}>
                            <td>
                              {p.first_name} {p.last_name}
                            </td>
                            <td>{p.contact_number || "—"}</td>
                            <td>{p.birthdate || "—"}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => setSelectedPatient(p)}
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Birthdate</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan="4" className="text-muted text-center">
                          No matching patients found.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {selectedPatient && (
                  <div className="alert alert-info mt-3">
                    Link current visit to{" "}
                    <strong>
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </strong>
                    ?
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowLinkModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!selectedPatient}
                  onClick={async () => {
                    try {
                      await api.post(
                        `/api/visits/${editingVisit.id}/link-existing`,
                        {
                          target_patient_id: selectedPatient.id,
                        }
                      );
                      setShowLinkModal(false);
                      setEditingVisit(null);
                      await fetchVisits();
                    } catch {
                      alert("Failed to link to patient.");
                    }
                  }}
                >
                  Confirm Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visit Completion Modal */}
      {completingVisit && (
        <VisitCompletionModal
          visit={completingVisit}
          onClose={() => setCompletingVisit(null)}
          onComplete={handleVisitComplete}
        />
      )}

      {/* Visit Notes Modal */}
      {viewingNotes && (
        <VisitNotesModal
          visit={viewingNotes}
          onClose={() => setViewingNotes(null)}
        />
      )}
    </div>
  );
}

export default VisitTrackerManager;
