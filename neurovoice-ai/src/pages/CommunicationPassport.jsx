import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getChildById,
  buildCommunicationPassport,
  savePassportData,
  createShareLink,
  getShareLinksByChild,
  revokeShareLink,
  scoreToConfidenceClass
} from "../utils/storage";
import { exportPassportToPDF } from "../utils/pdfExport";
import "../styles/passport.css";

export default function CommunicationPassport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [passport, setPassport] = useState(null);
  const [shareLinks, setShareLinks] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ emergencyNotes: "", medicalAlerts: "", comfortItems: "" });
  const [newTrigger, setNewTrigger] = useState("");
  const [customTriggers, setCustomTriggers] = useState([]);
  const [shareRecipient, setShareRecipient] = useState("");
  const [saved, setSaved] = useState(false);
  const [linkCreated, setLinkCreated] = useState(null);

  function load() {
    const c = getChildById(id);
    if (!c) { navigate("/children"); return; }
    setChild(c);
    const p = buildCommunicationPassport(id);
    setPassport(p);
    setForm({
      emergencyNotes: p.emergencyNotes || "",
      medicalAlerts: p.medicalAlerts || "",
      comfortItems: p.comfortItems || ""
    });
    setCustomTriggers(p.customTriggers || []);
    setShareLinks(getShareLinksByChild(id));
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  function handleSave() {
    savePassportData(id, { ...form, customTriggers });
    setEditing(false);
    setSaved(true);
    load();
    setTimeout(() => setSaved(false), 1800);
  }

  function addTrigger() {
    if (!newTrigger.trim()) return;
    setCustomTriggers((prev) => [...prev, newTrigger.trim()]);
    setNewTrigger("");
  }

  function removeTrigger(idx) {
    setCustomTriggers((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleCreateShareLink() {
    const link = createShareLink(id, shareRecipient.trim() || "Hospital Staff");
    setShareLinks(getShareLinksByChild(id));
    setLinkCreated(link);
    setShareRecipient("");
  }

  function handleRevoke(token) {
    revokeShareLink(token);
    setShareLinks(getShareLinksByChild(id));
  }

  if (!child || !passport) return null;

  const shareUrl = (token) => `${window.location.origin}/share/${token}`;

  return (
    <>
      <div className="topbar">
        <div>
          <Link to={`/children/${id}`} className="back-link">← {child.name}'s Profile</Link>
          <h1>Communication Passport</h1>
          <p className="sub">A portable, transferable summary any caregiver, nurse, or teacher can read in under a minute.</p>
        </div>
        <div className="topbar-right">
          <button onClick={() => exportPassportToPDF(passport)} className="btn btn-secondary">⬇ Export PDF</button>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn btn-primary">✎ Edit Passport</button>
          ) : (
            <button onClick={handleSave} className="btn btn-primary">✓ Save Passport</button>
          )}
        </div>
      </div>

      <div className="page-content">
        <div className="passport-sheet">

          {/* Header card */}
          <div className="passport-header-card">
            <div>
              <p className="passport-eyebrow">NeuroVoice AI · Communication Passport 2.0</p>
              <h2>{child.name}</h2>
              <p className="passport-meta">{child.age} years old · {child.gender} · {child.supportLevel}</p>
              <p className="passport-meta">Caregiver: <strong>{child.caregiver}</strong></p>
            </div>
            {passport.accuracy !== null && (
              <div className="passport-accuracy-badge">
                <span className="paa-value">{passport.accuracy}%</span>
                <span className="paa-label">AI prediction accuracy</span>
              </div>
            )}
          </div>

          {/* Emergency Notes */}
          <div className="passport-card emergency">
            <p className="passport-card-title">⚠ Emergency Notes</p>
            {editing ? (
              <textarea
                value={form.emergencyNotes}
                onChange={(e) => setForm((f) => ({ ...f, emergencyNotes: e.target.value }))}
                placeholder="Critical information any first responder or unfamiliar caregiver needs immediately..."
                rows={4}
              />
            ) : (
              <p className="passport-text">{passport.emergencyNotes || "No emergency notes added yet."}</p>
            )}
          </div>

          <div className="grid grid-2">
            {/* Medical Alerts */}
            <div className="passport-card alert">
              <p className="passport-card-title">Medical Alerts</p>
              {editing ? (
                <textarea
                  value={form.medicalAlerts}
                  onChange={(e) => setForm((f) => ({ ...f, medicalAlerts: e.target.value }))}
                  placeholder="Allergies, sensitivities, medications..."
                  rows={3}
                />
              ) : (
                <p className="passport-text">{passport.medicalAlerts || "No medical alerts recorded."}</p>
              )}
            </div>

            {/* Comfort Items */}
            <div className="passport-card comfort">
              <p className="passport-card-title">Comfort Items & Preferences</p>
              {editing ? (
                <textarea
                  value={form.comfortItems}
                  onChange={(e) => setForm((f) => ({ ...f, comfortItems: e.target.value }))}
                  placeholder="Favorite objects, sensory preferences..."
                  rows={3}
                />
              ) : (
                <p className="passport-text">{passport.comfortItems || "No comfort items recorded."}</p>
              )}
            </div>
          </div>

          {/* Known Triggers */}
          <div className="passport-card">
            <p className="passport-card-title">Known Triggers</p>

            {editing && (
              <div className="trigger-input-row">
                <input
                  type="text"
                  placeholder="Add a custom trigger..."
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTrigger())}
                />
                <button type="button" onClick={addTrigger} className="btn btn-secondary">Add</button>
              </div>
            )}

            <div className="trigger-chip-row">
              {customTriggers.length === 0 && passport.triggersByNeed.every((t) => t.triggers.length === 0) ? (
                <p style={{ color: "var(--slate-500)", fontSize: "13px" }}>No known triggers recorded yet.</p>
              ) : (
                <>
                  {customTriggers.map((t, i) => (
                    <span key={`custom-${i}`} className="trigger-chip custom">
                      {t}
                      {editing && (
                        <button onClick={() => removeTrigger(i)} aria-label="Remove trigger">✕</button>
                      )}
                    </span>
                  ))}
                  {passport.triggersByNeed.flatMap((t) => t.triggers).map((t, i) => (
                    <span key={`lib-${i}`} className="trigger-chip">{t}</span>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Recommended Responses + What to Avoid */}
          <div className="grid grid-2">
            <div className="passport-card response">
              <p className="passport-card-title">✓ Recommended Responses</p>
              {passport.recommendedResponses.length === 0 ? (
                <p style={{ color: "var(--slate-500)", fontSize: "13px" }}>No data yet.</p>
              ) : (
                passport.recommendedResponses.map(({ need, response }) => (
                  <div key={need} className="passport-resp-row">
                    <p className="prr-need">{need}</p>
                    <p className="prr-text">{response}</p>
                  </div>
                ))
              )}
            </div>

            <div className="passport-card avoid">
              <p className="passport-card-title">✕ What To Avoid</p>
              {passport.whatToAvoid.length === 0 ? (
                <p style={{ color: "var(--slate-500)", fontSize: "13px" }}>No data yet.</p>
              ) : (
                passport.whatToAvoid.map(({ need, avoid }) => (
                  <div key={need} className="passport-resp-row">
                    <p className="prr-need">{need}</p>
                    <p className="prr-text">{avoid}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Behavioral Dictionary mini-table */}
          <div className="passport-card">
            <p className="passport-card-title">Behavioral Dictionary Summary</p>
            {passport.dictionary.length === 0 ? (
              <p style={{ color: "var(--slate-500)", fontSize: "13px" }}>No behavior patterns recorded yet.</p>
            ) : (
              <div className="passport-dict-table">
                {passport.dictionary.slice(0, 8).map((entry) => (
                  <div key={`${entry.behaviorLabel}-${entry.need}`} className="pdt-row">
                    <span className="pdt-behavior">{entry.behaviorLabel}</span>
                    <span className="pdt-arrow">→</span>
                    <span className="pdt-need">{entry.need}</span>
                    <span className={`confidence-badge ${scoreToConfidenceClass(entry.avgConfidenceScore)}`}>
                      {entry.avgConfidenceScore}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hospital Sharing */}
          <div className="passport-card share">
            <p className="passport-card-title">🔗 Hospital Profile Sharing</p>
            <p className="passport-text" style={{ marginBottom: "14px" }}>
              Generate a secure, read-only link to this passport for hospital staff, teachers, or emergency responders.
            </p>

            <div className="trigger-input-row">
              <input
                type="text"
                placeholder="Recipient (e.g. Apollo Hospital — Pediatric Ward)"
                value={shareRecipient}
                onChange={(e) => setShareRecipient(e.target.value)}
              />
              <button type="button" onClick={handleCreateShareLink} className="btn btn-primary">Generate Link</button>
            </div>

            {linkCreated && (
              <div className="share-link-created">
                <p>✓ Link created for <strong>{linkCreated.recipient}</strong></p>
                <code>{shareUrl(linkCreated.token)}</code>
              </div>
            )}

            {shareLinks.length > 0 && (
              <div className="share-link-list">
                {shareLinks.map((link) => (
                  <div key={link.token} className={`share-link-row ${!link.active ? "revoked" : ""}`}>
                    <div>
                      <p className="slr-recipient">{link.recipient}</p>
                      <p className="slr-meta">
                        Created {new Date(link.createdAt).toLocaleDateString()} ·{" "}
                        {link.active ? <span style={{ color: "var(--signal-teal)" }}>Active</span> : <span style={{ color: "var(--alert-coral)" }}>Revoked</span>}
                      </p>
                    </div>
                    {link.active && (
                      <button onClick={() => handleRevoke(link.token)} className="btn btn-secondary" style={{ fontSize: "12px", padding: "6px 12px" }}>
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {saved && <div className="success-toast">✓ Communication Passport updated</div>}
    </>
  );
}
