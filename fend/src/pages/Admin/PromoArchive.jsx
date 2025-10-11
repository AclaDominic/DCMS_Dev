import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../api/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { addClinicHeader } from "../../utils/pdfHeader";

export default function PromoArchive() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchive();
  }, [year]);

  const loadArchive = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/discounts-archive?year=${year}`);
      setPromos(data);
    } catch (err) {
      console.error("Failed to load archive", err);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Add decorative border around entire page
    doc.setDrawColor(0, 119, 182); // Brand blue
    doc.setLineWidth(2);
    doc.rect(20, 20, pageWidth - 40, pageHeight - 40);

    // Add inner border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
    doc.rect(30, 30, pageWidth - 60, pageHeight - 60);

    // Add clinic header using the original logo
    let currentY = await addClinicHeader(doc, 60);
    
    // Center the report title only
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 119, 182); // Brand blue
    doc.text(`Promo Archive — ${year}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 20;

    // MAIN DATA TABLE ONLY
    autoTable(doc, {
      startY: currentY,
      head: [["Service", "Start", "End", "Price", "Status", "Activated"]],
      body: promos.map((promo) => [
        promo.service?.name || "-",
        promo.start_date,
        promo.end_date,
        `PHP ${Number(promo.discounted_price).toFixed(2)}`,
        promo.status.charAt(0).toUpperCase() + promo.status.slice(1),
        promo.activated_at?.split("T")[0] || "-",
      ]),
      theme: "striped",
      margin: { left: 40, right: 40 },
      styles: {
        fontSize: 10,
        cellPadding: 8,
      },
      headStyles: {
        fillColor: [0, 119, 182], // Brand blue header
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 11,
      },
    });

    // Add footer with border
    const footerY = pageHeight - 50;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
    doc.line(30, footerY, pageWidth - 30, footerY);
    
    // Add generation date - centered
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Generated on ${currentDate}`, pageWidth / 2, footerY + 15, { align: 'center' });

    doc.save(`promo-archive-${year}.pdf`);
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "planned":
        return <span className="badge bg-secondary">Planned</span>;
      case "launched":
        return <span className="badge bg-success">Launched</span>;
      case "canceled":
        return <span className="badge bg-warning text-dark">Canceled</span>;
      case "done":
        return <span className="badge bg-dark">Done</span>;
      default:
        return <span className="badge bg-light text-dark">Unknown</span>;
    }
  };

  return (
    <div 
      className="promo-archive-page"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        minHeight: '100vh',
        width: '100vw',
        position: 'relative',
        left: 0,
        right: 0,
        padding: '1.5rem 2rem',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 fw-bold" style={{ color: '#1e293b' }}>
            📁 Promo Archive
          </h2>
          <p className="text-muted mb-0 mt-1">View and manage archived promotional campaigns</p>
        </div>
        <div className="d-flex gap-3 align-items-center">
          <div>
            <label className="form-label fw-semibold mb-1">Filter by Year</label>
            <select
              className="form-control border-0 shadow-sm"
              style={{ 
                width: 120,
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500'
              }}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {[...Array(currentYear - 2022)].map((_, i) => {
                const y = currentYear - i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>
          <button 
            className="btn border-0 shadow-sm" 
            onClick={exportToPDF}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              borderRadius: '12px',
              padding: '12px 24px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              marginTop: '24px'
            }}
          >
            <i className="bi bi-download me-2"></i>
            Export PDF
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
        <div className="card-body p-0">
          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
              <div className="text-center">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted">Loading archived promos...</p>
              </div>
            </div>
          ) : (
            <div className="table-responsive" style={{ width: '100%' }}>
              <table className="table table-hover mb-0" style={{ width: '100%', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '24%' }} />
                </colgroup>
                <thead className="table-primary">
                  <tr>
                    <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem' }}>
                      <i className="bi bi-tag me-2"></i>Service Name
                    </th>
                    <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem' }}>
                      <i className="bi bi-calendar-event me-2"></i>Start Date
                    </th>
                    <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem' }}>
                      <i className="bi bi-calendar-x me-2"></i>End Date
                    </th>
                    <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem' }}>
                      <i className="bi bi-currency-dollar me-2"></i>Discounted Price
                    </th>
                    <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem' }}>
                      <i className="bi bi-activity me-2"></i>Status
                    </th>
                    <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem' }}>
                      <i className="bi bi-clock-history me-2"></i>Date Activated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {promos.length > 0 ? (
                    promos.map((promo) => (
                      <tr key={promo.id} className="align-middle" style={{ height: '60px' }}>
                        <td className="px-4 py-3 fw-medium border-0" style={{ fontSize: '1rem' }}>
                          <div className="d-flex align-items-center">
                            <div className="bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" 
                                 style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                              🦷
                            </div>
                            <div>
                              <div className="fw-bold text-dark">{promo.service?.name || "-"}</div>
                              <small className="text-muted">Dental Service</small>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                          <div className="d-flex flex-column">
                            <span className="fw-semibold text-dark">{promo.start_date}</span>
                            <small className="text-muted">Campaign Start</small>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                          <div className="d-flex flex-column">
                            <span className="fw-semibold text-dark">{promo.end_date}</span>
                            <small className="text-muted">Campaign End</small>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                          <div className="d-flex flex-column">
                            <span className="fw-bold text-success fs-5">₱{Number(promo.discounted_price).toFixed(2)}</span>
                            <small className="text-muted">Promotional Price</small>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                          <div className="d-flex flex-column align-items-start">
                            {renderStatusBadge(promo.status)}
                            <small className="text-muted mt-1">Current State</small>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted border-0" style={{ fontSize: '1rem' }}>
                          <div className="d-flex flex-column">
                            <span className="fw-semibold text-dark">{promo.activated_at?.split("T")[0] || "-"}</span>
                            <small className="text-muted">
                              {promo.activated_at ? "Launch Date" : "Not Activated"}
                            </small>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center text-muted border-0" style={{ height: '400px' }}>
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                          <div className="bg-light rounded-circle mb-4 d-flex align-items-center justify-content-center" 
                               style={{ width: '120px', height: '120px', fontSize: '3rem' }}>
                            📁
                          </div>
                          <h3 className="text-muted mb-3">No promos found for {year}</h3>
                          <p className="text-muted mb-4 fs-5">This year doesn't have any promotional campaigns yet.</p>
                          <div className="d-flex gap-3">
                            <button className="btn btn-outline-primary">
                              <i className="bi bi-plus-circle me-2"></i>Create New Promo
                            </button>
                            <button className="btn btn-outline-secondary">
                              <i className="bi bi-calendar me-2"></i>Try Different Year
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
