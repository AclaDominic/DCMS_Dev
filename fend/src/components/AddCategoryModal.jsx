import { useState } from "react";
import api from "../api/api";

export default function AddCategoryModal({ show, onClose, onCategoryAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const response = await api.post("/api/service-categories", formData);
      
      // Call the callback to refresh categories
      if (onCategoryAdded) {
        onCategoryAdded(response.data);
      }
      
      // Reset form and close modal
      setFormData({ name: "", description: "" });
      onClose();
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        console.error("Failed to create category:", error);
        setErrors({ general: "Failed to create category. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", description: "" });
    setErrors({});
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal fade show" style={{ 
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      zIndex: 1050,
      overflowY: "auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem"
    }} tabIndex="-1">
      <div className="modal-dialog" style={{ 
        margin: "0 auto",
        maxHeight: "calc(100vh - 2rem)",
        width: "100%"
      }}>
        <div className="modal-content" style={{
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 2rem)",
          overflow: "hidden"
        }}>
          <div className="modal-header flex-shrink-0" style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            backgroundColor: "#fff",
            borderBottom: "1px solid #dee2e6"
          }}>
            <h5 className="modal-title">Add New Service Category</h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
              disabled={loading}
            ></button>
          </div>
          
          <form onSubmit={handleSubmit} style={{
            display: "flex",
            flexDirection: "column",
            flex: "1 1 auto",
            minHeight: 0,
            overflow: "hidden"
          }}>
            <div className="modal-body flex-grow-1" style={{
              overflowY: "auto",
              overflowX: "hidden",
              flex: "1 1 auto",
              minHeight: 0
            }}>
              {errors.general && (
                <div className="alert alert-danger" role="alert">
                  {errors.general}
                </div>
              )}
              
              <div className="mb-3">
                <label htmlFor="name" className="form-label">
                  Category Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.name ? "is-invalid" : ""}`}
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter category name"
                  required
                />
                {errors.name && (
                  <div className="invalid-feedback">
                    {errors.name[0]}
                  </div>
                )}
              </div>
              
              <div className="mb-3">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <textarea
                  className={`form-control ${errors.description ? "is-invalid" : ""}`}
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter category description (optional)"
                  rows="3"
                />
                {errors.description && (
                  <div className="invalid-feedback">
                    {errors.description[0]}
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer flex-shrink-0" style={{
              position: "sticky",
              bottom: 0,
              zIndex: 1,
              backgroundColor: "#fff",
              borderTop: "1px solid #dee2e6"
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Adding...
                  </>
                ) : (
                  "Add Category"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
