import { useEffect, useMemo, useState } from "react";
import api from "../../api/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { addClinicHeader } from "../../utils/pdfHeader";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  ChartTitle,
  ChartTooltip,
  ChartLegend,
  ChartDataLabels
);

export default function AdminMonthlyReport() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ totals: { visits: 0 }, by_day: [], by_hour: [], by_visit_type: [], by_service: [] });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/reports/visits-monthly", { params: { month } });
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

  const byDay = useMemo(() => {
    const arr = (data.by_day || []).map((d) => ({ day: d.day, count: Number(d.count) || 0 }));
    return arr;
  }, [data.by_day]);

  const visitType = useMemo(() => {
    const vt = (data.by_visit_type || []).map((r) => ({ label: r.visit_type, count: Number(r.count) || 0 }));
    if (vt.length === 0) return [{ label: "walkin", count: 0 }, { label: "appointment", count: 0 }];
    return vt;
  }, [data.by_visit_type]);

  const byService = useMemo(() => {
    return (data.by_service || []).map((r) => ({ label: r.service_name || "(Unspecified)", count: Number(r.count) || 0 }));
  }, [data.by_service]);

  // ------ Chart helpers ------
  const visitTypeColorMap = useMemo(() => ({
    appointment: "#6c757d", // gray
    walkin: "#0d6efd", // blue
  }), []);

  const getVisitTypeColors = (items) =>
    items.map((it, i) => visitTypeColorMap[it.label] || [
      "#0d6efd",
      "#6c757d",
      "#198754",
      "#dc3545",
      "#ffc107",
      "#20c997",
      "#6610f2",
    ][i % 7]);

  const lineData = useMemo(() => ({
    labels: byDay.map((d) => d.day),
    datasets: [
      {
        label: "Visits",
        data: byDay.map((d) => d.count),
        borderColor: "#0d6efd",
        backgroundColor: "rgba(13,110,253,0.15)",
        tension: 0.3,
        pointRadius: 3,
        fill: true,
      },
    ],
  }), [byDay]);

  const lineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
      datalabels: { display: false },
      title: { display: false },
    },
    scales: {
      x: { 
        title: { display: true, text: "Day", font: { size: 12 } },
        ticks: { font: { size: 11 } }
      },
      y: { 
        title: { display: true, text: "Visits", font: { size: 12 } }, 
        beginAtZero: true, 
        ticks: { precision: 0, font: { size: 11 } }
      },
    },
  }), []);

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
        label: "Visits",
        data: byService.map((d) => d.count),
        backgroundColor: "rgba(25,135,84,0.85)",
        borderColor: "#198754",
        borderWidth: 1,
      },
    ],
  }), [byService]);

  const serviceBarOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
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

  const visitTypeData = useMemo(() => {
    const labels = visitType.map((v) => v.label);
    const values = visitType.map((v) => v.count);
    const colors = getVisitTypeColors(visitType);
    return {
      labels,
      datasets: [
        {
          label: "Visit Type",
          data: values,
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    };
  }, [visitType]);

  const totalVisitType = useMemo(() => visitType.reduce((s, r) => s + r.count, 0) || 1, [visitType]);

  const visitTypeOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
      datalabels: {
        color: "#fff",
        font: { size: 10, weight: "bold" },
        formatter: (value) => {
          if (!value) return "";
          const pct = Math.round((value / totalVisitType) * 100);
          return `${value} (${pct}%)`;
        },
      },
    },
  }), [totalVisitType]);

  // ------ Summaries for insights ------
  // Daily peaks (byDay)
  const daySummary = useMemo(() => {
    if (!byDay.length) return null;
    const total = byDay.reduce((sum, dayRow) => sum + dayRow.count, 0);
    const peak = byDay.reduce((a, b) => (a.count > b.count ? a : b));
    const low = byDay.reduce((a, b) => (a.count < b.count ? a : b));
    const avgPerDay = total / byDay.length;
    return { peak, low, total, avgPerDay };
  }, [byDay]);

  // Hourly peaks (byHour)
  const hourSummary = useMemo(() => {
    if (!byHour.length) return null;
    const peak = byHour.reduce((a, b) => (a.count > b.count ? a : b));
    const avgPerHour = byHour.reduce((sum, h) => sum + h.count, 0) / byHour.length;
    return { peakHour: Number(peak.label), peakCount: peak.count, avgPerHour };
  }, [byHour]);

  // Visit type split (visitType)
  const visitTypeSummary = useMemo(() => {
    if (!visitType.length) return null;
    const total = visitType.reduce((sum, v) => sum + v.count, 0);
    const pct = (n) => (total ? (n / total) * 100 : 0);
    const byName = Object.fromEntries(visitType.map((v) => [v.label, v.count]));
    return {
      total,
      walkinPct: pct(byName.walkin || 0),
      appointmentPct: pct(byName.appointment || 0),
    };
  }, [visitType]);

  // Top service (byService)
  const serviceSummary = useMemo(() => {
    if (!byService.length) return null;
    const total = byService.reduce((sum, srow) => sum + srow.count, 0);
    const top = byService.reduce((a, b) => (a.count > b.count ? a : b));
    const topShare = total ? (top.count / total) * 100 : 0;
    return { topService: top.label, topCount: top.count, topShare, total };
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
        body: [["Total Visits", String(data?.totals?.visits ?? 0)]],
        theme: "striped",
      });

      // SECTION 2: DAILY ANALYSIS
      currentY = addSectionTitle(doc, "Daily Visit Analysis", (doc.lastAutoTable?.finalY || 100) + 20);

      autoTable(doc, {
        startY: currentY,
        head: [["Day", "Count"]],
        body: (byDay || []).map((r) => [r.day, String(r.count)]),
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [13, 110, 253] },
      });

      // Insight for Daily Counts
      if (daySummary) {
        autoTable(doc, {
          startY: (doc.lastAutoTable?.finalY || 100) + 8,
          head: [["Insight"]],
          body: [[
            `Peak day: ${daySummary.peak.day} (${daySummary.peak.count} visits). ` +
            `Lowest day: ${daySummary.low.day} (${daySummary.low.count}). ` +
            `Avg/day: ${daySummary.avgPerDay.toFixed(1)}.`,
          ]],
          theme: "plain",
          styles: { fontSize: 8, textColor: 100, cellPadding: 2 },
          headStyles: { fontStyle: "bold", textColor: 120 },
          columnStyles: { 0: { cellWidth: 515 } },
          margin: { left: 40, right: 40 },
        });
      }

      // SECTION 3: HOURLY ANALYSIS
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
            `Peak hour: ${hourSummary.peakHour}:00 (${hourSummary.peakCount} visits). ` +
            `Avg/hour: ${hourSummary.avgPerHour.toFixed(1)}. ` +
            `Tip: Staff up around peak hour.`,
          ]],
          theme: "plain",
          styles: { fontSize: 8, textColor: 100, cellPadding: 2 },
          headStyles: { fontStyle: "bold", textColor: 120 },
          columnStyles: { 0: { cellWidth: 515 } },
          margin: { left: 40, right: 40 },
        });
      }

      // SECTION 4: VISIT TYPE ANALYSIS
      currentY = addSectionTitle(doc, "Visit Type Analysis", (doc.lastAutoTable?.finalY || 100) + 20);

      autoTable(doc, {
        startY: currentY,
        head: [["Visit Type", "Count"]],
        body: (visitType || []).map((r) => [r.label, String(r.count)]),
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [108, 117, 125] },
      });

      // Insight for Visit Type
      if (visitTypeSummary) {
        autoTable(doc, {
          startY: (doc.lastAutoTable?.finalY || 100) + 8,
          head: [["Insight"]],
          body: [[
            `Appointments: ${visitTypeSummary.appointmentPct.toFixed(0)}% · ` +
            `Walk-ins: ${visitTypeSummary.walkinPct.toFixed(0)}%. ` +
            `Tip: If walk-ins surge, consider more front-desk coverage.`,
          ]],
          theme: "plain",
          styles: { fontSize: 8, textColor: 100, cellPadding: 2 },
          headStyles: { fontStyle: "bold", textColor: 120 },
          columnStyles: { 0: { cellWidth: 515 } },
          margin: { left: 40, right: 40 },
        });
      }

      // SECTION 5: SERVICE ANALYSIS
      currentY = addSectionTitle(doc, "Service Usage Analysis", (doc.lastAutoTable?.finalY || 100) + 20);

      autoTable(doc, {
        startY: currentY,
        head: [["Service", "Count"]],
        body: (byService || []).map((r) => [r.label, String(r.count)]),
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
            `Top service: ${serviceSummary.topService} (${serviceSummary.topCount} visits, ` +
            `${serviceSummary.topShare.toFixed(0)}% of monthly volume). ` +
            `Tip: Ensure supplies/staffing align with demand.`,
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
          {/* Total Visits Card */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-6 col-md-4 col-lg-3">
              <div className="card h-100 shadow-sm">
               <div className="card-header">
                  <div className="text-muted small">Total Visits</div>
                  <div className="fs-2 fs-md-3 fw-bold text-primary">{data?.totals?.visits ?? 0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="row g-3">
            {/* Daily Counts Chart */}
            <div className="col-12 col-lg-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-primary text-white">
                  <h6 className="mb-0">Daily Counts</h6>
                </div>
                <div className="card-body">
                  <div style={{ height: "300px", position: "relative" }}>
                    <Line data={lineData} options={lineOptions} />
                  </div>
                  {daySummary && (
                    <small className="text-muted d-block mt-2">
                      Peak day: {daySummary.peak.day} ({daySummary.peak.count} visits). Lowest day: {daySummary.low.day} ({daySummary.low.count}). Avg/day: {daySummary.avgPerDay.toFixed(1)}.
                    </small>
                  )}
                </div>
              </div>
            </div>

            {/* By Hour Chart */}
            <div className="col-12 col-lg-6">
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-primary text-white">
                  <h6 className="mb-0">By Hour</h6>
                </div>
                <div className="card-body">
                  <div style={{ height: "300px", position: "relative" }}>
                    <Bar data={hourBarData} options={hourBarOptions} />
                  </div>
                  {hourSummary && (
                    <small className="text-muted d-block mt-2 ">
                      Peak hour: {hourSummary.peakHour}:00 ({hourSummary.peakCount} visits). Avg/hour: {hourSummary.avgPerHour.toFixed(1)}. Tip: Staff up around peak hour.
                    </small>
                  )}
                </div>
              </div>
            </div>

            {/* Visit Type Donut Chart */}
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm">
 <div className="card-header bg-primary text-white">
                  <h6 className="mb-0">Visit Type</h6>
                </div>
                <div className="card-body d-flex flex-column align-items-center justify-content-center p-3">
                  <div className="w-100" style={{ maxWidth: "280px", height: "200px", position: "relative" }}>
                    <Doughnut
                      data={visitTypeData}
                      options={{
                        ...visitTypeOptions,
                        maintainAspectRatio: false,
                        cutout: "60%", 
                        plugins: {
                          legend: { display: false }, 
                          tooltip: { enabled: true },
                        },
                      }}
                    />
                  </div>

                  {/* Custom Legend */}
                  <div className="mt-3 w-100">
                    {visitType.map((v, idx) => {
                      const color = getVisitTypeColors(visitType)[idx];
                      return (
                        <div
                          key={v.label}
                          className="d-flex align-items-center justify-content-between mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          <span className="d-flex align-items-center">
                            <span
                              className="me-2"
                              style={{
                                display: "inline-block",
                                width: 12,
                                height: 12,
                                backgroundColor: color,
                                borderRadius: 2,
                              }}
                            />
                            <span className="text-capitalize">{v.label}</span>
                          </span>
                          <strong>{v.count}</strong>
                        </div>
                      );
                    })}
                  </div>
                  {visitTypeSummary && (
                    <small className="text-muted d-block mt-2 text-center">
                      Appointments: {visitTypeSummary.appointmentPct.toFixed(0)}% · Walk-ins: {visitTypeSummary.walkinPct.toFixed(0)}%. Tip: If walk-ins surge, consider more front-desk coverage.
                    </small>
                  )}
                </div>
              </div>
            </div>

            {/* By Service Chart */}
            <div className="col-12 col-md-6 col-lg-8">
              <div className="card h-100 shadow-sm">
               <div className="card-header bg-primary text-white">
                <h6 className="mb-0 text-darkblue">By Service</h6>
                </div>
                <div className="card-body">
                  <div style={{ height: "300px", position: "relative" }}>
                    <Bar data={serviceBarData} options={serviceBarOptions} />
                  </div>
                  {serviceSummary && (
                    <small className="text-muted d-block mt-2">
                      Top service: {serviceSummary.topService} ({serviceSummary.topCount} visits, {serviceSummary.topShare.toFixed(0)}% of monthly volume). Tip: Ensure supplies/staffing align with demand.
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

