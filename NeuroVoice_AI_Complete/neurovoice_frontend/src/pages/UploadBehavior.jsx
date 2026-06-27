import { useEffect, useRef, useState } from "react";
import { getChildren, addBehavior, NEED_CATEGORIES, CONFIDENCE_LEVELS } from "../utils/storage";
import "../styles/forms.css";

const CONFIDENCE_DESC = {
  Certain: "Caregiver is 100% sure",
  Likely: "Probably correct, needs more samples",
  Unsure: "Possible — needs verification"
};

const INITIAL = {
  childId: "",
  behaviorLabel: "",
  need: "",
  confidence: "",
  notes: "",
  videoName: ""
};

export default function UploadBehavior() {
  const [children, setChildren] = useState([]);
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef();

  useEffect(() => { setChildren(getChildren()); }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function handleConfidence(level) {
    setForm((prev) => ({ ...prev, confidence: level }));
    if (errors.confidence) setErrors((prev) => ({ ...prev, confidence: undefined }));
  }

  function handleFile(file) {
    if (!file) return;
    setForm((prev) => ({ ...prev, videoName: file.name }));
  }

  function handleFileInput(e) { handleFile(e.target.files[0]); }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function validate() {
    const errs = {};
    if (!form.childId) errs.childId = "Select a child.";
    if (!form.behaviorLabel.trim()) errs.behaviorLabel = "Describe the observed behavior.";
    if (!form.need) errs.need = "Select the detected need.";
    if (!form.confidence) errs.confidence = "Select a confidence level.";
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const child = children.find((c) => c.id === form.childId);
    addBehavior({ ...form, childName: child?.name || "Unknown" });
    setSaved(true);
    setForm(INITIAL);
    setErrors({});
    setTimeout(() => setSaved(false), 2000);
  }

  const selectedChild = children.find((c) => c.id === form.childId);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Behavior Training</p>
          <h1>Upload Behavior Sample</h1>
          <p className="sub">Teach NeuroVoice AI a new behavior-to-need mapping for a child.</p>
        </div>
      </div>

      <div className="page-content form-page">
        <div className="card form-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">

              {/* Child selector */}
              <div className="field">
                <label htmlFor="childId">Child <span className="required">*</span></label>
                {children.length === 0 ? (
                  <p style={{ fontSize: "13.5px", color: "var(--slate-500)" }}>
                    No children registered yet.{" "}
                    <a href="/add-child" style={{ color: "var(--clinical-blue)", fontWeight: "700" }}>Register one first →</a>
                  </p>
                ) : (
                  <>
                    <select id="childId" name="childId" value={form.childId} onChange={handleChange} className={errors.childId ? "error" : ""}>
                      <option value="">Select child...</option>
                      {children.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} · {c.age} yrs</option>
                      ))}
                    </select>
                    {errors.childId && <span className="error-msg">{errors.childId}</span>}
                  </>
                )}
              </div>

              {selectedChild && (
                <div style={{ background: "var(--sky-tint)", borderRadius: "var(--radius-sm)", padding: "12px 14px", fontSize: "13px", color: "var(--slate-700)" }}>
                  <strong>Caregiver:</strong> {selectedChild.caregiver} · <strong>Support Level:</strong> {selectedChild.supportLevel}
                </div>
              )}

              {/* Behavior label */}
              <div className="field">
                <label htmlFor="behaviorLabel">Behavior Observed <span className="required">*</span></label>
                <input
                  id="behaviorLabel"
                  name="behaviorLabel"
                  type="text"
                  placeholder="e.g. Door Approach, Ear Covering, Bottle Fixation"
                  value={form.behaviorLabel}
                  onChange={handleChange}
                  className={errors.behaviorLabel ? "error" : ""}
                />
                {errors.behaviorLabel && <span className="error-msg">{errors.behaviorLabel}</span>}
              </div>

              {/* Need category */}
              <div className="field">
                <label htmlFor="need">Detected Need <span className="required">*</span></label>
                <select id="need" name="need" value={form.need} onChange={handleChange} className={errors.need ? "error" : ""}>
                  <option value="">What is this behavior communicating?</option>
                  {NEED_CATEGORIES.map((n) => <option key={n}>{n}</option>)}
                </select>
                {errors.need && <span className="error-msg">{errors.need}</span>}
              </div>

              {/* Live translation preview */}
              {form.behaviorLabel && form.need && (
                <div className="translation-chip" style={{ padding: "14px" }}>
                  <span className="t-behavior">{form.behaviorLabel}</span>
                  <span className="t-path" />
                  <span className="t-speech">{form.need}</span>
                </div>
              )}

              {/* Confidence */}
              <div className="field">
                <label>Confidence Level <span className="required">*</span></label>
                <div className="confidence-selector">
                  {CONFIDENCE_LEVELS.map((level) => (
                    <div
                      key={level}
                      onClick={() => handleConfidence(level)}
                      className={`confidence-option ${form.confidence === level ? `selected-${level.toLowerCase()}` : ""}`}
                    >
                      <span className="conf-label">{level}</span>
                      <span className="conf-desc">{CONFIDENCE_DESC[level]}</span>
                    </div>
                  ))}
                </div>
                {errors.confidence && <span className="error-msg">{errors.confidence}</span>}
              </div>

              {/* Video upload */}
              <div className="field">
                <label>Behavior Video (Optional)</label>
                <div
                  className={`upload-zone ${dragOver ? "drag-over" : ""} ${form.videoName ? "has-file" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <input ref={fileRef} type="file" accept="video/*" hidden onChange={handleFileInput} />
                  <p className="upload-icon">🎥</p>
                  {form.videoName ? (
                    <p className="upload-label">✓ {form.videoName}</p>
                  ) : (
                    <>
                      <p className="upload-label">Drop video file here or click to browse</p>
                      <p className="upload-hint">MP4, MOV, AVI — up to 200MB</p>
                    </>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="field">
                <label htmlFor="notes">Caregiver Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  placeholder="Describe what the child was doing, the environment, any triggers, and how the caregiver responded..."
                  value={form.notes}
                  onChange={handleChange}
                />
              </div>

              <div className="form-divider" />

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Behavior Sample
                </button>
                <button type="button" onClick={() => { setForm(INITIAL); setErrors({}); }} className="btn btn-secondary">
                  Clear
                </button>
              </div>

            </div>
          </form>
        </div>
      </div>

      {saved && <div className="success-toast">✓ Behavior sample saved to dictionary</div>}
    </>
  );
}
