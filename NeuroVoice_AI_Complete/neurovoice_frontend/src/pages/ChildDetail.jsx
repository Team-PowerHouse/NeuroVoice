import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import {
  getChildById,
  getBehaviorsByChild,
  buildBehaviorDictionary,
  getMostCommonNeed,
  getAverageConfidence,
  getDatasetReadiness,
  scoreToConfidenceClass,
  deleteChild,
  RECOMMENDED_RESPONSES,
  exportChildProfile,
  getPredictionAccuracy
} from "../utils/storage";
import "../styles/profile.css";

const AVATAR_PALETTE = ["#2e6ff2", "#0fae9c", "#f59e0b", "#f4654a", "#7c5cf2"];
function colorFor(id) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export default function ChildDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [behaviors, setBehaviors] = useState([]);
  const [dict, setDict] = useState([]);

  useEffect(() => {
    const c = getChildById(id);
    if (!c) { navigate("/children"); return; }
    setChild(c);
    const b = getBehaviorsByChild(id);
    setBehaviors(b);
    setDict(buildBehaviorDictionary(id));
  }, [id, navigate]);

  if (!child) return null;

  const initials = child.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const mostCommonNeed = getMostCommonNeed(behaviors);
  const avgConf = getAverageConfidence(behaviors);
  const readiness = getDatasetReadiness(behaviors);

  function handleExport() {
    const profile = exportChildProfile(id);
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neurovoice_${child.name.replace(/\s+/g, "_")}_profile.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDelete() {
    if (window.confirm(`Remove ${child.name}'s profile and all associated behavior data? This cannot be undone.`)) {
      deleteChild(id);
      navigate("/children");
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <Link to="/children" className="back-link">← All Profiles</Link>
          <h1>{child.name}</h1>
          <p className="sub">Personalized behavioral dictionary · {behaviors.length} samples</p>
        </div>
        <div className="topbar-right">
          <button onClick={handleExport} className="btn btn-secondary">⬇ Export Profile</button>
          <Link to={`/children/${id}/passport`} className="btn btn-secondary">📋 Communication Passport</Link>
          <Link to="/upload" className="btn btn-primary">⇧ Upload Behavior</Link>
        </div>
      </div>

      <div className="page-content">

        {/* Header */}
        <div className="card" style={{ marginBottom: "22px" }}>
          <div className="profile-header">
            <div className="profile-avatar" style={{ background: colorFor(child.id) }}>
              {initials}
            </div>
            <div className="profile-info">
              <h2>{child.name}</h2>
              <p className="profile-meta">{child.age} years old · {child.gender} · Caregiver: <strong>{child.caregiver}</strong></p>
              <span className="profile-support">{child.supportLevel}</span>
            </div>
          </div>

          <div className="profile-stats-row">
            <div className="profile-stat-box">
              <span className="psb-value">{behaviors.length}</span>
              <span className="psb-label">Behavior Samples</span>
            </div>
            <div className="profile-stat-box">
              <span className="psb-value">{dict.length}</span>
              <span className="psb-label">Dictionary Entries</span>
            </div>
            <div className="profile-stat-box">
              <span className="psb-value">{mostCommonNeed?.split(" ").slice(0, 2).join(" ") || "—"}</span>
              <span className="psb-label">Top Detected Need</span>
            </div>
            <div className="profile-stat-box">
              <span className="psb-value">{avgConf ? `${avgConf}%` : "—"}</span>
              <span className="psb-label">Avg. Confidence</span>
            </div>
            <div className="profile-stat-box">
              <span className="psb-value">{getPredictionAccuracy(id) !== null ? `${getPredictionAccuracy(id)}%` : "—"}</span>
              <span className="psb-label">AI Prediction Accuracy</span>
            </div>
          </div>

          <ProgressBar
            value={readiness}
            label="Dataset Readiness"
            sub="How complete this child's behavioral dictionary is for hospital use."
          />
        </div>

        <div className="grid grid-2">

          {/* Behavioral Dictionary */}
          <div className="card">
            <p className="section-title">Behavioral Dictionary</p>
            {dict.length === 0 ? (
              <div className="empty-state" style={{ padding: "32px 0" }}>
                <p className="icon">📖</p>
                <h3>No patterns learned yet.</h3>
                <p>Upload behavior videos to start building this child's dictionary.</p>
              </div>
            ) : (
              dict.map((entry, i) => (
                <div key={`${entry.behaviorLabel}-${entry.need}`} className="dict-entry">
                  <span className="de-rank">{i + 1}</span>
                  <div className="de-info">
                    <p className="de-behavior">{entry.behaviorLabel}</p>
                    <p className="de-count">{entry.sampleCount} sample{entry.sampleCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="translation-chip" style={{ flex: "1" }}>
                    <span className="t-behavior" style={{ fontSize: "12px" }}>{entry.behaviorLabel}</span>
                    <span className="t-path" />
                    <span className="t-speech" style={{ fontSize: "12px" }}>{entry.need}</span>
                  </div>
                  <span className={`confidence-badge ${scoreToConfidenceClass(entry.avgConfidenceScore)}`}>
                    {entry.avgConfidenceScore}%
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Recommended Responses */}
          <div className="card">
            <p className="section-title">Recommended Responses</p>
            {dict.length === 0 ? (
              <p style={{ color: "var(--slate-500)", fontSize: "13.5px" }}>
                Responses will appear once behavior patterns are detected.
              </p>
            ) : (
              [...new Set(dict.map((e) => e.need))].slice(0, 5).map((need) => (
                <div key={need} style={{ marginBottom: "16px", borderBottom: "1px solid var(--slate-100)", paddingBottom: "16px" }}>
                  <p style={{ fontWeight: "800", fontSize: "13.5px", color: "var(--slate-800)", marginBottom: "5px" }}>
                    {need}
                  </p>
                  <p style={{ fontSize: "13px", color: "var(--slate-600)", lineHeight: "1.55" }}>
                    {RECOMMENDED_RESPONSES[need]}
                  </p>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Behavior Timeline */}
        <div className="card" style={{ marginTop: "22px" }}>
          <p className="section-title">Behavior Timeline</p>
          {behaviors.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px 0" }}>
              <p className="icon">🕐</p>
              <h3>No behavior history yet.</h3>
            </div>
          ) : (
            behaviors.slice(0, 10).map((b) => (
              <div key={b.id} className="timeline-row">
                <div className="timeline-dot" />
                <div className="timeline-body">
                  <p className="timeline-title">{b.behaviorLabel || "Unlabeled Pattern"} → {b.need}</p>
                  <p className="timeline-meta">{b.notes || "No notes added."}</p>
                </div>
                <span className="timeline-meta" style={{ whiteSpace: "nowrap" }}>{formatDate(b.timestamp)}</span>
              </div>
            ))
          )}
        </div>

        {/* Danger zone */}
        <div style={{ marginTop: "28px", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleDelete} className="btn btn-secondary" style={{ color: "var(--alert-coral)", borderColor: "var(--alert-coral)" }}>
            🗑 Remove This Profile
          </button>
        </div>

      </div>
    </>
  );
}
