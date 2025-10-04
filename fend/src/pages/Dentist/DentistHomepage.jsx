import { useState } from "react";
import api from "../../api/api";

function DentistHomepage() {
  const [visitCode, setVisitCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleVisitCodeSubmit = async (e) => {
    e.preventDefault();
    if (!visitCode.trim()) {
      setMessage("Please enter a visit code.");
      return;
    }

    setLoading(true);
    setMessage("");
    
    try {
      // TODO: Implement visit code processing
      console.log("Visit code submitted:", visitCode);
      setMessage("Visit code processing will be implemented soon.");
    } catch (err) {
      setMessage("Error processing visit code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dentist-homepage">
      {/* Visit Code Section */}
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow">
              <div className="card-header bg-primary text-white text-center">
                <h4 className="mb-0">
                  <i className="bi bi-qr-code me-2"></i>
                  Enter Visit Code
                </h4>
              </div>
              <div className="card-body">
                <form onSubmit={handleVisitCodeSubmit}>
                  <div className="mb-3">
                    <label htmlFor="visitCode" className="form-label">
                      Visit Code
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      id="visitCode"
                      value={visitCode}
                      onChange={(e) => setVisitCode(e.target.value)}
                      placeholder="Enter visit code"
                      autoFocus
                    />
                  </div>
                  <div className="d-grid">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-search me-2"></i>
                          Process Visit
                        </>
                      )}
                    </button>
                  </div>
                </form>
                
                {message && (
                  <div className={`alert ${message.includes("Error") ? "alert-danger" : "alert-info"} mt-3 mb-0`}>
                    <i className={`bi ${message.includes("Error") ? "bi-exclamation-triangle" : "bi-info-circle"} me-2`}></i>
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DentistHomepage;
