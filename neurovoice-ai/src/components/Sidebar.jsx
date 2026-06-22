import { NavLink } from "react-router-dom";
import { useDemoMode } from "../context/DemoModeContext.jsx";
import "../styles/sidebar.css";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "▦" },
  { to: "/add-child", label: "Add Child", icon: "✚" },
  { to: "/children", label: "Child Profiles", icon: "◉" },
  { to: "/upload", label: "Upload Behavior", icon: "⇧" },
  { to: "/timeline", label: "Communication Timeline", icon: "⏱" },
  { to: "/history", label: "Behavior History", icon: "≣" },
  { to: "/dictionary", label: "Behavior Dictionary", icon: "❝" },
  { to: "/analytics", label: "Analytics Dashboard", icon: "📊" },
  { to: "/monitoring", label: "Live Monitoring", icon: "◎" },
  { to: "/settings", label: "Settings", icon: "⚙" }
];

export default function Sidebar() {
  const { active, tickCount } = useDemoMode();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">NV</div>
        <div className="brand-text">
          <span className="brand-name">NeuroVoice AI</span>
          <span className="brand-tag">Behavioral Speech Translator</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-card">
          <p className="footer-title">
            {active ? <><span className="demo-pulse-dot" /> Demo Mode Active</> : "Translator Status"}
          </p>
          <p className="footer-sub">
            {active ? `${tickCount} auto-events generated` : "Learning from caregiver input"}
          </p>
        </div>
      </div>
    </aside>
  );
}
