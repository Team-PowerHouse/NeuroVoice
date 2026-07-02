import { Link } from "react-router-dom";

const AVATAR_PALETTE = ["#2e6ff2", "#0fae9c", "#f59e0b", "#f4654a", "#7c5cf2"];

function colorFor(id) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

export default function ChildCard({ child, sampleCount = 0, topNeed }) {
  const initials = child.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link to={`/children/${child.id}`} className="card hoverable child-card">
      <div className="child-card-top">
        <div className="child-avatar" style={{ background: colorFor(child.id) }}>
          {initials}
        </div>
        <div>
          <p className="child-name">{child.name}</p>
          <p className="child-meta">
            {child.age} yrs · {child.gender}
          </p>
        </div>
      </div>

      <p className="child-support">{child.supportLevel}</p>

      <div className="child-card-footer">
        <span className="child-stat">
          <strong>{sampleCount}</strong> samples
        </span>
        {topNeed && <span className="child-need-pill">{topNeed}</span>}
      </div>
    </Link>
  );
}
