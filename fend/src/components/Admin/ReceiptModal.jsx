import { useEffect } from 'react';
import PropTypes from 'prop-types';

const ReceiptModal = ({ show, onHide, receiptData }) => {
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [show]);

  if (!show || !receiptData) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="modal-backdrop fade show" 
        style={{ zIndex: 1050 }}
        onClick={onHide}
      />
      
      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        tabIndex="-1" 
        style={{ zIndex: 1055 }}
        onClick={onHide}
      >
        <div 
          className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            {/* Modal Header */}
            <div className="modal-header border-bottom-0" style={{ background: 'linear-gradient(135deg, #0077be 0%, #005a8f 100%)' }}>
              <h5 className="modal-title text-white">
                <i className="bi bi-receipt me-2"></i>
                Receipt - {receiptData.receipt_number}
              </h5>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                onClick={onHide}
                aria-label="Close"
              />
            </div>

            {/* Modal Body */}
            <div className="modal-body p-4" style={{ backgroundColor: '#f8f9fa' }}>
              {/* Receipt Container */}
              <div className="receipt-container bg-white p-4 rounded shadow-sm">
                {/* Header */}
                <div className="text-center border-bottom pb-3 mb-4" style={{ borderBottomColor: '#0077be', borderBottomWidth: '3px' }}>
                  <h2 className="mb-1" style={{ color: '#0077be', fontSize: '28px', fontWeight: 'bold' }}>
                    {receiptData.clinic_name}
                  </h2>
                  <p className="text-muted mb-0" style={{ fontSize: '16px' }}>
                    {receiptData.receipt_type === 'visit' ? 'Visit Receipt' : 'Official Receipt'}
                  </p>
                </div>

                {/* Receipt and Clinic Info */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <h6 className="fw-bold mb-2 pb-1 border-bottom" style={{ color: '#0077be' }}>
                        Receipt Information
                      </h6>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Receipt No:</span>
                        <span className="fw-bold">{receiptData.receipt_number}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Date:</span>
                        <span>{receiptData.receipt_date}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Time:</span>
                        <span>{receiptData.receipt_time}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <div className="mb-3">
                      <h6 className="fw-bold mb-2 pb-1 border-bottom" style={{ color: '#0077be' }}>
                        Clinic Information
                      </h6>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Address:</span>
                        <span className="text-end">{receiptData.clinic_address}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Phone:</span>
                        <span>{receiptData.clinic_phone}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Email:</span>
                        <span>{receiptData.clinic_email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient Information */}
                <div className="mb-4">
                  <h6 className="fw-bold mb-2 pb-1 border-bottom" style={{ color: '#0077be' }}>
                    Patient Information
                  </h6>
                  <div className="row">
                    <div className="col-md-6 d-flex justify-content-between mb-1">
                      <span className="text-muted">Name:</span>
                      <span className="fw-bold">{receiptData.patient_name}</span>
                    </div>
                    {receiptData.patient_email && (
                      <div className="col-md-6 d-flex justify-content-between mb-1">
                        <span className="text-muted">Email:</span>
                        <span>{receiptData.patient_email}</span>
                      </div>
                    )}
                    {receiptData.patient_phone && (
                      <div className="col-md-6 d-flex justify-content-between mb-1">
                        <span className="text-muted">Phone:</span>
                        <span>{receiptData.patient_phone}</span>
                      </div>
                    )}
                    {receiptData.patient_address && (
                      <div className="col-md-6 d-flex justify-content-between mb-1">
                        <span className="text-muted">Address:</span>
                        <span className="text-end">{receiptData.patient_address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Service/Visit Details */}
                <div className="mb-4">
                  <h6 className="fw-bold mb-2 pb-1 border-bottom" style={{ color: '#0077be' }}>
                    {receiptData.receipt_type === 'visit' ? 'Visit Details' : 'Service Details'}
                  </h6>
                  <div className="p-3 rounded" style={{ backgroundColor: '#f8f9fa', borderLeft: '4px solid #0077be' }}>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Service:</span>
                      <span className="fw-bold">{receiptData.service_name}</span>
                    </div>
                    {receiptData.service_description && (
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Description:</span>
                        <span className="text-end">{receiptData.service_description}</span>
                      </div>
                    )}
                    
                    {/* Appointment Details */}
                    {receiptData.receipt_type === 'appointment' && (
                      <>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Appointment Date:</span>
                          <span>{receiptData.service_date}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Time Slot:</span>
                          <span>{receiptData.service_time}</span>
                        </div>
                        {receiptData.teeth_count && (
                          <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted">Teeth Count:</span>
                            <span>{receiptData.teeth_description}</span>
                          </div>
                        )}
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Status:</span>
                          <span className="badge bg-success">{receiptData.appointment_status}</span>
                        </div>
                      </>
                    )}
                    
                    {/* Visit Details */}
                    {receiptData.receipt_type === 'visit' && (
                      <>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Visit Date:</span>
                          <span>{receiptData.visit_date}</span>
                        </div>
                        {receiptData.start_time && receiptData.end_time && (
                          <div className="p-2 rounded mb-2" style={{ backgroundColor: '#d4edda', borderLeft: '4px solid #28a745' }}>
                            <div className="d-flex justify-content-between mb-1">
                              <span className="text-muted">Start Time:</span>
                              <span>{receiptData.start_time}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">End Time:</span>
                              <span>{receiptData.end_time}</span>
                            </div>
                          </div>
                        )}
                        {receiptData.teeth_treated && (
                          <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted">Teeth Treated:</span>
                            <span>{receiptData.teeth_treated}</span>
                          </div>
                        )}
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Status:</span>
                          <span className="badge bg-success">{receiptData.visit_status}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Payment Information */}
                <div className="mb-4">
                  <h6 className="fw-bold mb-2 pb-1 border-bottom" style={{ color: '#0077be' }}>
                    Payment Information
                  </h6>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead style={{ backgroundColor: '#f8f9fa' }}>
                        <tr>
                          <th style={{ color: '#0077be' }}>Payment Method</th>
                          <th style={{ color: '#0077be' }}>Reference</th>
                          <th style={{ color: '#0077be' }}>Amount</th>
                          <th style={{ color: '#0077be' }}>Date Paid</th>
                          <th style={{ color: '#0077be' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptData.payment_details && receiptData.payment_details.length > 0 ? (
                          receiptData.payment_details.map((payment, index) => (
                            <tr key={index}>
                              <td>{payment.method}</td>
                              <td>{payment.reference}</td>
                              <td>₱{parseFloat(payment.amount).toFixed(2)}</td>
                              <td>{payment.paid_at || 'N/A'}</td>
                              <td><span className="badge bg-success">{payment.status}</span></td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="text-center">No payment records found</td>
                          </tr>
                        )}
                        <tr style={{ backgroundColor: '#e3f2fd', fontWeight: 'bold' }}>
                          <td colSpan="2"><strong>Total Amount</strong></td>
                          <td style={{ color: '#28a745', fontSize: '16px' }}>
                            ₱{parseFloat(receiptData.total_amount).toFixed(2)}
                          </td>
                          <td colSpan="2"></td>
                        </tr>
                        <tr style={{ backgroundColor: '#e3f2fd', fontWeight: 'bold' }}>
                          <td colSpan="2"><strong>Total Paid</strong></td>
                          <td style={{ color: '#28a745', fontSize: '16px' }}>
                            ₱{parseFloat(receiptData.total_paid).toFixed(2)}
                          </td>
                          <td colSpan="2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Additional Notes */}
                {receiptData.notes && (
                  <div className="mb-4">
                    <div className="p-3 rounded" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}>
                      <h6 className="mb-2" style={{ color: '#856404' }}>Additional Notes</h6>
                      <p className="mb-0">{receiptData.notes}</p>
                    </div>
                  </div>
                )}

                {/* Visit Notes Indicator */}
                {receiptData.receipt_type === 'visit' && receiptData.has_notes && (
                  <div className="mb-4">
                    <div className="p-3 rounded" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}>
                      <h6 className="mb-2" style={{ color: '#856404' }}>Treatment Notes</h6>
                      <p className="mb-0">Detailed treatment notes and findings are available in your patient record. Please contact the clinic if you need a copy of your treatment notes.</p>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="text-center mt-4 pt-3 border-top">
                  <p className="fw-bold mb-2">Thank you for choosing Kreative Dental & Orthodontics!</p>
                  <p className="text-muted mb-1" style={{ fontSize: '12px' }}>Please keep this receipt for your records.</p>
                  <p className="text-muted mb-1" style={{ fontSize: '12px' }}>
                    For inquiries, please contact us at {receiptData.clinic_phone} or {receiptData.clinic_email}
                  </p>
                  <p className="text-muted" style={{ fontSize: '10px' }}>
                    Generated on {receiptData.receipt_date} at {receiptData.receipt_time}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onHide}>
                <i className="bi bi-x-circle me-2"></i>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

ReceiptModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  receiptData: PropTypes.object,
};

export default ReceiptModal;

