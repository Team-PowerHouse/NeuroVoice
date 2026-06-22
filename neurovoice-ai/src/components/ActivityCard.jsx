function timeAgo(ts) {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ActivityCard({ behavior }) {
  return (
    <div className="activity-row">
      <div className="activity-dot" />
      <div className="activity-body">
        <p className="activity-text">
          <strong>{behavior.childName}</strong> showed <strong>{behavior.behaviorLabel || "a behavior pattern"}</strong>
        </p>
        <div className="translation-chip activity-chip">
          <span className="t-behavior">{behavior.behaviorLabel || "Behavior"}</span>
          <span className="t-path" />
          <span className="t-speech">{behavior.need}</span>
        </div>
      </div>
      <span className="activity-time">{timeAgo(behavior.timestamp)}</span>
    </div>
  );
}
