import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getShareLinkByToken, buildCommunicationPassport, scoreToConfidenceClass } from "../utils/storage";
import { exportPassportToPDF } from "../utils/pdfExport";
import "../styles/passport.css";
import "../styles/shareview.css";

export default function HospitalShareView() {
  const { token } = useParams();
  const [link, setLink] = useState(undefined);
  const [passport, setPassport] = useState(null);

  useEffect(() => {
    const l = getShareLinkByToken(token);
    setLink(l || null);
    if (l) {
      setPassport(buildCommunicationPassport(l.childId));
    }
  }, [token]);

  if (link === undefined) return null;

  if (!link || !link.active || !passport) {
    return (
      <div className="share-view-shell">
        <div className="share-view-invalid">
          <p className="icon">🔒</p>
          <h2>{!link ? "Link not found" : !link.active ? "This link has been revoked" : "Profile unavailable"}</h2>
          <p>This Communication Passport link is no longer valid. Please contact the child's caregiver for an updated link.</p>
        </div>
      </div>
    );
  }

  const { child } = passport;

  return (
    <div className="share-view-shell">
      <div className="share-view-topbar">
        <div className="feature-pill" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
          🔒 Read-only · Shared with {link.recipient}
        </div>
        <button onClick={() => exportPassportToPDF(passport)} className="btn btn-secondary" style={{ background: "#fff" }}>
          ⬇ Export PDF
        </button>
      </div>

      <div className="page-content" style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div className="passport-sheet">

          <div className="passport-header-card">
            <div>
              <p className="passport-eyebrow">NeuroVoice AI · Communication Passport</p>
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

          <div className="passport-card emergency">
            <p className="passport-card-title">⚠ Emergency Notes</p>
            <p className="passport-text">{passport.emergencyNotes || "No emergency notes added yet."}</p>
          </div>

          <div className="grid grid-2">
            <div className="passport-card alert">
              <p className="passport-card-title">Medical Alerts</p>
              <p className="passport-text">{passport.medicalAlerts || "No medical alerts recorded."}</p>
            </div>
            <div className="passport-card comfort">
              <p className="passport-card-title">Comfort Items & Preferences</p>
              <p className="passport-text">{passport.comfortItems || "No comfort items recorded."}</p>
            </div>
          </div>

          <div className="passport-card">
            <p className="passport-card-title">Known Triggers</p>
            <div className="trigger-chip-row">
              {[...(passport.customTriggers || []), ...passport.triggersByNeed.flatMap((t) => t.triggers)].length === 0 ? (
                <p style={{ color: "var(--slate-500)", fontSize: "13px" }}>No known triggers recorded yet.</p>
              ) : (
                <>
                  {(passport.customTriggers || []).map((t, i) => (
                    <span key={`c-${i}`} className="trigger-chip custom">{t}</span>
                  ))}
                  {passport.triggersByNeed.flatMap((t) => t.triggers).map((t, i) => (
                    <span key={`l-${i}`} className="trigger-chip">{t}</span>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="grid grid-2">
            <div className="passport-card response">
              <p className="passport-card-title">✓ Recommended Responses</p>
              {passport.recommendedResponses.map(({ need, response }) => (
                <div key={need} className="passport-resp-row">
                  <p className="prr-need">{need}</p>
                  <p className="prr-text">{response}</p>
                </div>
              ))}
            </div>
            <div className="passport-card avoid">
              <p className="passport-card-title">✕ What To Avoid</p>
              {passport.whatToAvoid.map(({ need, avoid }) => (
                <div key={need} className="passport-resp-row">
                  <p className="prr-need">{need}</p>
                  <p className="prr-text">{avoid}</p>
                </div>
              ))}
            </div>
          </div>

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

          <p className="share-view-footer">
            This is a secure, read-only Communication Passport generated by NeuroVoice AI. Information is provided by the child's caregiver and should be used alongside, not in place of, clinical judgment.
          </p>

        </div>
      </div>
    </div>
  );
}
