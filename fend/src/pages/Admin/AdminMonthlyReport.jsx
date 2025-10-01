import { useEffect, useMemo, useState } from "react";
import api from "../../api/api";
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar } from "react-chartjs-2";
import { addClinicHeader } from "../../utils/pdfHeader";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  ChartTooltip,
  ChartLegend,
  ChartDataLabels
);

export default function AdminMonthlyReport() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ totals: { visits: 0, inquiries: 0 }, by_hour: [], by_service: [], by_visit_type: [] });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/reports/visits-monthly", { params: { month } });
      console.log("Monthly report API response:", res.data);
      setData(res.data || {});
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const byHour = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < 24; i++) map.set(i, 0);
    (data.by_hour || []).forEach((r) => {
      const h = Number(r.hour) || 0;
      map.set(h, (map.get(h) || 0) + (Number(r.count) || 0));
    });
    return Array.from(map.entries()).map(([h, count]) => ({ label: String(h).padStart(2, "0"), count }));
  }, [data.by_hour]);

  const byService = useMemo(() => {
    const result = (data.by_service || []).map((r) => {
      const totalCount = Number(r.count) || 0;
      const walkinCount = Number(r.walkin || 0);
      const appointmentCount = Number(r.appointment || 0);
      
      // If walk-in/appointment breakdown is not available, estimate based on visit type data
      let walkin = walkinCount;
      let appointment = appointmentCount;
      
      if (walkinCount === 0 && appointmentCount === 0 && totalCount > 0) {
        // Fallback: estimate based on overall visit type distribution
        const totalVisits = data?.totals?.visits || 0;
        const visitTypeData = data.by_visit_type || [];
        const walkinTotal = visitTypeData.find(vt => vt.visit_type === 'walkin')?.count || 0;
        const appointmentTotal = visitTypeData.find(vt => vt.visit_type === 'appointment')?.count || 0;
        
        if (totalVisits > 0) {
          const walkinRatio = Number(walkinTotal) / totalVisits;
          const appointmentRatio = Number(appointmentTotal) / totalVisits;
          
          walkin = Math.round(totalCount * walkinRatio);
          appointment = Math.round(totalCount * appointmentRatio);
          
          // Ensure the sum equals totalCount
          const sum = walkin + appointment;
          if (sum !== totalCount) {
            appointment = totalCount - walkin;
          }
        } else {
          // Default split if no data available
          walkin = Math.round(totalCount * 0.6); // 60% walk-in
          appointment = totalCount - walkin;
        }
      }
      
      return { 
        label: r.service_name || "(Unspecified)", 
        count: totalCount,
        walkin,
        appointment
      };
    });
    
    console.log("Processed byService data:", result);
    return result;
  }, [data.by_service, data.by_visit_type, data.totals]);

  // ------ Chart helpers ------

  const hourAvgMap = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < 24; i++) map.set(i, 0);
    (data.by_hour_avg_per_day || []).forEach((r) => {
      const h = Number(r.hour) || 0;
      map.set(h, Number(r.avg_per_day) || 0);
    });
    return map;
  }, [data.by_hour_avg_per_day]);

  const hourBarData = useMemo(() => ({
    labels: byHour.map((d) => d.label),
    datasets: [
      {
        label: "Total (month)",
        data: byHour.map((d) => d.count),
        backgroundColor: "rgba(25,135,84,0.85)",
        borderColor: "#198754",
        borderWidth: 1,
        type: "bar",
        yAxisID: "y",
      },
      {
        label: "Avg per day",
        data: byHour.map((d) => Number(hourAvgMap.get(Number(d.label)) || 0)),
        borderColor: "#0d6efd",
        backgroundColor: "rgba(13,110,253,0.25)",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        type: "line",
        yAxisID: "y",
      },
    ],
  }), [byHour, hourAvgMap]);

  const defaultDatalabels = {
    color: "#fff",
    font: { weight: "bold" },
    formatter: (v) => (v > 0 ? v : ""),
  };

  const hourBarOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        labels: { font: { size: 11 } }
      },
      tooltip: { enabled: true },
      datalabels: {
        anchor: "end",
        align: "end",
        offset: 2,
        font: { size: 9 },
        ...defaultDatalabels,
      },
    },
    scales: {
      x: { 
        title: { display: true, text: "Hour of Day", font: { size: 12 } },
        ticks: { font: { size: 11 } }
      },
      y: { 
        title: { display: true, text: "Visits (total) / Avg per day", font: { size: 12 } }, 
        beginAtZero: true, 
        ticks: { precision: 0, font: { size: 11 } }
      },
    },
  }), []);

  const serviceBarData = useMemo(() => ({
    labels: byService.map((d) => d.label),
    datasets: [
      {
        label: "Walk-in",
        data: byService.map((d) => d.walkin),
        backgroundColor: "#0d6efd",
        borderColor: "#0d6efd",
        borderWidth: 1,
      },
      {
        label: "Appointment",
        data: byService.map((d) => d.appointment),
        backgroundColor: "#6c757d",
        borderColor: "#6c757d",
        borderWidth: 1,
      },
    ],
  }), [byService]);

  const serviceBarOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        labels: { font: { size: 11 } }
      },
      tooltip: { enabled: true },
      datalabels: {
        anchor: "end",
        align: "end",
        offset: 2,
        font: { size: 9 },
        ...defaultDatalabels,
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Service", font: { size: 12 } },
        ticks: { 
          autoSkip: false, 
          maxRotation: 60, 
          minRotation: 30,
          font: { size: 10 }
        },
      },
      y: { 
        title: { display: true, text: "Visits", font: { size: 12 } }, 
        beginAtZero: true, 
        ticks: { precision: 0, font: { size: 11 } }
      },
    },
  }), []);


  // ------ Summaries for insights ------

  // Hourly peaks (byHour)
  const hourSummary = useMemo(() => {
    if (!byHour.length) return null;
    const peak = byHour.reduce((a, b) => (a.count > b.count ? a : b));
    const avgPerHour = byHour.reduce((sum, h) => sum + h.count, 0) / byHour.length;
    return { peakHour: Number(peak.label), peakCount: peak.count, avgPerHour };
  }, [byHour]);


  // Top service (byService)
  const serviceSummary = useMemo(() => {
    if (!byService.length) return null;
    const total = byService.reduce((sum, srow) => sum + srow.count, 0);
    const top = byService.reduce((a, b) => (a.count > b.count ? a : b));
    const topShare = total ? (top.count / total) * 100 : 0;
    const topWalkin = top.walkin > top.appointment;
    return { 
      topService: top.label, 
      topCount: top.count, 
      topShare, 
      total,
      topWalkin
    };
  }, [byService]);

  const downloadPdf = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      
      // Helper function to add section title
      const addSectionTitle = (doc, title, currentY) => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 119, 182); // Brand color
        doc.text(title, 40, currentY);
        
        // Reset text color for normal text
        doc.setTextColor(0, 0, 0);
        return currentY + 15;
      };

      // Add clinic header
      let currentY = await addClinicHeader(doc, 20);
      
      // Add report title
      doc.setFontSize(14);
      doc.text(`Monthly Visits Report — ${month}`, 40, currentY);
      currentY += 30;

      // SECTION 1: OVERVIEW
      currentY = addSectionTitle(doc, "Overview", currentY);
      
      autoTable(doc, {
        startY: currentY,
        head: [["Metric", "Value"]],
        body: [
          ["Total Visits", String(data?.totals?.visits ?? 0)],
          ["Inquiries This Month", String(data?.totals?.inquiries ?? 0)]
        ],
        theme: "striped",
      });

      // SECTION 2: HOURLY ANALYSIS
      currentY = addSectionTitle(doc, "Hourly Visit Analysis", (doc.lastAutoTable?.finalY || 100) + 20);

      autoTable(doc, {
        startY: currentY,
        head: [["Hour", "Total (month)", "Avg/day"]],
        body: (byHour || []).map((r) => [
          r.label,
          String(r.count),
          String((Number(hourAvgMap.get(Number(r.label)) || 0)).toFixed(2)),
        ]),
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [25, 135, 84] },
      });

      // Insight for By Hour
      if (hourSummary) {
        autoTable(doc, {
          startY: (doc.lastAutoTable?.finalY || 100) + 8,
          head: [["Insight"]],
          body: [[
            `On average, about ${hourSummary.avgPerHour.toFixed(1)} patients come per hour. ` +
            `The busiest time is ${hourSummary.peakHour}:00 (${hourSummary.peakCount} visits). ` +
            `More staff should be available at this time.`,
          ]],
          theme: "plain",
          styles: { fontSize: 8, textColor: 100, cellPadding: 2 },
          headStyles: { fontStyle: "bold", textColor: 120 },
          columnStyles: { 0: { cellWidth: 515 } },
          margin: { left: 40, right: 40 },
        });
      }

      // SECTION 3: SERVICE ANALYSIS
      currentY = addSectionTitle(doc, "Service Usage Analysis", (doc.lastAutoTable?.finalY || 100) + 20);

      autoTable(doc, {
        startY: currentY,
        head: [["Service", "Walk-in", "Appointment", "Total"]],
        body: (byService || []).map((r) => [r.label, String(r.walkin), String(r.appointment), String(r.count)]),
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [220, 53, 69] },
      });

      // Insight for By Service
      if (serviceSummary) {
        autoTable(doc, {
          startY: (doc.lastAutoTable?.finalY || 100) + 8,
          head: [["Insight"]],
          body: [[
            `Most patients came for ${serviceSummary.topService} (${serviceSummary.topCount} visits, ` +
            `${serviceSummary.topShare.toFixed(0)}% of total). ` +
            `Most were booked by ${serviceSummary.topWalkin ? 'walk-in' : 'appointment'}.`,
          ]],
          theme: "plain",
          styles: { fontSize: 8, textColor: 100, cellPadding: 2 },
          headStyles: { fontStyle: "bold", textColor: 120 },
          columnStyles: { 0: { cellWidth: 515 } },
          margin: { left: 40, right: 40 },
        });
      }

      doc.save(`visits-report-${month}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF.");
    }
  };

  const downloadExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Overview Sheet
      const overviewData = [
        ["Metric", "Value"],
        ["Total Visits", data?.totals?.visits ?? 0],
        ["Inquiries This Month", data?.totals?.inquiries ?? 0]
      ];
      
      const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(workbook, overviewSheet, "Overview");

      // Hourly Analysis Sheet
      if (byHour?.length > 0) {
        const hourlyData = [
          ["Hour", "Visits", "Walk-ins", "Appointments"],
          ...byHour.map(hour => [
            hour.label,
            hour.count,
            hour.walkin,
            hour.appointment
          ])
        ];
        
        const hourlySheet = XLSX.utils.aoa_to_sheet(hourlyData);
        XLSX.utils.book_append_sheet(workbook, hourlySheet, "Hourly Analysis");
      }

      // Service Analysis Sheet
      if (byService?.length > 0) {
        const serviceData = [
          ["Service", "Total Visits", "Walk-ins", "Appointments", "Walk-in %", "Appointment %"],
          ...byService.map(service => {
            const totalCount = service.count || 0;
            const walkinCount = service.walkin || 0;
            const appointmentCount = service.appointment || 0;
            
            // Calculate percentages
            const walkinPercentage = totalCount > 0 ? ((walkinCount / totalCount) * 100).toFixed(1) : 0;
            const appointmentPercentage = totalCount > 0 ? ((appointmentCount / totalCount) * 100).toFixed(1) : 0;
            
            return [
              service.label,
              totalCount,
              walkinCount,
              appointmentCount,
              parseFloat(walkinPercentage),
              parseFloat(appointmentPercentage)
            ];
          })
        ];
        
        const serviceSheet = XLSX.utils.aoa_to_sheet(serviceData);
        XLSX.utils.book_append_sheet(workbook, serviceSheet, "Service Analysis");
      }

      // Detailed Visit Data Sheet (if available)
      if (data?.visits?.length > 0) {
        const visitData = [
          ["Date", "Time", "Service", "Type", "Patient ID", "Status"],
          ...data.visits.map(visit => [
            visit.date,
            visit.time,
            visit.service,
            visit.type,
            visit.patient_id,
            visit.status
          ])
        ];
        
        const visitSheet = XLSX.utils.aoa_to_sheet(visitData);
        XLSX.utils.book_append_sheet(workbook, visitSheet, "Visit Details");
      }

      XLSX.writeFile(workbook, `visits-report-${month}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate Excel file.");
    }
  };

  return (
    <div className="p-2 p-md-3">
      {/* Responsive Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">
        <h3 className="m-0 fs-4 fs-md-3">📈 Monthly Visits Report</h3>
        <div className="d-flex flex-column flex-sm-row gap-2 align-items-stretch align-items-sm-center w-100 w-md-auto">
          <input
            type="month"
            className="form-control form-control-sm"
            style={{ minWidth: 150, maxWidth: 170 }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Select month"
          />
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
              Refresh
            </button>
            <button className="btn btn-dark btn-sm" onClick={downloadPdf} disabled={loading}>
              Download PDF
            </button>
            <button className="btn btn-success btn-sm" onClick={downloadExcel} disabled={loading}>
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-6 col-md-4 col-lg-3">
              <div className="card h-100 shadow-sm">
                <div className="card-header">
                  <div className="text-muted small">Total Visits</div>
                  <div className="fs-2 fs-md-3 fw-bold text-primary">{data?.totals?.visits ?? 0}</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-4 col-lg-3">
              <div className="card h-100 shadow-sm">
                <div className="card-header">
                  <div className="text-muted small">Inquiries This Month</div>
                  <div className="fs-2 fs-md-3 fw-bold text-secondary">{data?.totals?.inquiries ?? 0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="row g-3">
            {/* Visits by Hour Chart */}
            <div className="col-12">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-primary text-white">
                  <h6 className="mb-0">Visits by Hour</h6>
                </div>
                <div className="card-body">
                  <div style={{ height: "300px", position: "relative" }}>
                    <Bar data={hourBarData} options={hourBarOptions} />
                  </div>
                  {hourSummary && (
                    <small className="text-muted d-block mt-2">
                      On average, about {hourSummary.avgPerHour.toFixed(1)} patients come per hour. The busiest time is {hourSummary.peakHour}:00 ({hourSummary.peakCount} visits). More staff should be available at this time.
                    </small>
                  )}
                </div>
              </div>
            </div>

            {/* Visits by Service & Type Chart */}
            <div className="col-12">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-primary text-white">
                  <h6 className="mb-0">Visits by Service & Type</h6>
                </div>
                <div className="card-body">
                  <div style={{ height: "300px", position: "relative" }}>
                    <Bar data={serviceBarData} options={serviceBarOptions} />
                  </div>
                  {serviceSummary && (
                    <small className="text-muted d-block mt-2">
                      Most patients came for {serviceSummary.topService} ({serviceSummary.topCount} visits, {serviceSummary.topShare.toFixed(0)}% of total). Most were booked by {serviceSummary.topWalkin ? 'walk-in' : 'appointment'}.
                    </small>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

