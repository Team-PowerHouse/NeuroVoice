import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ChildCard from "../components/ChildCard";
import {
  fetchChildren,
  fetchBehaviors
} from "../services/api";
import "../styles/profile.css";

function getMostCommonNeed(samples) {
  if (!samples || samples.length === 0) {
    return "—";
  }

  const counts = {};

  samples.forEach((sample) => {
    counts[sample.need] = (counts[sample.need] || 0) + 1;
  });

  let topNeed = "—";
  let maxCount = 0;

  for (const need in counts) {
    if (counts[need] > maxCount) {
      maxCount = counts[need];
      topNeed = need;
    }
  }

  return topNeed;
}

export default function ChildProfiles() {
  const [children, setChildren] = useState([]);
  const [behaviors, setBehaviors] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {

  async function loadData() {

    try {

      const childrenData = await fetchChildren();
      const behaviorData = await fetchBehaviors();

      setChildren(childrenData);
      setBehaviors(behaviorData);

    } catch (err) {

      console.error("Failed to load children:", err);

    }

  }

  loadData();

}, []);

  const filtered = children.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.caregiver.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Child Profiles</p>
          <h1>Registered Children</h1>
          <p className="sub">{children.length} child{children.length !== 1 ? "ren" : ""} with active behavioral profiles.</p>
        </div>
        <div className="topbar-right">
          <Link to="/add-child" className="btn btn-primary">✚ Register New Child</Link>
        </div>
      </div>

      <div className="page-content">
        <div className="search-bar-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by child name or caregiver..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p className="icon">👶</p>
            <h3>{query ? "No children match your search." : "No children registered yet."}</h3>
            <p>
              {query
                ? "Try a different name or clear the search."
                : "Register the first child to begin building their behavioral dictionary."}
            </p>
            {!query && (
              <Link to="/add-child" className="btn btn-primary" style={{ display: "inline-flex", marginTop: "16px" }}>
                Register First Child
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-3">
            {filtered.map((child) => {
              const samples = behaviors.filter(
                (b) => String(b.childId) === String(child.id)
              );
              return (
                <ChildCard
                  key={child.id}
                  child={child}
                  sampleCount={samples.length}
                  
                  topNeed={getMostCommonNeed(samples)}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
