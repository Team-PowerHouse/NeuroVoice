export default function StatCard({ label, value, sub, accent = "blue" }) {
  return (
    <div className="card hoverable stat-card">
      <div className={`stat-icon-bar accent-${accent}`} />
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  );
}
