import { useState } from "react";
import api from "../../api/api";

const PatientUserBinding = () => {
  // Patient search state
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Binding state
  const [binding, setBinding] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(""); // success, error

  // Get API base path based on user role (will be determined by which route works)
  const getApiBasePath = () => {
    // Try staff path first, falls back to admin if needed
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.role === "admin" ? "/api/admin/patient-binding" : "/api/staff/patient-binding";
  };

  // Search unlinked patients
  const searchPatients = async () => {
    if (!patientSearchQuery.trim()) {
      setPatientResults([]);
      return;
    }

    setLoadingPatients(true);
    try {
      const res = await api.get(`${getApiBasePath()}/unlinked-patients`, {
        params: { q: patientSearchQuery },
      });
      setPatientResults(res.data);
    } catch (err) {
      console.error("Failed to search patients:", err);
      setMessage("Failed to search patients. Please try again.");
      setMessageType("error");
    } finally {
      setLoadingPatients(false);
    }
  };

  // Search unlinked users
  const searchUsers = async () => {
    if (!userSearchQuery.trim()) {
      setUserResults([]);
      return;
    }

    setLoadingUsers(true);
    try {
      const res = await api.get(`${getApiBasePath()}/unlinked-users`, {
        params: { q: userSearchQuery },
      });
      setUserResults(res.data);
    } catch (err) {
      console.error("Failed to search users:", err);
      setMessage("Failed to search users. Please try again.");
      setMessageType("error");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Handle binding
  const handleBind = async () => {
    if (!selectedPatient || !selectedUser) {
      setMessage("Please select both a patient and a user to bind.");
      setMessageType("error");
      return;
    }

    setBinding(true);
    setMessage(null);

    try {
      const res = await api.post(`${getApiBasePath()}/bind`, {
        patient_id: selectedPatient.id,
        user_id: selectedUser.id,
      });

      setMessage(res.data.message || "Successfully bound patient to user!");
      setMessageType("success");

      // Clear selections and results
      setSelectedPatient(null);
      setSelectedUser(null);
      setPatientResults([]);
      setUserResults([]);
      setPatientSearchQuery("");
      setUserSearchQuery("");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to bind patient and user. Please try again.";
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setBinding(false);
    }
  };

  // Handle patient selection
  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setMessage(null);
  };

  // Handle user selection
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setMessage(null);
  };

  // Clear patient selection
  const clearPatientSelection = () => {
    setSelectedPatient(null);
  };

  // Clear user selection
  const clearUserSelection = () => {
    setSelectedUser(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-12">
          <h2 className="mb-2">
            <i className="bi bi-link-45deg me-2 text-primary"></i>
            Patient-User Account Binding
          </h2>
          <p className="text-muted">
            Link existing patient records to user accounts. Search for unlinked patients and users, then bind them together.
          </p>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`alert alert-${messageType === "success" ? "success" : "danger"} alert-dismissible fade show`} role="alert">
          <i className={`bi bi-${messageType === "success" ? "check-circle" : "exclamation-triangle"} me-2`}></i>
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      <div className="row g-4">
        {/* Patient Search Section */}
        <div className="col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-person-fill me-2"></i>
                Step 1: Select Patient Record
              </h5>
            </div>
            <div className="card-body">
              {/* Search Input */}
              <div className="mb-3">
                <label className="form-label">Search Unlinked Patients</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name or contact number..."
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && searchPatients()}
                  />
                  <button className="btn btn-primary" onClick={searchPatients} disabled={loadingPatients}>
                    {loadingPatients ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Searching...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-search me-1"></i>
                        Search
                      </>
                    )}
                  </button>
                </div>
                <small className="form-text text-muted">
                  Only shows patients not linked to any user account
                </small>
              </div>

              {/* Selected Patient Display */}
              {selectedPatient && (
                <div className="alert alert-info border-info">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-1">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        Selected Patient
                      </h6>
                      <p className="mb-1">
                        <strong>{selectedPatient.first_name} {selectedPatient.middle_name || ""} {selectedPatient.last_name}</strong>
                      </p>
                      <small className="text-muted">
                        ID: {selectedPatient.id} | Contact: {selectedPatient.contact_number || "N/A"} | 
                        Birthdate: {formatDate(selectedPatient.birthdate)}
                      </small>
                    </div>
                    <button className="btn btn-sm btn-outline-secondary" onClick={clearPatientSelection}>
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* Patient Results */}
              <div className="search-results" style={{ maxHeight: "400px", overflowY: "auto" }}>
                {patientResults.length > 0 && !selectedPatient && (
                  <div className="list-group">
                    {patientResults.map((patient) => (
                      <button
                        key={patient.id}
                        className="list-group-item list-group-item-action"
                        onClick={() => handlePatientSelect(patient)}
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-1">
                              {patient.first_name} {patient.middle_name || ""} {patient.last_name}
                            </h6>
                            <small className="text-muted">
                              ID: {patient.id} | 
                              {patient.contact_number && ` Contact: ${patient.contact_number} |`}
                              {patient.birthdate && ` Birthdate: ${formatDate(patient.birthdate)} |`}
                              Sex: {patient.sex || "N/A"}
                            </small>
                          </div>
                          <span className="badge bg-secondary">Select</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!loadingPatients && patientSearchQuery && patientResults.length === 0 && (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-search display-4"></i>
                    <p className="mt-2">No unlinked patients found</p>
                  </div>
                )}

                {!patientSearchQuery && patientResults.length === 0 && !selectedPatient && (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-person-plus display-4"></i>
                    <p className="mt-2">Enter a search query to find patients</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Search Section */}
        <div className="col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">
                <i className="bi bi-person-circle me-2"></i>
                Step 2: Select User Account
              </h5>
            </div>
            <div className="card-body">
              {/* Search Input */}
              <div className="mb-3">
                <label className="form-label">Search Unlinked Patient Users</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name, email, or contact..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && searchUsers()}
                  />
                  <button className="btn btn-success" onClick={searchUsers} disabled={loadingUsers}>
                    {loadingUsers ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Searching...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-search me-1"></i>
                        Search
                      </>
                    )}
                  </button>
                </div>
                <small className="form-text text-muted">
                  Only shows patient role users without linked patient records
                </small>
              </div>

              {/* Selected User Display */}
              {selectedUser && (
                <div className="alert alert-success border-success">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-1">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        Selected User
                      </h6>
                      <p className="mb-1">
                        <strong>{selectedUser.name}</strong>
                      </p>
                      <small className="text-muted">
                        ID: {selectedUser.id} | Email: {selectedUser.email} | 
                        Contact: {selectedUser.contact_number || "N/A"}
                      </small>
                    </div>
                    <button className="btn btn-sm btn-outline-secondary" onClick={clearUserSelection}>
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* User Results */}
              <div className="search-results" style={{ maxHeight: "400px", overflowY: "auto" }}>
                {userResults.length > 0 && !selectedUser && (
                  <div className="list-group">
                    {userResults.map((user) => (
                      <button
                        key={user.id}
                        className="list-group-item list-group-item-action"
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-1">{user.name}</h6>
                            <small className="text-muted">
                              ID: {user.id} | Email: {user.email}
                              {user.contact_number && ` | Contact: ${user.contact_number}`}
                            </small>
                          </div>
                          <span className="badge bg-secondary">Select</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!loadingUsers && userSearchQuery && userResults.length === 0 && (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-search display-4"></i>
                    <p className="mt-2">No unlinked user accounts found</p>
                  </div>
                )}

                {!userSearchQuery && userResults.length === 0 && !selectedUser && (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-person-circle display-4"></i>
                    <p className="mt-2">Enter a search query to find users</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Binding Action Section */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="mb-3">
                <i className="bi bi-arrow-left-right me-2"></i>
                Step 3: Bind Patient to User
              </h5>

              {selectedPatient && selectedUser ? (
                <div className="mb-3">
                  <div className="alert alert-light border">
                    <div className="row align-items-center">
                      <div className="col-md-5 text-start">
                        <strong className="text-primary">Patient:</strong>
                        <p className="mb-0">
                          {selectedPatient.first_name} {selectedPatient.middle_name || ""} {selectedPatient.last_name}
                        </p>
                        <small className="text-muted">ID: {selectedPatient.id}</small>
                      </div>
                      <div className="col-md-2">
                        <i className="bi bi-arrow-left-right display-6 text-warning"></i>
                      </div>
                      <div className="col-md-5 text-start">
                        <strong className="text-success">User:</strong>
                        <p className="mb-0">{selectedUser.name}</p>
                        <small className="text-muted">{selectedUser.email}</small>
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-warning btn-lg"
                    onClick={handleBind}
                    disabled={binding}
                  >
                    {binding ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Binding...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-link-45deg me-2"></i>
                        Bind Patient to User Account
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-muted">
                  <i className="bi bi-info-circle display-4"></i>
                  <p className="mt-2">Select both a patient and a user to proceed with binding</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientUserBinding;

