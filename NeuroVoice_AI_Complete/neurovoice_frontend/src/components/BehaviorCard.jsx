import { scoreToConfidenceClass, confidenceToScore } from "../utils/storage";

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function BehaviorCard({ behavior }) {
  const confidenceClass = scoreToConfidenceClass(confidenceToScore(behavior.confidence));

  return (
    <div className="card hoverable behavior-card">
      <div className="behavior-card-head">
        <div>
          <p className="behavior-child">{behavior.childName}</p>
          <p className="behavior-label">{behavior.behaviorLabel || "Unlabeled Pattern"}</p>
        </div>
        <span className={`confidence-badge ${confidenceClass}`}>{behavior.confidence}</span>
      </div>

      <div className="translation-chip behavior-translation">
        <span className="t-behavior">{behavior.behaviorLabel || "Behavior"}</span>
        <span className="t-path" />
        <span className="t-speech">{behavior.need}</span>
      </div>

      {behavior.notes && <p className="behavior-notes">{behavior.notes}</p>}

      <div className="behavior-card-footer">
        <span className="behavior-video">🎥 {behavior.videoName || "No video attached"}</span>
        <span className="behavior-time">{formatTime(behavior.timestamp)}</span>
      </div>
    </div>
  );
}
