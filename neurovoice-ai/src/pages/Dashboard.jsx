import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../components/StatCard";
import ActivityCard from "../components/ActivityCard";
import ProgressBar from "../components/ProgressBar";
import {
  getChildren,
  getBehaviors,
  getMostCommonNeed,
  getDatasetReadiness,
  getAverageConfidence,
  getPredictionAccuracy,
  seedDemoDataIfEmpty
} from "../utils/storage";
import { useDemoMode } from "../context/DemoModeContext.jsx";
import "../styles/dashboard.css";

export default function Dashboard() {
  const [children, setChildren] = useState([]);
  const [behaviors, setBehaviors] = useState([]);
  const { active: demoActive, toggle: toggleDemo, tickCount } = useDemoMode();

  useEffect(() => {
    seedDemoDataIfEmpty();
    setChildren(getChildren());
    setBehaviors(getBehaviors());
  }, [tickCount]);

  const mostCommonNeed = getMostCommonNeed(behaviors);
  const readiness = getDatasetReadiness(behaviors);
  const avgConfidence = getAverageConfidence(behaviors);
  const overallAccuracy = getPredictionAccuracy();
  const recent = behaviors.slice(0, 6);

  const needCounts = {};
  behaviors.forEach((b) => {
    needCounts[b.need] = (needCounts[b.need] || 0) + 1;
  });
  const topNeeds = Object.entries(needCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Hospital Dashboard</p>
          <h1>NeuroVoice AI</h1>
          <p className="sub">Behavioral communication translator for non-verbal children</p>
        </div>
        <div className="topbar-right">
          <button
            onClick={toggleDemo}
            className={`btn ${demoActive ? "btn-primary" : "btn-secondary"}`}
          >
            {demoActive ? "⏸ Stop Demo Mode" : "▶ Start Demo Mode"}
          </button>
          <div className="live-pill">
            <span className="live-dot" />
            System Active
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="dashboard-grid">

          {/* Stat cards */}
          <div className="grid grid-4">
            <StatCard
              label="Children Registered"
              value={children.length}
              sub="Active profiles"
              accent="blue"
            />
            <StatCard
              label="Behavior Samples"
              value={behaviors.length}
              sub="Across all children"
              accent="teal"
            />
            <StatCard
              label="Most Common Need"
              value={mostCommonNeed || "—"}
              sub="Detected across all profiles"
              accent="amber"
            />
            <StatCard
              label="AI Confidence"
              value={avgConfidence ? `${avgConfidence}%` : "—"}
              sub={overallAccuracy !== null ? `${overallAccuracy}% prediction accuracy` : "Average across samples"}
              accent="coral"
            />
          </div>

          {/* Dataset Readiness */}
          <div className="card">
            <p className="section-title">Dataset Readiness</p>
            <ProgressBar
              value={readiness}
              label="Training completeness"
              sub={`${behaviors.length} of 60 recommended samples collected. ${readiness < 50 ? "Upload more behavior videos to improve prediction accuracy." : readiness < 80 ? "Good progress. Keep labeling behaviors for better reliability." : "Dataset is hospital-ready. Predictions are now highly reliable."}`}
            />
          </div>

          {/* Panel: Activity + Top Needs */}
          <div className="panel-row">
            <div className="card">
              <p className="section-title">Recent Behavior Activity</p>
              {recent.length === 0 ? (
                <div className="empty-state">
                  <p className="icon">📋</p>
                  <h3>No samples yet</h3>
                  <p>Upload behavior videos to start building the dictionary.</p>
                </div>
              ) : (
                recent.map((b) => <ActivityCard key={b.id} behavior={b} />)
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Top Detected Needs */}
              <div className="card">
                <p className="section-title">Top Detected Needs</p>
                {topNeeds.length === 0 ? (
                  <p style={{ color: "var(--slate-500)", fontSize: "13.5px" }}>
                    No data yet. Upload behavior samples to see patterns.
                  </p>
                ) : (
                  topNeeds.map(([need, count]) => (
                    <div key={need} style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "600", marginBottom: "5px" }}>
                        <span>{need}</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--clinical-blue-dark)" }}>{count}</span>
                      </div>
                      <ProgressBar value={Math.round((count / behaviors.length) * 100)} />
                    </div>
                  ))
                )}
              </div>

              {/* Quick Actions */}
              <div className="card">
                <p className="section-title">Quick Actions</p>
                <div className="quick-actions">
                  <Link to="/add-child" className="quick-action-btn btn">
                    <span className="quick-action-icon">✚</span> Register Child
                  </Link>
                  <Link to="/upload" className="quick-action-btn btn">
                    <span className="quick-action-icon">⇧</span> Upload Behavior
                  </Link>
                  <Link to="/monitoring" className="quick-action-btn btn">
                    <span className="quick-action-icon">◎</span> Live Monitor
                  </Link>
                  <Link to="/dictionary" className="quick-action-btn btn">
                    <span className="quick-action-icon">❝</span> View Dictionary
                  </Link>
                  <Link to="/timeline" className="quick-action-btn btn">
                    <span className="quick-action-icon">⏱</span> Communication Timeline
                  </Link>
                  <Link to="/analytics" className="quick-action-btn btn">
                    <span className="quick-action-icon">📊</span> Analytics Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="card">
            <p className="section-title">How NeuroVoice AI Translates Behavior</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { behavior: "Door Approach + Handle Interaction", need: "Want To Leave Room" },
                { behavior: "Bottle Fixation", need: "Thirst" },
                { behavior: "Ear Covering", need: "Sensory Overload" },
                { behavior: "Rocking In Place", need: "Anxiety" }
              ].map((ex) => (
                <div key={ex.need} className="translation-chip">
                  <span className="t-behavior">{ex.behavior}</span>
                  <span className="t-path" />
                  <span className="t-speech">{ex.need}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
