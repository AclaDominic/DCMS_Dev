import { useState } from "react";
import teethChartImage from "../../pages/Dentist/Teeth_Chart.png";

const PatientToothAssistant = () => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      {/* Floating Assistant Icon */}
      <div
        className="position-fixed"
        style={{
          bottom: '80px',
          right: '20px',
          zIndex: 1050,
        }}
      >
        <button
          className="btn btn-primary rounded-circle shadow-lg"
          style={{
            width: '60px',
            height: '60px',
            fontSize: '24px',
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
          }}
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          title="Tooth Chart Reference"
        >
          <i className="bi bi-tooth text-white"></i>
        </button>
      </div>

      {/* Hoverable Tooth Chart Reference */}
      {isVisible && (
        <div
          className="position-fixed shadow-lg"
          style={{
            bottom: '150px',
            right: '20px',
            zIndex: 1060,
            width: '400px',
            maxWidth: '90vw',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            animation: 'slideInUp 0.3s ease-out'
          }}
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          <div className="p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 text-primary">
                <i className="bi bi-tooth me-2"></i>
                Tooth Chart Reference
              </h6>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setIsVisible(false)}
                style={{ padding: '2px 6px' }}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            
            <div className="text-center mb-3">
              <img 
                src={teethChartImage} 
                alt="Dental Chart Reference" 
                className="img-fluid"
                style={{ 
                  maxWidth: '300px', 
                  height: 'auto',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  backgroundColor: '#f8f9fa'
                }}
              />
            </div>
            
            <div className="text-center">
              <h6 className="text-primary mb-2">Universal Numbering System</h6>
              
              {/* Upper Teeth Layout */}
              <div className="mb-3">
                <small className="text-muted d-block mb-2">UPPER TEETH (1-16)</small>
                <div className="d-flex justify-content-center flex-wrap gap-1">
                  {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(toothNumber => (
                    <span
                      key={toothNumber}
                      className="badge bg-light text-dark border"
                      style={{ 
                        width: '20px', 
                        height: '20px',
                        fontSize: '10px',
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
              <div className="mb-3">
                <small className="text-muted d-block mb-2">LOWER TEETH (32-17)</small>
                <div className="d-flex justify-content-center flex-wrap gap-1">
                  {[32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17].map(toothNumber => (
                    <span
                      key={toothNumber}
                      className="badge bg-light text-dark border"
                      style={{ 
                        width: '20px', 
                        height: '20px',
                        fontSize: '10px',
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
              
              <div className="alert alert-info py-2 mb-0" style={{ fontSize: '12px' }}>
                <i className="bi bi-info-circle me-1"></i>
                Use this chart to understand which teeth were treated in your appointments
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default PatientToothAssistant;
