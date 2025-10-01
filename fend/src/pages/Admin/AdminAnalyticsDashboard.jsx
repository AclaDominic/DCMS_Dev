import { useEffect, useMemo, useState } from "react";
import api from "../../api/api";
import * as XLSX from "xlsx";
import { addClinicHeader } from "../../utils/pdfHeader";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,          // ✅ needed for Pie charts
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
} from "chart.js";
import { Line, Pie } from "react-chartjs-2"; // ✅ use Pie instead of Bar

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,          // ✅ register ArcElement
  ChartTitle,
  ChartTooltip,
  ChartLegend,
  Filler
);

export default function AdminAnalyticsDashboard() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [trendRange, setTrendRange] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [trendData, setTrendData] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, trendRes] = await Promise.all([
        api.get("/api/analytics/summary", { params: { period: month } }),
        api.get("/api/analytics/trend", { params: { months: trendRange } }),
      ]);
      setData(summaryRes.data || null);
      setTrendData(trendRes.data || null);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, trendRange]);

  // -------------------- Exports --------------------
  const downloadPdf = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });

      const addSectionTitle = (doc, title, currentY) => {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 119, 182);
        doc.text(title, 40, currentY);
        doc.setTextColor(0, 0, 0);
        return currentY + 15;
      };

      let currentY = await addClinicHeader(doc, 20);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Analytics Dashboard Report", 40, currentY);
      currentY += 20;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Report Period: ${month}`, 40, currentY);
      currentY += 30;

      const k = data?.kpis || {};
      currentY = addSectionTitle(doc, "Key Performance Indicators", currentY);

      const kpiData = [
        ["Metric", "Current Value", "Previous Value", "Change (%)"],
        ["Total Visits", String(k?.total_visits?.value ?? 0), String(k?.total_visits?.prev ?? 0), `${k?.total_visits?.pct_change ?? 0}%`],
        ["Approved Appointments", String(k?.approved_appointments?.value ?? 0), String(k?.approved_appointments?.prev ?? 0), `${k?.approved_appointments?.pct_change ?? 0}%`],
        ["No-shows", String(k?.no_shows?.value ?? 0), String(k?.no_shows?.prev ?? 0), `${k?.no_shows?.pct_change ?? 0}%`],
        ["Avg Visit Duration (min)", String(k?.avg_visit_duration_min?.value ?? 0), String(k?.avg_visit_duration_min?.prev ?? 0), `${k?.avg_visit_duration_min?.pct_change ?? 0}%`],
        ["Total Revenue", `₱${(k?.total_revenue?.value ?? 0).toLocaleString()}`, `₱${(k?.total_revenue?.prev ?? 0).toLocaleString()}`, `${k?.total_revenue?.pct_change ?? 0}%`],
      ];
      autoTable(doc, { startY: currentY, head: [kpiData[0]], body: kpiData.slice(1), theme: "striped" });

      currentY = addSectionTitle(doc, "Payment Method Distribution", (doc.lastAutoTable?.finalY || 100) + 20);
      const paymentData = [
        ["Payment Method", "Count", "Percentage"],
        ["Cash", String(k?.payment_method_share?.cash?.count ?? 0), `${k?.payment_method_share?.cash?.share_pct ?? 0}%`],
        ["HMO", String(k?.payment_method_share?.hmo?.count ?? 0), `${k?.payment_method_share?.hmo?.share_pct ?? 0}%`],
        ["Maya", String(k?.payment_method_share?.maya?.count ?? 0), `${k?.payment_method_share?.maya?.share_pct ?? 0}%`],
      ];
      autoTable(doc, { startY: currentY, head: [paymentData[0]], body: paymentData.slice(1), theme: "striped" });

      if (data?.top_revenue_services?.length > 0) {
        currentY = addSectionTitle(doc, "Revenue by Service", (doc.lastAutoTable?.finalY || 100) + 20);
        const serviceData = [
          ["Service", "Current Revenue", "Previous Revenue", "Change (%)"],
          ...data.top_revenue_services.map((s) => [
            s.service_name,
            `₱${s.revenue.toLocaleString()}`,
            `₱${(s.prev_revenue || 0).toLocaleString()}`,
            `${s.pct_change || 0}%`,
          ]),
        ];
        autoTable(doc, { startY: currentY, head: [serviceData[0]], body: serviceData.slice(1), theme: "striped" });
      }

      doc.save(`analytics-report-${month}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF.");
    }
  };

  const downloadExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const k = data?.kpis || {};

      const kpiData = [
        ["Metric", "Current Value", "Previous Value", "Change (%)"],
        ["Total Visits", k?.total_visits?.value ?? 0, k?.total_visits?.prev ?? 0, k?.total_visits?.pct_change ?? 0],
        ["Approved Appointments", k?.approved_appointments?.value ?? 0, k?.approved_appointments?.prev ?? 0, k?.approved_appointments?.pct_change ?? 0],
        ["No-shows", k?.no_shows?.value ?? 0, k?.no_shows?.prev ?? 0, k?.no_shows?.pct_change ?? 0],
        ["Avg Visit Duration (min)", k?.avg_visit_duration_min?.value ?? 0, k?.avg_visit_duration_min?.prev ?? 0, k?.avg_visit_duration_min?.pct_change ?? 0],
        ["Total Revenue", k?.total_revenue?.value ?? 0, k?.total_revenue?.prev ?? 0, k?.total_revenue?.pct_change ?? 0],
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(kpiData), "KPI Overview");

      const paymentData = [
        ["Payment Method", "Count", "Percentage"],
        ["Cash", k?.payment_method_share?.cash?.count ?? 0, k?.payment_method_share?.cash?.share_pct ?? 0],
        ["HMO", k?.payment_method_share?.hmo?.count ?? 0, k?.payment_method_share?.hmo?.share_pct ?? 0],
        ["Maya", k?.payment_method_share?.maya?.count ?? 0, k?.payment_method_share?.maya?.share_pct ?? 0],
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(paymentData), "Payment Methods");

      if (data?.top_revenue_services?.length > 0) {
        const serviceData = [
          ["Service", "Current Revenue", "Previous Revenue", "Change (%)"],
          ...data.top_revenue_services.map((s) => [s.service_name, s.revenue, s.prev_revenue || 0, s.pct_change || 0]),
        ];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(serviceData), "Revenue by Service");
      }

      if (trendData?.labels?.length > 0) {
        const trendSheetData = [
          ["Month", "Visits", "Appointments", "Revenue"],
          ...trendData.labels.map((label, i) => [
            label,
            trendData.visits?.[i] ?? 0,
            trendData.appointments?.[i] ?? 0,
            trendData.revenue?.[i] ?? 0,
          ]),
        ];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(trendSheetData), "Monthly Trends");
      }

      XLSX.writeFile(workbook, `analytics-report-${month}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate Excel file.");
    }
  };

  // -------------------- Derived data --------------------
  const k = data?.kpis || {};

  // Payment Method Pie (uses counts; tooltip shows %)
  const payPie = useMemo(() => {
    const cash = k?.payment_method_share?.cash ?? {};
    const hmo = k?.payment_method_share?.hmo ?? {};
    const maya = k?.payment_method_share?.maya ?? {};

    const bases = ["#22c55e", "#8b5cf6", "#3b82f6"]; // green, purple, blue
    const lights = ["#dcfce7", "#ede9fe", "#dbeafe"];
    const darks = ["#15803d", "#6d28d9", "#1d4ed8"];

    // Scriptable gradient backgrounds
    const backgroundColor = (ctx) => {
      const i = ctx.dataIndex;
      const chart = ctx.chart;
      const area = chart?.chartArea;
      if (!area) return bases[i];
      const { left, right, top, bottom } = area;
      const x = (left + right) / 2;
      const y = (top + bottom) / 2;
      const r = Math.min(right - left, bottom - top) / 2;
      const g = chart.ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
      g.addColorStop(0, lights[i]);
      g.addColorStop(1, bases[i]);
      return g;
    };

    return {
      labels: ["Cash", "HMO", "Maya"],
      datasets: [
        {
          data: [
            Number(cash.count || 0),
            Number(hmo.count || 0),
            Number(maya.count || 0),
          ],
          backgroundColor,
          borderColor: (ctx) => darks[ctx.dataIndex],
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    };
  }, [k]);

  const payPieOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "right",
          labels: { usePointStyle: true, padding: 16, boxWidth: 10, font: { size: 12, weight: "600" } },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (ctx) => {
              const label = ctx.label || "";
              const value = ctx.parsed || 0;
              const arr = ctx.chart.data.datasets[0].data;
              const total = arr.reduce((a, b) => a + b, 0) || 1;
              const pct = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${pct}%)`;
            },
          },
        },
      },
    }),
    []
  );

  // KPI helper text
  const kpiInsights = useMemo(() => {
    if (!data) return null;
    const arrowPct = (x) => (x > 0 ? `▲ ${x}%` : x < 0 ? `▼ ${Math.abs(x)}%` : "—");
    return {
      visits: `Change vs last month: ${arrowPct(k?.total_visits?.pct_change || 0)}`,
      approved: `Change vs last month: ${arrowPct(k?.approved_appointments?.pct_change || 0)}`,
      noShows: `Change vs last month: ${arrowPct(k?.no_shows?.pct_change || 0)}`,
      avgDuration: `Change vs last month: ${arrowPct(k?.avg_visit_duration_min?.pct_change || 0)}`,
    };
  }, [data, k]);

  const paymentInsight = useMemo(() => {
    const cash = k?.payment_method_share?.cash?.share_pct ?? 0;
    const hmo = k?.payment_method_share?.hmo?.share_pct ?? 0;
    const maya = k?.payment_method_share?.maya?.share_pct ?? 0;
    const trendCash = k?.payment_method_share?.cash?.pct_point_change ?? 0;
    const trendHmo = k?.payment_method_share?.hmo?.pct_point_change ?? 0;
    const trendMaya = k?.payment_method_share?.maya?.pct_point_change ?? 0;
    if (cash === 0 && hmo === 0 && maya === 0) return null;
    return (
      `Cash: ${cash}% (${trendCash >= 0 ? "▲" : "▼"}${Math.abs(trendCash)}), ` +
      `HMO: ${hmo}% (${trendHmo >= 0 ? "▲" : "▼"}${Math.abs(trendHmo)}), ` +
      `Maya: ${maya}% (${trendMaya >= 0 ? "▲" : "▼"}${Math.abs(trendMaya)}). ` +
      (maya > 40
        ? "Tip: Strong digital payment adoption. Monitor Maya transaction fees."
        : hmo > 50
        ? "Tip: Monitor insurer approval times and patient satisfaction with HMO processes."
        : "Tip: Payment preferences vary by patient demographics and insurance coverage.")
    );
  }, [k]);

  const followUpInsight = useMemo(() => {
    const rate = k?.patient_follow_up_rate?.value ?? 0;
    const change = k?.patient_follow_up_rate?.pct_change ?? 0;
    const total = k?.patient_follow_up_rate?.total_first_time_patients ?? 0;
    const returned = k?.patient_follow_up_rate?.returned_patients ?? 0;
    if (total === 0) return null;
    return (
      `Follow-up rate: ${rate}% (${returned}/${total} patients returned within 3-4 months). ` +
      `Change: ${change >= 0 ? "▲" : "▼"}${Math.abs(change)}%. ` +
      (rate >= 50
        ? "Excellent retention! This indicates strong patient satisfaction."
        : rate >= 30
        ? "Good retention. Consider strategies to improve further."
        : "Consider implementing follow-up calls, appointment reminders, or patient satisfaction surveys.")
    );
  }, [k]);

  const topServiceInsight = useMemo(() => {
    const s = (data?.top_services || [])[0];
    if (!s) return null;
    const change = s.pct_change ?? 0;
    return `Top service: ${s.service_name} (Δ ${change >= 0 ? "▲" : "▼"}${Math.abs(change)}% vs last month). Tip: Align stock/staffing; promote under-performers.`;
  }, [data]);

  const pct = (v) => (typeof v === "number" ? `${v > 0 ? "+" : ""}${v.toFixed(2)}%` : "0%");

  // Month helpers
  const toMonthName = (ym) => {
    const [y, m] = (ym || "").split("-").map(Number);
    if (!y || !m) return "";
    return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
  };
  const prevMonthOf = (ym) => {
    const [y, m] = (ym || "").split("-").map(Number);
    if (!y || !m) return ym;
    const d = new Date(y, m - 1, 1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const lastMonthLabel = toMonthName(prevMonthOf(month));
  const thisMonthLabel = toMonthName(month);

  const fmtUnit = (unit, v) => {
    const n = Number(v || 0);
    if (unit === "money") return `₱${n.toLocaleString()}`;
    if (unit === "minutes") return `${n} min`;
    return `${n}`;
  };

  // derive previous values if not provided
  function derivePrev(current, pct) {
    if (current == null) return 0;
    if (pct === -100 && current === 0) return 0;
    const denom = 1 + ((pct ?? 0) / 100);
    return denom === 0 ? 0 : Number((current / denom).toFixed(2));
  }

  const tv = k?.total_visits;
  const aa = k?.approved_appointments;
  const ns = k?.no_shows;
  const av = k?.avg_visit_duration_min;
  const tr = k?.total_revenue;

  const prev = {
    visits: tv?.prev ?? derivePrev(tv?.value, tv?.pct_change),
    approved: aa?.prev ?? derivePrev(aa?.value, aa?.pct_change),
    noShows: ns?.prev ?? derivePrev(ns?.value, ns?.pct_change),
    avgDur: av?.prev ?? derivePrev(av?.value, av?.pct_change),
    revenue: tr?.prev ?? derivePrev(tr?.value, tr?.pct_change),
  };

  // -------- Mini KPI Pie (2 slices: last vs this) --------
  const miniPieData = (lastVal = 0, thisVal = 0, colors = { last: "#9ca3af", curr: "#3b82f6" }) => ({
    labels: ["Last month", "This month"],
    datasets: [
      {
        data: [Number(lastVal || 0), Number(thisVal || 0)],
        backgroundColor: [colors.last, colors.curr],
        borderColor: ["#6b7280", colors.curr],
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  });

  const buildMiniPieOptions = (unit, lastLbl, thisLbl) => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: "45%", // donut look; still a Pie component but Chart.js respects cutout
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (ctx) => {
            const isLast = ctx.dataIndex === 0;
            const label = isLast ? lastLbl : thisLbl;
            const val = ctx.parsed || 0;
            return `${label}: ${fmtUnit(unit, val)}`;
          },
        },
      },
    },
  });

  // -------- Trend Line (unchanged) --------
  const trendChartData = useMemo(() => {
    if (!trendData) return null;
    return {
      labels: trendData.labels,
      datasets: [
        { label: "Visits", data: trendData.visits, borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,.1)", tension: 0.4, pointRadius: 4, pointHoverRadius: 6, borderWidth: 3, fill: false },
        { label: "Appointments", data: trendData.appointments, borderColor: "#10b981", backgroundColor: "rgba(16,185,129,.1)", tension: 0.4, pointRadius: 4, pointHoverRadius: 6, borderWidth: 3, fill: false },
        { label: "Revenue", data: trendData.revenue, borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,.1)", tension: 0.4, pointRadius: 4, pointHoverRadius: 6, borderWidth: 3, fill: false, yAxisID: "y1" },
      ],
    };
  }, [trendData]);

  const trendChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: "top", labels: { usePointStyle: true, padding: 20, font: { size: 12, weight: "500" } } },
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          callbacks: {
            label: (context) => {
              const label = context.dataset.label;
              const value = context.parsed.y;
              return label === "Revenue" ? `${label}: ₱${value.toLocaleString()}` : `${label}: ${value}`;
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#6b7280", font: { size: 12, weight: "500" } } },
        y: { type: "linear", display: true, position: "left", beginAtZero: true, grid: { color: "rgba(107, 114, 128, 0.1)", drawBorder: false }, ticks: { color: "#6b7280", font: { size: 12, weight: "500" } } },
        y1: { type: "linear", display: true, position: "right", beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { color: "#6b7280", font: { size: 12, weight: "500" }, callback: (value) => `₱${value.toLocaleString()}` } },
      },
    }),
    []
  );

  const formatMoney = (n) => `₱${Number(n || 0).toLocaleString()}`;

  // -------------------- KPI Card --------------------
  const kpiCard = (title, value, change, icon, color, prevValue, opts = {}) => {
    const numericValue = Number(String(value).replace(/[^\d.-]/g, "")) || 0;
    const numericPrev = Number(prevValue || 0);

    return (
      <div className="card h-100 border-0 shadow-sm" style={{ background: "#b8b9bbff", borderRadius: 16, border: "1px solid #181818ff" }}>
        <div className="card-body p-3 p-lg-4">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="text-muted small fw-medium text-uppercase" style={{ letterSpacing: ".4px", fontSize: "0.7rem" }}>{title}</div>
            <div className="fs-5" style={{ color: color || "#6b7280" }}>{icon}</div>
          </div>

          <div className="fw-bold mb-1" style={{ fontSize: opts.money ? "clamp(1.2rem, 1.5vw + 0.8rem, 1.6rem)" : "clamp(1.5rem, 1.8vw + 1rem, 2rem)", color: "#111827", lineHeight: 1.1, wordBreak: "break-word" }}>
            {opts.money ? formatMoney(numericValue) : value ?? 0}
          </div>

          <div className={"small fw-semibold " + ((change ?? 0) >= 0 ? "text-success" : "text-danger")} style={{ marginBottom: "8px" }}>
            {(change ?? 0) >= 0 ? "↗" : "↘"} {typeof change === "number" ? `${change > 0 ? "+" : ""}${change.toFixed(2)}%` : "0%"} vs last month
          </div>

          {/* Legend */}
          <div className="d-flex align-items-center gap-3 mt-1 mb-1 small text-muted">
            <span className="d-inline-flex align-items-center">
              <span style={{ width: 8, height: 8, background: "#9ca3af", borderRadius: 999, display: "inline-block", marginRight: 6 }}></span>
              Last month
            </span>
            <span className="d-inline-flex align-items-center">
              <span style={{ width: 8, height: 8, background: color, borderRadius: 999, display: "inline-block", marginRight: 6 }}></span>
              This month
            </span>
          </div>

          {/* Mini Pie Last vs This */}
          <div style={{ height: 80, marginTop: 2 }}>
            <Pie data={miniPieData(numericPrev, numericValue, { last: "#9ca3af", curr: color })} options={buildMiniPieOptions(opts.unit || "count", lastMonthLabel, thisMonthLabel)} />
          </div>

          {/* Month labels with values */}
          <div className="d-flex justify-content-between mt-1">
            <small className="text-muted">{lastMonthLabel}: {fmtUnit(opts.unit || "count", numericPrev)}</small>
            <small className="text-muted">{thisMonthLabel}: {fmtUnit(opts.unit || "count", numericValue)}</small>
          </div>

          {/* Absolute delta */}
          {(() => {
            const delta = numericValue - numericPrev;
            const up = delta >= 0;
            return <div className={`small ${up ? "text-success" : "text-danger"}`}>Δ {opts.unit === "money" ? fmtUnit("money", Math.abs(delta)) : fmtUnit(opts.unit || "count", Math.abs(delta))} {up ? "higher" : "lower"} than last</div>;
          })()}
        </div>
      </div>
    );
  };

  // -------------------- Render --------------------
  return (
    <>
      <div className="p-4" style={{ minHeight: "100vh" }}>
        <div className="container-xl">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="m-0 fw-bold" style={{ color: "#000000", fontSize: "2rem" }}>📊 Analytics Dashboard</h2>
              <p className="text-muted mb-0 mt-1" style={{ color: "#374151", fontSize: "1rem" }}>Monitor your clinic's performance and key metrics</p>
            </div>
            <div className="d-flex gap-2 gap-md-3 align-items-center flex-wrap">
              <input
                type="month"
                className="form-control form-control-sm border-0 shadow-sm"
                style={{ width: 180, borderRadius: "12px", padding: "12px 16px", fontSize: "14px", fontWeight: "500" }}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                aria-label="Select month"
              />
              <button
                className="btn btn-primary btn-sm border-0 shadow-sm"
                onClick={load}
                disabled={loading}
                style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "white", borderRadius: "12px", padding: "12px 24px", fontWeight: "600", transition: "all 0.3s ease" }}
              >
                {loading ? "⟳" : "↻"} Refresh
              </button>
              <div className="dropdown">
                <button className="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" style={{ borderRadius: "12px", padding: "12px 16px", fontWeight: "600" }}>
                  📊 Export
                </button>
                <ul className="dropdown-menu">
                  <li><button className="dropdown-item" onClick={downloadPdf} disabled={loading}>📄 Download PDF</button></li>
                  <li><button className="dropdown-item" onClick={downloadExcel} disabled={loading}>📊 Export Excel</button></li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger border-0 shadow-sm mb-4" role="alert" style={{ borderRadius: "12px" }}>
              <div className="d-flex align-items-center"><span className="me-2">⚠️</span>{error}</div>
            </div>
          )}

          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
              <div className="text-center">
                <div className="spinner-border text-primary mb-3" role="status"><span className="visually-hidden">Loading...</span></div>
                <p className="text-muted">Loading analytics data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="row g-3 g-lg-4 mb-3">
                <div className="col-6">{kpiCard("Total Visits", tv?.value, tv?.pct_change, "👥", "#3b82f6", prev.visits, { unit: "count" })}</div>
                <div className="col-6">{kpiCard("Approved Appointments", aa?.value, aa?.pct_change, "✅", "#10b981", prev.approved, { unit: "count" })}</div>
              </div>
              <div className="row g-3 g-lg-4 mb-3">
                <div className="col-6">{kpiCard("No-shows", ns?.value, ns?.pct_change, "❌", "#ef4444", prev.noShows, { unit: "count" })}</div>
                <div className="col-6">{kpiCard("Avg Visit (min)", av?.value?.toFixed?.(1) ?? 0, av?.pct_change, "⏱️", "#f59e0b", prev.avgDur, { unit: "minutes" })}</div>
              </div>
              <div className="row g-3 g-lg-4 mb-4">
                <div className="col-12 d-flex justify-content-center">
                  <div style={{ maxWidth: "400px", width: "100%" }}>
                    {kpiCard("Total Revenue", tr?.value ?? 0, tr?.pct_change, "💰", "#10b981", prev.revenue, { unit: "money", money: true })}
                  </div>
                </div>
              </div>

              {/* Payment Pie + Revenue by Service */}
              <div className="row g-2 g-md-3 g-lg-4">
                <div className="col-12 col-lg-6">
                  <div className="card h-100 border-0 shadow-sm" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", borderRadius: "16px" }}>
                    <div className="card-header border-0 bg-transparent py-4">
                      <h5 className="mb-0 fw-bold d-flex align-items-center" style={{ color: "#1e293b" }}>
                        <span className="me-2">💳</span>
                        Payment Method Share
                      </h5>
                    </div>
                    <div className="card-body pt-0">
                      <div className="px-1 px-md-2" style={{ height: "300px" }}>
                        <Pie data={payPie} options={payPieOptions} />
                      </div>

                      <div className="mt-3 p-3 rounded-3" style={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}>
                        <div className="small text-muted mb-2 fw-medium">Monthly Changes:</div>
                        <div className="d-flex justify-content-between">
                          <span className="small">
                            <span className="fw-medium">Cash:</span>{" "}
                            <span className={(k?.payment_method_share?.cash?.pct_point_change ?? 0) >= 0 ? "text-success" : "text-danger"}>
                              {pct(k?.payment_method_share?.cash?.pct_point_change || 0)}
                            </span>
                          </span>
                          <span className="small">
                            <span className="fw-medium">HMO:</span>{" "}
                            <span className={(k?.payment_method_share?.hmo?.pct_point_change ?? 0) >= 0 ? "text-success" : "text-danger"}>
                              {pct(k?.payment_method_share?.hmo?.pct_point_change || 0)}
                            </span>
                          </span>
                          <span className="small">
                            <span className="fw-medium">Maya:</span>{" "}
                            <span className={(k?.payment_method_share?.maya?.pct_point_change ?? 0) >= 0 ? "text-success" : "text-danger"}>
                              {pct(k?.payment_method_share?.maya?.pct_point_change || 0)}
                            </span>
                          </span>
                        </div>
                      </div>

                      {paymentInsight && (
                        <div className="mt-3 p-3 rounded-3" style={{ backgroundColor: "rgba(16, 185, 129, 0.05)" }}>
                          <small className="text-muted">{paymentInsight}</small>
                        </div>
                      )}
                      {followUpInsight && (
                        <div className="mt-3 p-3 rounded-3" style={{ backgroundColor: "rgba(139, 92, 246, 0.05)" }}>
                          <small className="text-muted">{followUpInsight}</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="card h-100 border-0 shadow-sm" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", borderRadius: "16px" }}>
                    <div className="card-header border-0 bg-transparent py-4">
                      <h5 className="mb-0 fw-bold d-flex align-items-center" style={{ color: "#1e293b" }}>
                        <span className="me-2">💰</span>
                        Revenue by Service
                      </h5>
                    </div>
                    <div className="card-body pt-0">
                      <div className="list-group list-group-flush">
                        {(data?.top_revenue_services || []).map((s, index) => (
                          <div
                            key={`${s.service_id}-${s.service_name}`}
                            className="list-group-item border-0 px-0 py-3 d-flex justify-content-between align-items-center"
                            style={{ borderBottom: index < (data?.top_revenue_services || []).length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}
                          >
                            <div className="d-flex align-items-center">
                              <div
                                className="me-3 d-flex align-items-center justify-content-center rounded-circle"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  backgroundColor: index === 0 ? "#fbbf24" : index === 1 ? "#9ca3af" : index === 2 ? "#f59e0b" : "#e5e7eb",
                                  color: "white",
                                  fontSize: "14px",
                                  fontWeight: "bold",
                                }}
                              >
                                {index + 1}
                              </div>
                              <span className="fw-medium" style={{ color: "#374151" }}>{s.service_name}</span>
                            </div>
                            <div className="d-flex align-items-center">
                              <strong className="me-3 fs-6" style={{ color: "#1f2937" }}>₱{s.revenue.toLocaleString()}</strong>
                              <span className={`badge ${(s.pct_change ?? 0) >= 0 ? "bg-success" : "bg-danger"} px-2 py-1`} style={{ fontSize: "0.75rem" }}>
                                {(s.pct_change ?? 0) >= 0 ? "↗" : "↘"} {Math.abs(s.pct_change ?? 0).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                        {(data?.top_revenue_services || []).length === 0 && (
                          <div className="text-center py-4 text-muted">
                            <span className="fs-4">💰</span>
                            <p className="mt-2 mb-0">No revenue data available</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 p-3 rounded-3" style={{ backgroundColor: "rgba(16, 185, 129, 0.05)" }}>
                        <div className="small text-muted mb-2 fw-medium">Total Revenue This Month:</div>
                        <div className="fs-4 fw-bold text-success">₱{(k?.total_revenue?.value ?? 0).toLocaleString()}</div>
                        <div className="small text-muted">
                          {k?.total_revenue?.pct_change >= 0 ? "↗" : "↘"} {Math.abs(k?.total_revenue?.pct_change ?? 0).toFixed(1)}% vs last month
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trend Line (unchanged) */}
              {trendChartData && (
                <div className="row g-2 g-md-3 g-lg-4 mb-4">
                  <div className="col-12">
                    <div className="card h-100 border-0 shadow-sm" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", borderRadius: "16px" }}>
                      <div className="card-header border-0 bg-transparent py-4">
                        <div className="d-flex justify-content-between align-items-center">
                          <h5 className="mb-0 fw-bold d-flex align-items-center" style={{ color: "#1e293b" }}>
                            <span className="me-2">📈</span>
                            Monthly Trends
                          </h5>
                          <select value={trendRange} onChange={(e) => setTrendRange(Number(e.target.value))} className="form-select form-select-sm" style={{ width: 140 }}>
                            <option value={6}>Last 6 months</option>
                            <option value={12}>Last 1 year</option>
                            <option value={24}>Last 2 years</option>
                          </select>
                        </div>
                      </div>
                      <div className="card-body pt-0">
                        <div className="px-1 px-md-2" style={{ height: "300px" }}>
                          <Line data={trendChartData} options={trendChartOptions} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Alerts */}
              <div className="mt-4">
                <div className="card border-0 shadow-sm" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", borderRadius: "16px" }}>
                  <div className="card-header border-0 bg-transparent py-4">
                    <h5 className="mb-0 fw-bold d-flex align-items-center" style={{ color: "#1e293b" }}>
                      <span className="me-2">🔔</span>
                      System Alerts
                    </h5>
                  </div>
                  <div className="card-body pt-0">
                    {(data?.alerts || []).length === 0 ? (
                      <div className="text-center py-4">
                        <div className="fs-1 mb-3">✅</div>
                        <p className="text-muted mb-0 fw-medium">All systems running smoothly</p>
                        <small className="text-muted">No alerts to display</small>
                      </div>
                    ) : (
                      <div className="list-group list-group-flush">
                        {(data?.alerts || []).map((a, idx) => (
                          <div key={idx} className={`list-group-item border-0 px-0 py-3 d-flex align-items-start ${a.type === "warning" ? "text-warning" : "text-info"}`}>
                            <span className="me-3 mt-1">{a.type === "warning" ? "⚠️" : "ℹ️"}</span>
                            <span className="fw-medium">{a.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
