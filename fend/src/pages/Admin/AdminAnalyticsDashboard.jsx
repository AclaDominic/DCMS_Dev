import { useEffect, useMemo, useState } from "react";
import api from "../../api/api";
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
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  ChartTooltip,
  ChartLegend,
  Filler
);

export default function AdminAnalyticsDashboard() {
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/analytics/summary", {
        params: { period: month },
      });
      setData(res.data || null);
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
  }, [month]);

  const k = data?.kpis || {};

  const createSparklineData = (color, backgroundColor) => {
    const series = data?.series?.visits_by_day || [];
    const labels = series.map((r) => ""); // Empty labels to prevent any text
    const values = series.map((r) => Number(r.count) || 0);
    return {
      labels,
      datasets: [
        {
          label: "", // Empty label
          data: values,
          borderColor: color,
          backgroundColor: backgroundColor,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: 2,
          fill: true,
          showLine: true,
          spanGaps: false,
        },
      ],
    };
  };

  const sparklineData = useMemo(
    () => ({
      visits: createSparklineData("#3b82f6", "rgba(59, 130, 246, 0.1)"),
      appointments: createSparklineData("#10b981", "rgba(16, 185, 129, 0.1)"),
      noShows: createSparklineData("#ef4444", "rgba(239, 68, 68, 0.1)"),
      avgDuration: createSparklineData("#f59e0b", "rgba(245, 158, 11, 0.1)"),
    }),
    [data]
  );

  const sparkOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: { display: false },
      },
      elements: {
        point: {
          radius: 0,
          hoverRadius: 0,
          hoverBorderWidth: 0,
        },
        line: {
          borderWidth: 2,
          tension: 0.4,
        },
      },
      scales: {
        x: {
          display: false,
          grid: { display: false },
          ticks: { display: false },
          title: { display: false },
        },
        y: {
          display: false,
          grid: { display: false },
          ticks: { display: false },
          title: { display: false },
        },
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
      animation: {
        duration: 1000,
        easing: "easeInOutQuart",
      },
      layout: {
        padding: 0,
      },
    }),
    []
  );

  const payBar = useMemo(() => {
    const cash = k?.payment_method_share?.cash ?? {};
    const hmo = k?.payment_method_share?.hmo ?? {};
    const maya = k?.payment_method_share?.maya ?? {};
    return {
      labels: ["Cash", "HMO", "Maya"],
      datasets: [
        {
          label: "This Month",
          backgroundColor: [
            "rgba(34, 197, 94, 0.8)", // Green for Cash
            "rgba(139, 92, 246, 0.8)", // Purple for HMO
            "rgba(59, 130, 246, 0.8)", // Blue for Maya
          ],
          borderColor: [
            "rgba(34, 197, 94, 1)",
            "rgba(139, 92, 246, 1)",
            "rgba(59, 130, 246, 1)",
          ],
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          data: [
            Number(cash.share_pct || 0),
            Number(hmo.share_pct || 0),
            Number(maya.share_pct || 0),
          ],
        },
      ],
    };
  }, [k]);

  const payBarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "white",
          bodyColor: "white",
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: function (context) {
              return `${context.label}: ${context.parsed.y}%`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#6b7280",
            font: { size: 12, weight: "500" },
          },
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: "rgba(107, 114, 128, 0.1)",
            drawBorder: false,
          },
          ticks: {
            callback: (v) => `${v}%`,
            color: "#6b7280",
            font: { size: 12, weight: "500" },
          },
        },
      },
    }),
    []
  );

  const kpiInsights = useMemo(() => {
    if (!data) return null;
    const arrowPct = (x) =>
      x > 0 ? `▲ ${x}%` : x < 0 ? `▼ ${Math.abs(x)}%` : "—";
    return {
      visits: `Change vs last month: ${arrowPct(
        k?.total_visits?.pct_change || 0
      )}`,
      approved: `Change vs last month: ${arrowPct(
        k?.approved_appointments?.pct_change || 0
      )}`,
      noShows: `Change vs last month: ${arrowPct(
        k?.no_shows?.pct_change || 0
      )}`,
      avgDuration: `Change vs last month: ${arrowPct(
        k?.avg_visit_duration_min?.pct_change || 0
      )}`,
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
    
    return `Follow-up rate: ${rate}% (${returned}/${total} patients returned within 3-4 months). ` +
      `Change: ${change >= 0 ? '▲' : '▼'}${Math.abs(change)}%. ` +
      (rate >= 50 ? 'Excellent retention! This indicates strong patient satisfaction.' : 
       rate >= 30 ? 'Good retention. Consider strategies to improve further.' : 
       'Consider implementing follow-up calls, appointment reminders, or patient satisfaction surveys.');
  }, [k]);

  const topServiceInsight = useMemo(() => {
    const s = (data?.top_services || [])[0];
    if (!s) return null;
    const change = s.pct_change ?? 0;
    return (
      `Top service: ${s.service_name} (Δ ${change >= 0 ? "▲" : "▼"}${Math.abs(
        change
      )}% vs last month). ` +
      `Tip: Align stock/staffing; promote under-performers.`
    );
  }, [data]);

  const pct = (v) =>
    typeof v === "number" ? `${v > 0 ? "+" : ""}${v.toFixed(2)}%` : "0%";

  const kpiCard = (title, value, change, icon, color, sparklineKey) => (
    <div
      className="card h-100 border-0 shadow-sm"
      style={{
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        transition: "all 0.3s ease",
      }}
    >
      <div className="card-body p-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div
            className="text-muted small fw-medium text-uppercase tracking-wide"
            style={{
              letterSpacing: "0.5px",
              fontSize: "0.75rem",
            }}
          >
            {title}
          </div>
          <div className="fs-4" style={{ color: color || "#6b7280" }}>
            {icon}
          </div>
        </div>
        <div
          className="fs-2 fw-bold mb-2"
          style={{
            color: "#1f2937",
            lineHeight: "1.2",
          }}
        >
          {value ?? 0}
        </div>
        <div
          className={
            "small fw-medium d-flex align-items-center " +
            ((change ?? 0) >= 0 ? "text-success" : "text-danger")
          }
        >
          <span className="me-1">{(change ?? 0) >= 0 ? "↗" : "↘"}</span>
          {pct(change)} vs last month
        </div>
        <div
          style={{
            height: 60,
            position: "relative",
            overflow: "hidden",
          }}
          className="mt-3 sparkline-container"
        >
          <Line
            data={sparklineData[sparklineKey] || sparklineData.visits}
            options={sparkOptions}
            height={60}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>
        {`
          .sparkline-container {
            position: relative;
            overflow: hidden;
          }
          .sparkline-container canvas {
            max-height: 60px !important;
            display: block !important;
          }
          .sparkline-container .chartjs-render-monitor {
            max-height: 60px !important;
          }
          /* Hide any potential numbers, labels, or text */
          .sparkline-container * {
            font-size: 0 !important;
            color: transparent !important;
            text-shadow: none !important;
            -webkit-text-stroke: none !important;
          }
          /* Specifically target Chart.js elements */
          .sparkline-container .chartjs-size-monitor,
          .sparkline-container .chartjs-size-monitor-expand,
          .sparkline-container .chartjs-size-monitor-shrink {
            display: none !important;
          }
          /* Hide any text elements that might appear */
          .sparkline-container text,
          .sparkline-container tspan,
          .sparkline-container .chartjs-tooltip {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }
        `}
      </style>
      <div
        className="p-4"
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          minHeight: "100vh",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="m-0 fw-bold" style={{ color: "#1e293b" }}>
              📊 Analytics Dashboard
            </h2>
            <p className="text-muted mb-0 mt-1">
              Monitor your clinic's performance and key metrics
            </p>
          </div>
          <div className="d-flex gap-3 align-items-center">
            <input
              type="month"
              className="form-control border-0 shadow-sm"
              style={{
                width: 180,
                borderRadius: "12px",
                padding: "12px 16px",
                fontSize: "14px",
                fontWeight: "500",
              }}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="Select month"
            />
            <button
              className="btn border-0 shadow-sm"
              onClick={load}
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                color: "white",
                borderRadius: "12px",
                padding: "12px 24px",
                fontWeight: "600",
                transition: "all 0.3s ease",
              }}
            >
              {loading ? "⟳" : "↻"} Refresh
            </button>
          </div>
        </div>

        {error && (
          <div
            className="alert alert-danger border-0 shadow-sm mb-4"
            role="alert"
            style={{ borderRadius: "12px" }}
          >
            <div className="d-flex align-items-center">
              <span className="me-2">⚠️</span>
              {error}
            </div>
          </div>
        )}

        {loading ? (
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: "400px" }}
          >
            <div className="text-center">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted">Loading analytics data...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="row g-2 g-md-3 g-lg-4 mb-4">
              <div className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2">
                {kpiCard(
                  "Total Visits",
                  k?.total_visits?.value,
                  k?.total_visits?.pct_change,
                  "👥",
                  "#3b82f6",
                  "visits"
                )}
              </div>
              <div className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2">
                {kpiCard(
                  "Approved Appointments",
                  k?.approved_appointments?.value,
                  k?.approved_appointments?.pct_change,
                  "✅",
                  "#10b981",
                  "appointments"
                )}
              </div>
              <div className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2">
                {kpiCard(
                  "No-shows",
                  k?.no_shows?.value,
                  k?.no_shows?.pct_change,
                  "❌",
                  "#ef4444",
                  "noShows"
                )}
              </div>
              <div className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2">
                {kpiCard(
                  "Avg Visit (min)",
                  k?.avg_visit_duration_min?.value?.toFixed?.(1) ?? 0,
                  k?.avg_visit_duration_min?.pct_change,
                  "⏱️",
                  "#f59e0b",
                  "avgDuration"
                )}
              </div>
              <div className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2">
                {kpiCard(
                  "Total Revenue",
                  `₱${(k?.total_revenue?.value ?? 0).toLocaleString()}`,
                  k?.total_revenue?.pct_change,
                  "💰",
                  "#10b981",
                  "visits"
                )}
              </div>
            </div>

            <div className="row g-2 g-md-3 g-lg-4">
              <div className="col-12 col-lg-6">
                <div
                  className="card h-100 border-0 shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                    borderRadius: "16px",
                  }}
                >
                  <div className="card-header border-0 bg-transparent py-4">
                    <h5
                      className="mb-0 fw-bold d-flex align-items-center"
                      style={{ color: "#1e293b" }}
                    >
                      <span className="me-2">💳</span>
                      Payment Method Share
                    </h5>
                  </div>
                  <div className="card-body pt-0">
                    <div style={{ height: "300px" }}>
                      <Bar data={payBar} options={payBarOptions} />
                    </div>
                    <div
                      className="mt-3 p-3 rounded-3"
                      style={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
                    >
                      <div className="small text-muted mb-2 fw-medium">
                        Monthly Changes:
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="small">
                          <span className="fw-medium">Cash:</span>
                          <span
                            className={
                              (k?.payment_method_share?.cash
                                ?.pct_point_change ?? 0) >= 0
                                ? "text-success"
                                : "text-danger"
                            }
                          >
                            {pct(
                              k?.payment_method_share?.cash?.pct_point_change ||
                                0
                            )}
                          </span>
                        </span>
                        <span className="small">
                          <span className="fw-medium">HMO:</span>
                          <span
                            className={
                              (k?.payment_method_share?.hmo?.pct_point_change ??
                                0) >= 0
                                ? "text-success"
                                : "text-danger"
                            }
                          >
                            {pct(
                              k?.payment_method_share?.hmo?.pct_point_change ||
                                0
                            )}
                          </span>
                        </span>
                        <span className="small">
                          <span className="fw-medium">Maya:</span>
                          <span
                            className={
                              (k?.payment_method_share?.maya
                                ?.pct_point_change ?? 0) >= 0
                                ? "text-success"
                                : "text-danger"
                            }
                          >
                            {pct(
                              k?.payment_method_share?.maya?.pct_point_change ||
                                0
                            )}
                          </span>
                        </span>
                      </div>
                    </div>
                    {paymentInsight && (
                      <div
                        className="mt-3 p-3 rounded-3"
                        style={{ backgroundColor: "rgba(16, 185, 129, 0.05)" }}
                      >
                        <small className="text-muted">{paymentInsight}</small>
                      </div>
                    )}
                    {followUpInsight && (
                      <div
                        className="mt-3 p-3 rounded-3"
                        style={{ backgroundColor: "rgba(139, 92, 246, 0.05)" }}
                      >
                        <small className="text-muted">{followUpInsight}</small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="col-12 col-lg-6">
                <div
                  className="card h-100 border-0 shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                    borderRadius: "16px",
                  }}
                >
                  <div className="card-header border-0 bg-transparent py-4">
                    <h5
                      className="mb-0 fw-bold d-flex align-items-center"
                      style={{ color: "#1e293b" }}
                    >
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
                          style={{
                            borderBottom:
                              index < (data?.top_revenue_services || []).length - 1
                                ? "1px solid rgba(0,0,0,0.05)"
                                : "none",
                          }}
                        >
                          <div className="d-flex align-items-center">
                            <div
                              className="me-3 d-flex align-items-center justify-content-center rounded-circle"
                              style={{
                                width: "32px",
                                height: "32px",
                                backgroundColor:
                                  index === 0
                                    ? "#fbbf24"
                                    : index === 1
                                    ? "#9ca3af"
                                    : index === 2
                                    ? "#f59e0b"
                                    : "#e5e7eb",
                                color: "white",
                                fontSize: "14px",
                                fontWeight: "bold",
                              }}
                            >
                              {index + 1}
                            </div>
                            <span
                              className="fw-medium"
                              style={{ color: "#374151" }}
                            >
                              {s.service_name}
                            </span>
                          </div>
                          <div className="d-flex align-items-center">
                            <strong
                              className="me-3 fs-6"
                              style={{ color: "#1f2937" }}
                            >
                              ₱{s.revenue.toLocaleString()}
                            </strong>
                            <span
                              className={`badge ${
                                (s.pct_change ?? 0) >= 0
                                  ? "bg-success"
                                  : "bg-danger"
                              } px-2 py-1`}
                              style={{ fontSize: "0.75rem" }}
                            >
                              {(s.pct_change ?? 0) >= 0 ? "↗" : "↘"}{" "}
                              {Math.abs(s.pct_change ?? 0).toFixed(1)}%
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
                    <div
                      className="mt-3 p-3 rounded-3"
                      style={{ backgroundColor: "rgba(16, 185, 129, 0.05)" }}
                    >
                      <div className="small text-muted mb-2 fw-medium">
                        Total Revenue This Month:
                      </div>
                      <div className="fs-4 fw-bold text-success">
                        ₱{(k?.total_revenue?.value ?? 0).toLocaleString()}
                      </div>
                      <div className="small text-muted">
                        {k?.total_revenue?.pct_change >= 0 ? "↗" : "↘"}{" "}
                        {Math.abs(k?.total_revenue?.pct_change ?? 0).toFixed(1)}% vs last month
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div
                className="card border-0 shadow-sm"
                style={{
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                  borderRadius: "16px",
                }}
              >
                <div className="card-header border-0 bg-transparent py-4">
                  <h5
                    className="mb-0 fw-bold d-flex align-items-center"
                    style={{ color: "#1e293b" }}
                  >
                    <span className="me-2">🔔</span>
                    System Alerts
                  </h5>
                </div>
                <div className="card-body pt-0">
                  {(data?.alerts || []).length === 0 ? (
                    <div className="text-center py-4">
                      <div className="fs-1 mb-3">✅</div>
                      <p className="text-muted mb-0 fw-medium">
                        All systems running smoothly
                      </p>
                      <small className="text-muted">No alerts to display</small>
                    </div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {(data?.alerts || []).map((a, idx) => (
                        <div
                          key={idx}
                          className={`list-group-item border-0 px-0 py-3 d-flex align-items-start ${
                            a.type === "warning" ? "text-warning" : "text-info"
                          }`}
                        >
                          <span className="me-3 mt-1">
                            {a.type === "warning" ? "⚠️" : "ℹ️"}
                          </span>
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
    </>
  );
}