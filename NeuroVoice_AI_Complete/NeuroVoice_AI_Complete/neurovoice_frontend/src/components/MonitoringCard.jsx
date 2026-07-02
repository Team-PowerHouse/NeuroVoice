export default function MonitoringCard({ label, detected }) {
  return (
    <div className={"monitoring-detection-row" + (detected ? " detected" : "")}>
      <span className="detection-check">{detected ? "✓" : "○"}</span>
      <span className="detection-label">{label}</span>
    </div>
  );
}
