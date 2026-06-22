import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ChildCard from "../components/ChildCard";
import { fetchChildren } from "../services/api";
import "../styles/profile.css";

export default function ChildProfiles() {
  const [children, setChildren] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChildren() {
      try {
        const data = await fetchChildren();
        setChildren(data);
      } catch (error) {
        console.error("Failed to load children:", error);
      } finally {
        setLoading(false);
      }
    }

    loadChildren();
  }, []);

  const filtered = children.filter((c) =>
    (c.name || "").toLowerCase().includes(query.toLowerCase()) ||
    (c.caregiver || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Child Profiles</p>
          <h1>Registered Children</h1>
          <p className="sub">
            {children.length} child
            {children.length !== 1 ? "ren" : ""} with active behavioral
            profiles.
          </p>
        </div>

        <div className="topbar-right">
          <Link to="/add-child" className="btn btn-primary">
            ✚ Register New Child
          </Link>
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

        {loading ? (
          <div className="empty-state">
            <h3>Loading children...</h3>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="icon">👶</p>

            <h3>
              {query
                ? "No children match your search."
                : "No children registered yet."}
            </h3>

            <p>
              {query
                ? "Try a different name or clear the search."
                : "Register the first child to begin building their behavioral dictionary."}
            </p>

            {!query && (
              <Link
                to="/add-child"
                className="btn btn-primary"
                style={{
                  display: "inline-flex",
                  marginTop: "16px"
                }}
              >
                Register First Child
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-3">
            {filtered.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                sampleCount={0}
                topNeed="Not Available"
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}