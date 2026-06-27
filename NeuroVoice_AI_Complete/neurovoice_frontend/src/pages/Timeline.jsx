import { useEffect, useMemo, useState } from "react";
import {
  getChildren,
  getBehaviors,
  getPredictions,
  seedDemoDataIfEmpty
} from "../utils/storage";
import "../styles/timeline.css";

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function dayKey(ts) {
  return new Date(ts).toDateString();
}

const STATUS_LABEL = {
  confirmed: { text: "Confirmed by caregiver", className: "accuracy-pill-confirmed" },
  corrected: { text: "Corrected by caregiver", className: "accuracy-pill-corrected" },
  pending: { text: "Awaiting verification", className: "accuracy-pill-pending" }
};

export default function Timeline() {
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

  const events = useMemo(() => {
    const filterId = activeChildId === "all" ? null : activeChildId;

    const behaviorEvents = behaviors
      .filter((b) => !filterId || b.childId === filterId)
      .map((b) => ({
        type: "behavior",
        timestamp: b.timestamp,
        childName: b.childName,
        childId: b.childId,
        behaviorLabel: b.behaviorLabel || "Unlabeled Pattern",
        need: b.need,
        confidence: b.confidence,
        notes: b.notes
      }));

    const predictionEvents = predictions
      .filter((p) => !filterId || p.childId === filterId)
      .map((p) => ({
        type: "prediction",
        timestamp: p.timestamp,
        childName: p.childName,
        childId: p.childId,
        predictedNeed: p.predictedNeed,
        confidenceScore: p.confidenceScore,
        status: p.status,
        correctedNeed: p.correctedNeed,
        sourceBehaviors: p.sourceBehaviors || []
      }));

    return [...behaviorEvents, ...predictionEvents].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [behaviors, predictions, activeChildId]);

  const grouped = useMemo(() => {
    const map = new Map();
    events.forEach((e) => {
      const key = dayKey(e.timestamp);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return Array.from(map.entries());
  }, [events]);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Communication Timeline</p>
          <h1>Chronological Communication Log</h1>
          <p className="sub">Every observed behavior and AI prediction, in order — the full story of how each child communicates over time.</p>
        </div>
      </div>

      <div className="page-content">
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

        {grouped.length === 0 ? (
          <div className="empty-state">
            <p className="icon">⏱</p>
            <h3>No timeline events yet.</h3>
            <p>Upload behavior samples or run Live Monitoring to start building the communication timeline.</p>
          </div>
        ) : (
          <div className="comm-timeline">
            {grouped.map(([day, dayEvents]) => (
              <div key={day} className="timeline-day-group">
                <div className="timeline-day-header">
                  <span className="tdh-line" />
                  <span className="tdh-label">{formatDate(dayEvents[0].timestamp)}</span>
                  <span className="tdh-line" />
                </div>

                <div className="timeline-events">
                  {dayEvents.map((e, i) => (
                    <div key={i} className={`timeline-event-card ${e.type}`}>
                      <div className="tec-time">{formatTime(e.timestamp)}</div>
                      <div className={`tec-dot ${e.type}`} />
                      <div className="tec-body">
                        {e.type === "behavior" ? (
                          <>
                            <p className="tec-title">
                              <span className="tec-kind">Behavior observed</span> · <strong>{e.childName}</strong>
                            </p>
                            <div className="translation-chip" style={{ marginTop: "6px" }}>
                              <span className="t-behavior">{e.behaviorLabel}</span>
                              <span className="t-path" />
                              <span className="t-speech">{e.need}</span>
                            </div>
                            {e.notes && <p className="tec-notes">{e.notes}</p>}
                          </>
                        ) : (
                          <>
                            <p className="tec-title">
                              <span className="tec-kind">AI prediction</span> · <strong>{e.childName}</strong>
                            </p>
                            <p className="tec-prediction">
                              Predicted: <strong>{e.predictedNeed}</strong>{" "}
                              <span className="tec-confidence">({e.confidenceScore}% confidence)</span>
                            </p>
                            {e.sourceBehaviors.length > 0 && (
                              <p className="tec-source">From: {e.sourceBehaviors.join(", ")}</p>
                            )}
                            <span className={`feature-pill ${STATUS_LABEL[e.status]?.className || ""}`} style={{ marginTop: "6px" }}>
                              {STATUS_LABEL[e.status]?.text || "Pending"}
                              {e.status === "corrected" && e.correctedNeed && ` → ${e.correctedNeed}`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
