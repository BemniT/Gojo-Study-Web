import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import useTopbarNotifications from "../hooks/useTopbarNotifications";
import useRegistrarSession from "../hooks/auth/useRegistrarSession";
import useAnalyticsData, { MONTHS } from "../hooks/students/useAnalyticsData";
import RegisterSidebar from "../components/RegisterSidebar";
import DashboardTopBar from "../components/dashboard/layout/DashboardTopBar";
import { exportAnalyticsExcel, exportAnalyticsPdf } from "../utils/analyticsExports";

function Analatics() {
  const navigate = useNavigate();
  const { finance, schoolCode, DB_ROOT } = useRegistrarSession();

  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [periodMode, setPeriodMode] = useState("month");
  const [exporting, setExporting] = useState(false);
  const [showPostDropdown, setShowPostDropdown] = useState(false);

  const {
    unreadSenders,
    setUnreadSenders,
    unreadPosts: unreadPostList,
    totalNotifications,
    messageCount,
    markMessagesAsSeen,
    markPostAsSeen,
  } = useTopbarNotifications({ dbRoot: DB_ROOT, currentUserId: finance.userId });

  const {
    loading,
    allYears,
    summary,
    monthlyTrend,
    yearlyTrend,
    activeSummary,
    activeGradeBreakdown,
    activeGenderBreakdown,
    activeLabel,
    yearlyChartData,
    selectedYearRateText,
  } = useAnalyticsData({ DB_ROOT, selectedYear, selectedMonth, periodMode, setSelectedYear });

  useEffect(() => {
    const closeDropdown = (e) => {
      if (!e.target.closest(".icon-circle") && !e.target.closest(".notification-dropdown")) {
        setShowPostDropdown(false);
      }
    };
    document.addEventListener("click", closeDropdown);
    return () => document.removeEventListener("click", closeDropdown);
  }, []);

  const openPostFromNotif = async (post) => {
    setShowPostDropdown(false);
    try {
      await markPostAsSeen(post.postId);
      navigate("/dashboard", { state: { postId: post.postId } });
    } catch (err) {
      console.error("Error opening post notification:", err);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await exportAnalyticsExcel({
        schoolCode, selectedYear, selectedMonth, periodMode,
        activeSummary, activeGradeBreakdown, activeGenderBreakdown,
        monthlyTrend, yearlyTrend,
      });
    } catch (err) {
      console.error("Excel export failed:", err);
      alert("Failed to export Excel report.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    try {
      setExporting(true);
      exportAnalyticsPdf({
        schoolCode, selectedYear, selectedMonth, periodMode,
        summary, activeSummary, activeGradeBreakdown, activeGenderBreakdown, yearlyTrend,
      });
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Failed to export PDF report.");
    } finally {
      setExporting(false);
    }
  };

  const pageBackground = "linear-gradient(180deg, var(--page-bg) 0%, var(--page-bg-secondary) 100%)";
  const panelStyle = {
    background: "var(--surface-panel)",
    border: "1px solid var(--border-soft)",
    borderRadius: 12,
    boxShadow: "var(--shadow-soft)",
  };
  const filterBarStyle = {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    padding: "10px 12px",
    ...panelStyle,
  };
  const pillButtonStyle = (active) => ({
    border: active ? "1px solid var(--accent-strong)" : "1px solid var(--accent-soft)",
    background: active ? "var(--accent-strong)" : "var(--accent-soft)",
    color: active ? "#fff" : "var(--accent-strong)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  });
  const statCardStyle = (borderColor) => ({
    ...panelStyle,
    padding: 12,
    border: `1px solid ${borderColor}`,
  });
  const chartAxisStyle = { fontSize: 11, fill: "var(--text-muted)" };
  const chartGridStroke = "var(--border-soft)";
  const paidColor = "var(--success)";
  const unpaidColor = "var(--danger)";
  const accentColor = "var(--accent-strong)";
  const warningColor = "var(--warning)";

  return (
    <div className="dashboard-page" style={{ background: pageBackground, minHeight: "100vh" }}>
      <DashboardTopBar
        admin={finance}
        totalNotifications={totalNotifications}
        showPostDropdown={showPostDropdown}
        setShowPostDropdown={setShowPostDropdown}
        unreadPostList={unreadPostList}
        messageCount={messageCount}
        unreadSenders={unreadSenders}
        setUnreadSenders={setUnreadSenders}
        markMessagesAsSeen={markMessagesAsSeen}
        onOpenPost={openPostFromNotif}
      />

      <div className="google-dashboard" style={{ display: "flex", gap: 14, padding: "12px" }}>
        <RegisterSidebar user={finance} sticky fullHeight />

        <div className="main-content" style={{ padding: "10px 20px 20px", flex: 1, minWidth: 0, boxSizing: "border-box" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="section-header-card">
              <h2 className="section-header-card__title">Financial Analytics Dashboard</h2>
              <div className="section-header-card__subtitle">Production-level payment analytics by month, grade, and gender.</div>
            </div>

            <div style={filterBarStyle}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700 }}>Year</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ border: "1px solid var(--input-border)", borderRadius: 8, padding: "6px 10px", fontSize: 12, outline: "none", background: "var(--input-bg)", color: "var(--text-primary)" }}>
                {allYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <button onClick={() => setPeriodMode("year")} style={{ marginLeft: 10, ...pillButtonStyle(periodMode === "year") }}>
                This Year
              </button>

              <label style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700, marginLeft: 8 }}>Month</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {MONTHS.map((m) => (
                  <button
                    key={m}
                    onClick={() => { setSelectedMonth(m); setPeriodMode("month"); }}
                    style={pillButtonStyle(periodMode === "month" && selectedMonth === m)}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  onClick={handleExportExcel}
                  disabled={loading || exporting}
                  style={{ border: "1px solid var(--success)", background: "var(--success)", color: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: loading || exporting ? "not-allowed" : "pointer", opacity: loading || exporting ? 0.7 : 1 }}
                >
                  Export Excel
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={loading || exporting}
                  style={{ border: "1px solid var(--accent-strong)", background: "var(--accent-strong)", color: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: loading || exporting ? "not-allowed" : "pointer", opacity: loading || exporting ? 0.7 : 1 }}
                >
                  Export PDF
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(140px, 1fr))", gap: 10 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ height: 90, borderRadius: 12, background: "var(--surface-panel)", border: "1px solid var(--border-soft)" }} />
                ))}
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  <div style={statCardStyle("var(--border-soft)")}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>{periodMode === "year" ? "TOTAL EXPECTED PAYMENTS" : "TOTAL STUDENTS"}</div>
                    <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{activeSummary.totalStudents}</div>
                  </div>
                  <div style={statCardStyle("var(--success-border)")}>
                    <div style={{ fontSize: 11, color: "var(--success)", fontWeight: 700 }}>PAID ({activeLabel})</div>
                    <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: "var(--success)" }}>{activeSummary.paid}</div>
                  </div>
                  <div style={statCardStyle("var(--danger-border)")}>
                    <div style={{ fontSize: 11, color: "var(--danger)", fontWeight: 700 }}>UNPAID ({activeLabel})</div>
                    <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: "var(--danger)" }}>{activeSummary.unpaid}</div>
                  </div>
                  <div style={statCardStyle("var(--accent-soft)")}>
                    <div style={{ fontSize: 11, color: "var(--accent-strong)", fontWeight: 700 }}>PAYMENT RATE</div>
                    <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: "var(--accent-strong)" }}>{activeSummary.paidRate}%</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                  <div style={{ ...panelStyle, padding: 12, minHeight: 320 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)", marginBottom: 8 }}>Monthly Payment Trend ({selectedYear})</div>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={monthlyTrend}>
                        <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={chartAxisStyle} />
                        <YAxis tick={chartAxisStyle} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="paid" stroke={paidColor} strokeWidth={2.5} />
                        <Line type="monotone" dataKey="unpaid" stroke={unpaidColor} strokeWidth={2.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ ...panelStyle, padding: 12, minHeight: 320 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)", marginBottom: 8 }}>Paid vs Unpaid ({activeLabel})</div>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={[{ name: "Paid", value: activeSummary.paid }, { name: "Unpaid", value: activeSummary.unpaid }]} dataKey="value" nameKey="name" innerRadius={45} outerRadius={78} paddingAngle={4}>
                          <Cell fill={paidColor} />
                          <Cell fill={unpaidColor} />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                  <div style={{ ...panelStyle, padding: 12, minHeight: 340 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)", marginBottom: 8 }}>Grade-wise Collection Performance ({activeLabel})</div>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={activeGradeBreakdown}>
                        <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                        <XAxis dataKey="grade" tick={chartAxisStyle} />
                        <YAxis tick={chartAxisStyle} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="paid" stackId="a" fill={paidColor} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="unpaid" stackId="a" fill={warningColor} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ ...panelStyle, padding: 12, minHeight: 340 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)", marginBottom: 8 }}>Gender Distribution ({activeLabel})</div>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={activeGenderBreakdown}>
                        <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={chartAxisStyle} />
                        <YAxis tick={chartAxisStyle} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="paid" fill={accentColor} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="unpaid" fill={unpaidColor} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {periodMode === "year" && (
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                    <div style={{ ...panelStyle, padding: 12, minHeight: 320 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)", marginBottom: 8 }}>Yearly Collection Trend</div>
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={yearlyChartData}>
                          <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                          <XAxis dataKey="year" tick={chartAxisStyle} />
                          <YAxis tick={chartAxisStyle} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="paid" stroke={accentColor} strokeWidth={2.5} />
                          <Line type="monotone" dataKey="unpaid" stroke={warningColor} strokeWidth={2.5} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ ...panelStyle, padding: 12, minHeight: 320 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)", marginBottom: 8 }}>Yearly Payment Rate %</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                        paidRate : {selectedYearRateText}
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={yearlyChartData}>
                          <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                          <XAxis dataKey="year" tick={chartAxisStyle} />
                          <YAxis domain={[0, 100]} tick={chartAxisStyle} />
                          <Tooltip formatter={(v) => `${v}%`} />
                          <Legend />
                          <Bar dataKey="paidRate" fill={paidColor} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div style={{ ...panelStyle, padding: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)", marginBottom: 10 }}>Grade Summary Table ({activeLabel})</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "var(--surface-muted)" }}>
                          <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border-soft)", color: "var(--text-primary)" }}>Grade</th>
                          <th style={{ textAlign: "right", padding: "8px 10px", borderBottom: "1px solid var(--border-soft)", color: "var(--text-primary)" }}>Total</th>
                          <th style={{ textAlign: "right", padding: "8px 10px", borderBottom: "1px solid var(--border-soft)", color: "var(--text-primary)" }}>Paid</th>
                          <th style={{ textAlign: "right", padding: "8px 10px", borderBottom: "1px solid var(--border-soft)", color: "var(--text-primary)" }}>Unpaid</th>
                          <th style={{ textAlign: "right", padding: "8px 10px", borderBottom: "1px solid var(--border-soft)", color: "var(--text-primary)" }}>Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeGradeBreakdown.map((row) => {
                          const rate = row.total ? Math.round((row.paid / row.total) * 100) : 0;
                          return (
                            <tr key={row.grade}>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-soft)", fontWeight: 700, color: "var(--text-primary)" }}>Grade {row.grade}</td>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-soft)", textAlign: "right", color: "var(--text-primary)" }}>{row.total}</td>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-soft)", textAlign: "right", color: "var(--success)", fontWeight: 700 }}>{row.paid}</td>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-soft)", textAlign: "right", color: "var(--warning)", fontWeight: 700 }}>{row.unpaid}</td>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-soft)", textAlign: "right", color: "var(--accent-strong)", fontWeight: 800 }}>{rate}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analatics;
