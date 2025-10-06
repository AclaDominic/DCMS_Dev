import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import HmoPicker from "../../components/HmoPicker";
import ServiceSelectionModal from "../../components/ServiceSelectionModal";
// date helpers
function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function sevenDaysOutStr() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function BookAppointment() {
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState("");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showServiceModal, setShowServiceModal] = useState(false);

  const [selectedService, setSelectedService] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bookingMessage, setBookingMessage] = useState("");
  const [teethCount, setTeethCount] = useState("");

  // NEW: for HMO picker
  const [myPatientId, setMyPatientId] = useState(null);
  const [patientHmoId, setPatientHmoId] = useState(null);
  const [loadingPatientId, setLoadingPatientId] = useState(false);

  // try to get the logged-in patient's id
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingPatientId(true);
      try {
        const { data } = await api.get("/api/user");
        const pid = data?.patient?.id ?? null;
        if (mounted && pid) setMyPatientId(Number(pid));
      } catch (_) {
        // ignore; HMO section will show a warning
      } finally {
        if (mounted) setLoadingPatientId(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const fetchServices = async (date) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/appointment/available-services?date=${date}`);
      setServices(res.data);
    } catch (err) {
      setServices([]);
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async (serviceId) => {
    setAvailableSlots([]);
    try {
      const res = await api.get(
        `/api/appointment/available-slots?date=${selectedDate}&service_id=${serviceId}`
      );
      setAvailableSlots(res.data.slots);
    } catch {
      setAvailableSlots([]);
    }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setServices([]);
    setSelectedService(null);
    setAvailableSlots([]);
    setSelectedSlot("");
    setPaymentMethod("cash");
    setPatientHmoId(null); // reset HMO when date changes
    setBookingMessage("");
    setTeethCount("");
    setShowServiceModal(false);
    if (date) {
      fetchServices(date);
      setShowServiceModal(true);
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    fetchSlots(service.id);
    setSelectedSlot("");
    setBookingMessage("");
    setTeethCount(""); // Reset teeth treated when changing service
    setShowServiceModal(false);
  };

  const handlePaymentChange = (e) => {
    const v = e.target.value;
    setPaymentMethod(v);
    if (v !== "hmo") {
      setPatientHmoId(null); // clear selection when leaving HMO
    }
  };

  const handleBookingSubmit = async () => {
    if (!selectedDate || !selectedService || !selectedSlot || !paymentMethod) {
      setBookingMessage("Please complete all booking fields.");
      return;
    }

    if (paymentMethod === "hmo" && !patientHmoId) {
      setBookingMessage("Please select an HMO for this appointment.");
      return;
    }

    try {
      const payload = {
        service_id: selectedService.id,
        date: selectedDate,
        start_time: selectedSlot,
        payment_method: paymentMethod,
      };
      if (paymentMethod === "hmo") {
        payload.patient_hmo_id = patientHmoId;
      }
      if (selectedService.per_teeth_service && teethCount) {
        payload.teeth_count = parseInt(teethCount);
      }

      await api.post("/api/appointment", payload);

      setBookingMessage("✅ Appointment successfully booked! Redirecting...");
      setTimeout(() => {
        navigate("/patient");
      }, 2000);
    } catch (err) {
      setBookingMessage(err?.response?.data?.message || "Booking failed.");
    }
  };

  return (
    <div className="w-100">
      <div className="card border-0 shadow-lg w-100 patient-page-card">
            <div className="card-header bg-gradient bg-primary text-white text-center py-4">
              <h2 className="h3 mb-2">
                <i className="bi bi-calendar-plus me-2"></i>
                Book an Appointment
              </h2>
              <p className="mb-0 opacity-75">Schedule your dental visit with ease</p>
            </div>
            <div className="card-body p-5">
              <div className="mb-4">
                <label className="form-label fw-semibold fs-5 mb-3">
                  <i className="bi bi-calendar3 me-2 text-primary"></i>
                  Select a Date
                </label>
                <input
                  type="date"
                  className="form-control form-control-lg border-2"
                  value={selectedDate}
                  onChange={handleDateChange}
                  min={tomorrowStr()}
                  max={sevenDaysOutStr()}
                  style={{ fontSize: '1.1rem' }}
                />
                <div className="form-text mt-2">
                  <i className="bi bi-info-circle me-1"></i>
                  Appointments can be booked from tomorrow up to 7 days in advance
                </div>
              </div>

              {selectedDate && !selectedService && (
                <div className="mt-5">
                  <div className="alert alert-info border-0 shadow-sm" role="alert">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-calendar-check me-3 fs-4"></i>
                      <div>
                        <strong>Date Selected:</strong><br/>
                        <span className="fs-5">{new Date(selectedDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center mt-4">
                    <button 
                      className="btn btn-primary btn-lg px-5 py-3"
                      onClick={() => setShowServiceModal(true)}
                      disabled={loading}
                      style={{ fontSize: '1.1rem', borderRadius: '10px' }}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Loading Services...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-list-ul me-2"></i>
                          View Available Services
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {selectedService && (
                <div className="mt-4">
                  <div className="alert alert-success border-0 shadow-sm" role="alert">
                    <div className="d-flex align-items-center justify-content-between flex-wrap">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-check-circle me-3 fs-4"></i>
                        <div>
                          <strong>Service Selected:</strong><br/>
                          <span className="fs-5">{selectedService.name}</span><br/>
                          <span className="text-success fw-semibold">
                            ₱{Number(selectedService.price || selectedService.promo_price).toLocaleString()}
                            {selectedService.per_teeth_service ? ' per tooth' : ''}
                          </span>
                          {selectedService.per_teeth_service && (
                            <div className="mt-2">
                              <small className="text-info">
                                <i className="bi bi-info-circle me-1"></i>
                                Total cost depends on number of teeth treated
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                      <button 
                        className="btn btn-outline-success btn-sm mt-3 mt-md-0"
                        onClick={() => setShowServiceModal(true)}
                      >
                        <i className="bi bi-pencil me-1"></i>
                        Change Service
                      </button>
                    </div>
                  </div>
                </div>
              )}


              {selectedService && (
                <div className="mt-5">
                  {/* Consultation Recommendation for Per-Teeth Services */}
                  {selectedService.per_teeth_service && (
                    <div className="alert alert-info border-0 shadow-sm mb-4" role="alert">
                      <div className="d-flex align-items-start">
                        <i className="bi bi-lightbulb me-3 fs-4 text-info"></i>
                        <div>
                          <h6 className="alert-heading text-info mb-2">
                            <i className="bi bi-tooth me-2"></i>
                            Per-Teeth Service Recommendation
                          </h6>
                          <p className="mb-2">
                            For per-teeth services, we recommend scheduling a <strong>consultation first</strong> to determine:
                          </p>
                          <ul className="mb-2 ps-3">
                            <li>How many teeth need treatment</li>
                            <li>The appropriate procedure for each tooth</li>
                            <li>Accurate cost estimation</li>
                          </ul>
                          <p className="mb-0">
                            <strong>If you already know the details, please proceed with booking.</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-top pt-4">
                    <h4 className="h5 mb-4">
                      <i className="bi bi-clock me-2 text-primary"></i>
                      Complete Your Booking
                    </h4>

                    {availableSlots.length === 0 && (
                      <div className="alert alert-warning border-0 shadow-sm">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        No available slots for this date and service. Please select a different date or service.
                      </div>
                    )}

                    {availableSlots.length > 0 && (
                      <>
                        <div className="mb-4">
                          <label className="form-label fw-semibold fs-6 mb-3">
                            <i className="bi bi-clock me-2 text-primary"></i>
                            Available Time Slots
                          </label>
                          <select
                            className="form-select form-select-lg border-2"
                            value={selectedSlot}
                            onChange={(e) => setSelectedSlot(e.target.value)}
                            style={{ fontSize: '1.1rem' }}
                          >
                            <option value="">-- Select Time Slot --</option>
                            {availableSlots.map((slot) => (
                              <option key={slot} value={slot}>
                                {slot}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Teeth Count Input for Per-Teeth Services */}
                        {selectedService.per_teeth_service && (
                          <div className="mb-4">
                            <label className="form-label fw-semibold fs-6 mb-3">
                              <i className="bi bi-tooth me-2 text-primary"></i>
                              Number of Teeth to be Treated <span className="text-muted">(optional)</span>
                            </label>
                            <input
                              type="number"
                              className="form-control form-control-lg border-2"
                              placeholder="e.g., 3"
                              value={teethCount}
                              onChange={(e) => setTeethCount(e.target.value)}
                              min="1"
                              max="32"
                              style={{ fontSize: '1.1rem' }}
                            />
                            <div className="form-text mt-2">
                              <i className="bi bi-info-circle me-1"></i>
                              Enter the number of teeth that need treatment. Leave blank if you're unsure - we'll determine this during your visit.
                              {teethCount && (
                                <div className="mt-2">
                                  <strong>Estimated cost:</strong> ₱{Number(selectedService.price || selectedService.promo_price) * parseInt(teethCount || 0).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mb-4">
                          <label className="form-label fw-semibold fs-6 mb-3">
                            <i className="bi bi-credit-card me-2 text-primary"></i>
                            Payment Method
                          </label>
                          <select 
                            className="form-select form-select-lg border-2" 
                            value={paymentMethod} 
                            onChange={handlePaymentChange}
                            style={{ fontSize: '1.1rem' }}
                          >
                            <option value="cash">💵 Cash (on-site payment)</option>
                            <option value="maya">💳 Maya (online payment)</option>
                            <option value="hmo">🏥 HMO (insurance)</option>
                          </select>
                        </div>

                        {paymentMethod === "hmo" && (
                          <div className="mb-4">
                            <label className="form-label fw-semibold fs-6 mb-3">
                              <i className="bi bi-hospital me-2 text-primary"></i>
                              Choose HMO Provider
                            </label>
                            {loadingPatientId ? (
                              <div className="text-muted p-3 border rounded">
                                <i className="bi bi-hourglass-split me-2"></i>
                                Loading HMO list…
                              </div>
                            ) : myPatientId ? (
                              <HmoPicker
                                patientId={myPatientId}
                                value={patientHmoId}
                                onChange={setPatientHmoId}
                                required
                              />
                            ) : (
                              <div className="alert alert-warning border-0 shadow-sm">
                                <i className="bi bi-exclamation-triangle me-2"></i>
                                We couldn't load your patient profile. You may need to link your account at the
                                clinic, or try again later.
                              </div>
                            )}
                          </div>
                        )}

                        <div className="d-grid mt-5">
                          <button 
                            className="btn btn-success btn-lg py-3" 
                            onClick={handleBookingSubmit}
                            style={{ fontSize: '1.2rem', borderRadius: '10px' }}
                          >
                            <i className="bi bi-check-circle me-2"></i>
                            Confirm Appointment
                          </button>
                        </div>
                        
                        {bookingMessage && (
                          <div className={`alert mt-4 border-0 shadow-sm ${bookingMessage.includes('✅') ? 'alert-success' : 'alert-info'}`}>
                            <i className={`bi ${bookingMessage.includes('✅') ? 'bi-check-circle' : 'bi-info-circle'} me-2`}></i>
                            {bookingMessage}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
      
      {/* Service Selection Modal */}
      <ServiceSelectionModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        services={services}
        loading={loading}
        error={error}
        onServiceSelect={handleServiceSelect}
        selectedDate={selectedDate}
        selectedService={selectedService}
      />
    </div>
  );
}

export default BookAppointment;
