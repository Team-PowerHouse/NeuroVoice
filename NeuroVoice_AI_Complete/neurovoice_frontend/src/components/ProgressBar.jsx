export default function ProgressBar({ value = 0, label, sub }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-block">
      {label && (
        <div className="progress-label-row">
          <span>{label}</span>
          <span className="progress-value">{clamped}%</span>
        </div>
      )}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
      {sub && <p className="progress-sub">{sub}</p>}
    </div>
  );
}
