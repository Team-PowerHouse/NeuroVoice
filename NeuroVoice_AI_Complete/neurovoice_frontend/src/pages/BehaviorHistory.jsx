import { useEffect, useState } from "react";
import BehaviorCard from "../components/BehaviorCard";
import {
  fetchBehaviors,
  fetchChildren
} from "../services/api";
import "../styles/history.css";

const NEED_CATEGORIES = [
  "Hungry",
  "Thirsty",
  "Toilet",
  "Pain",
  "Tired",
  "Sensory Overload",
  "Attention",
  "Play",
  "Help",
  "Comfort",
  "Wants to Leave",
  "Unknown"
];

export default function BehaviorHistory() {
  const [behaviors, setBehaviors] = useState([]);
  const [children, setChildren] = useState([]);
  const [query, setQuery] = useState("");
  const [filterNeed, setFilterNeed] = useState("all");
  const [filterChild, setFilterChild] = useState("all");

  useEffect(() => {

  async function loadData() {

    try {

      const behaviorData = await fetchBehaviors();
      const childrenData = await fetchChildren();

      setBehaviors(behaviorData);
      setChildren(childrenData);

    } catch (err) {

      console.error("Failed to load behavior history:", err);

    }

  }

  loadData();

}, []);

  const filtered = behaviors.filter((b) => {
    const matchesQuery =
      b.childName.toLowerCase().includes(query.toLowerCase()) ||
      (b.behaviorLabel || "").toLowerCase().includes(query.toLowerCase()) ||
      (b.notes || "").toLowerCase().includes(query.toLowerCase());
    const matchesNeed = filterNeed === "all" || b.need === filterNeed;
    const matchesChild = filterChild === "all" || b.childId === filterChild;
    return matchesQuery && matchesNeed && matchesChild;
  });

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Behavior Log</p>
          <h1>Behavior History</h1>
          <p className="sub">Full record of all labeled behavior samples across all children.</p>
        </div>
      </div>

      <div className="page-content">
        <div className="history-toolbar">
          <div className="search-bar-wrapper" style={{ flex: 1, maxWidth: "400px", marginBottom: 0 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search behavior, child, or notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="filter-select-wrapper">
            <select value={filterChild} onChange={(e) => setFilterChild(e.target.value)}>
              <option value="all">All Children</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <select value={filterNeed} onChange={(e) => setFilterNeed(e.target.value)}>
              <option value="all">All Needs</option>
              {NEED_CATEGORIES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <span className="history-count">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p className="icon">📋</p>
            <h3>{behaviors.length === 0 ? "No behavior samples uploaded yet." : "No records match your filters."}</h3>
            <p>{behaviors.length === 0
              ? "Upload behavior videos to start building each child's dictionary."
              : "Try adjusting the search or filters above."}
            </p>
          </div>
        ) : (
          <div className="grid grid-2">
            {filtered.map((b) => (
              <BehaviorCard key={b.id} behavior={b} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
