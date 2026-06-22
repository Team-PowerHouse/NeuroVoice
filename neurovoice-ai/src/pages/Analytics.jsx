import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  getChildren,
  getBehaviors,
  getNeedFrequency,
  getBehaviorTimeline,
  getConfidenceDistribution,
  getPredictionAccuracy,
  getAccuracyTrend,
  getPredictions,
  seedDemoDataIfEmpty
} from "../utils/storage";
import "../styles/analytics.css";

const NEED_COLORS = ["#2e6ff2", "#0fae9c", "#f59e0b", "#f4654a", "#7c5cf2", "#06b6d4", "#84cc16", "#ec4899", "#64748b"];
const CONFIDENCE_COLORS = { Certain: "#0fae9c", Likely: "#2e6ff2", Unsure: "#f59e0b" };

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="ct-label">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="ct-value" style={{ color: p.color || p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState("all");
  const [behaviors, setBehaviors] = useState([]);
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    seedDemoDataIfEmpty();
    setChildren(getChildren());
    setBehaviors(getBehaviors());
    setPredictions(getPredictions());
  }, []);

  const filterId = activeChildId === "all" ? null : activeChildId;

  const frequency = useMemo(() => getNeedFrequency(filterId), [filterId, behaviors]);
  const timeline = useMemo(() => getBehaviorTimeline(filterId, 14), [filterId, behaviors]);
  const confidenceDist = useMemo(() => getConfidenceDistribution(filterId), [filterId, behaviors]);
  const accuracy = useMemo(() => getPredictionAccuracy(filterId), [filterId, predictions]);
  const accuracyTrend = useMemo(() => getAccuracyTrend(filterId, 6), [filterId, predictions]);

  const totalBehaviors = filterId ? behaviors.filter((b) => b.childId === filterId).length : behaviors.length;
  const totalResolved = (filterId ? predictions.filter((p) => p.childId === filterId) : predictions)
    .filter((p) => p.status === "confirmed" || p.status === "corrected").length;
  const totalPending = (filterId ? predictions.filter((p) => p.childId === filterId) : predictions)
    .filter((p) => p.status === "pending").length;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Behavior Analytics</p>
          <h1>Analytics Dashboard</h1>
          <p className="sub">Frequency patterns, confidence trends, and AI prediction accuracy across children.</p>
        </div>
      </div>

      <div className="page-content">
        {/* Child filter */}
        <div className="child-selector" style={{ marginBottom: "22px" }}>
          <button
            onClick={() => setActiveChildId("all")}
            className={`child-selector-tab ${activeChildId === "all" ? "active" : ""}`}
          >
            All Children
          </button>
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveChildId(c.id)}
              className={`child-selector-tab ${activeChildId === c.id ? "active" : ""}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Top stat row */}
        <div className="grid grid-4" style={{ marginBottom: "22px" }}>
          <div className="card hoverable stat-card">
            <div className="stat-icon-bar accent-blue" />
            <p className="stat-label">Total Behavior Samples</p>
            <p className="stat-value">{totalBehaviors}</p>
          </div>
          <div className="card hoverable stat-card">
            <div className="stat-icon-bar accent-teal" />
            <p className="stat-label">Prediction Accuracy</p>
            <p className="stat-value">{accuracy !== null ? `${accuracy}%` : "—"}</p>
          </div>
          <div className="card hoverable stat-card">
            <div className="stat-icon-bar accent-amber" />
            <p className="stat-label">Resolved Predictions</p>
            <p className="stat-value">{totalResolved}</p>
          </div>
          <div className="card hoverable stat-card">
            <div className="stat-icon-bar accent-coral" />
            <p className="stat-label">Pending Verification</p>
            <p className="stat-value">{totalPending}</p>
          </div>
        </div>

        <div className="grid grid-2" style={{ marginBottom: "22px" }}>
          {/* Behavior Frequency by Need */}
          <div className="card">
            <p className="section-title">Behavior Frequency by Need</p>
            {frequency.length === 0 ? (
              <p className="chart-empty">No behavior data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={frequency} layout="vertical" margin={{ left: 10, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis dataKey="need" type="category" width={130} tick={{ fontSize: 11, fill: "#334155" }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(46,111,242,0.06)" }} />
                  <Bar dataKey="count" name="Samples" radius={[0, 6, 6, 0]}>
                    {frequency.map((entry, i) => (
                      <Cell key={entry.need} fill={NEED_COLORS[i % NEED_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Confidence Distribution */}
          <div className="card">
            <p className="section-title">Confidence Distribution</p>
            {confidenceDist.every((c) => c.count === 0) ? (
              <p className="chart-empty">No behavior data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={confidenceDist}
                    dataKey="count"
                    nameKey="level"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {confidenceDist.map((entry) => (
                      <Cell key={entry.level} fill={CONFIDENCE_COLORS[entry.level]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value) => <span style={{ fontSize: "12px", color: "#334155" }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-2">
          {/* Behavior Timeline Trend */}
          <div className="card">
            <p className="section-title">Behavior Samples — Last 14 Days</p>
            {timeline.every((t) => t.count === 0) ? (
              <p className="chart-empty">No recent activity to chart yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={timeline} margin={{ left: -10, right: 16, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} interval={Math.ceil(timeline.length / 7)} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" name="Samples" stroke="#2e6ff2" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* AI Accuracy Trend */}
          <div className="card">
            <p className="section-title">AI Prediction Accuracy Over Time</p>
            {accuracyTrend.length === 0 ? (
              <p className="chart-empty">Accuracy data appears once predictions are confirmed or corrected via the Feedback Loop.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={accuracyTrend} margin={{ left: -10, right: 16, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#0fae9c" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
