import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createChild } from "../services/api";

const SUPPORT_LEVELS = [
  "Level 1 — Requiring Support",
  "Level 2 — Requiring Substantial Support",
  "Level 3 — Requiring Very Substantial Support",
];
import "../styles/forms.css";

const INITIAL_FORM = {
  name: "",
  age: "",
  gender: "",
  supportLevel: "",
  caregiver: ""
};

export default function AddChild() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Child's name is required.";
    if (!form.age || isNaN(form.age) || Number(form.age) < 1 || Number(form.age) > 18)
      errs.age = "Enter a valid age between 1 and 18.";
    if (!form.gender) errs.gender = "Please select a gender.";
    if (!form.supportLevel) errs.supportLevel = "Please select a support level.";
    if (!form.caregiver.trim()) errs.caregiver = "Caregiver name is required.";
    return errs;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
  e.preventDefault();

  const errs = validate();

  if (Object.keys(errs).length > 0) {
    setErrors(errs);
    return;
  }

  try {
    await createChild({
      ...form,
      age: Number(form.age),
    });

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
      navigate("/children");
    }, 1400);
  } catch (err) {
    console.error(err);
    alert("Failed to save child profile.");
  }
}

  function handleReset() {
    setForm(INITIAL_FORM);
    setErrors({});
  }

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Registration</p>
          <h1>Add Child Profile</h1>
          <p className="sub">Register a new child and begin building their behavioral dictionary.</p>
        </div>
      </div>

      <div className="page-content form-page">
        <div className="card form-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">

              <div className="field">
                <label htmlFor="name">Full Name <span className="required">*</span></label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g. Ram Iyer"
                  value={form.name}
                  onChange={handleChange}
                  className={errors.name ? "error" : ""}
                />
                {errors.name && <span className="error-msg">{errors.name}</span>}
              </div>

              <div className="form-row-2">
                <div className="field">
                  <label htmlFor="age">Age <span className="required">*</span></label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    min="1"
                    max="18"
                    placeholder="e.g. 7"
                    value={form.age}
                    onChange={handleChange}
                    className={errors.age ? "error" : ""}
                  />
                  {errors.age && <span className="error-msg">{errors.age}</span>}
                </div>

                <div className="field">
                  <label htmlFor="gender">Gender <span className="required">*</span></label>
                  <select
                    id="gender"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className={errors.gender ? "error" : ""}
                  >
                    <option value="">Select gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-binary</option>
                    <option>Prefer not to say</option>
                  </select>
                  {errors.gender && <span className="error-msg">{errors.gender}</span>}
                </div>
              </div>

              <div className="field">
                <label htmlFor="supportLevel">Autism Support Level <span className="required">*</span></label>
                <select
                  id="supportLevel"
                  name="supportLevel"
                  value={form.supportLevel}
                  onChange={handleChange}
                  className={errors.supportLevel ? "error" : ""}
                >
                  <option value="">Select support level</option>
                  {SUPPORT_LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                {errors.supportLevel && <span className="error-msg">{errors.supportLevel}</span>}
              </div>

              <div className="field">
                <label htmlFor="caregiver">Primary Caregiver <span className="required">*</span></label>
                <input
                  id="caregiver"
                  name="caregiver"
                  type="text"
                  placeholder="e.g. Priya Iyer (Mother)"
                  value={form.caregiver}
                  onChange={handleChange}
                  className={errors.caregiver ? "error" : ""}
                />
                {errors.caregiver && <span className="error-msg">{errors.caregiver}</span>}
              </div>

              <div className="form-divider" />

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Child Profile
                </button>
                <button type="button" onClick={handleReset} className="btn btn-secondary">
                  Clear Form
                </button>
              </div>

            </div>
          </form>
        </div>

        {/* Preview */}
        {form.name && (
          <div className="card" style={{ marginTop: "20px" }}>
            <p className="section-title" style={{ fontSize: "13px", color: "var(--slate-500)" }}>
              Profile Preview
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                ["Name", form.name],
                ["Age", form.age ? `${form.age} years` : "—"],
                ["Gender", form.gender || "—"],
                ["Support Level", form.supportLevel || "—"],
                ["Caregiver", form.caregiver || "—"]
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: "12px", fontSize: "13.5px" }}>
                  <span style={{ color: "var(--slate-500)", width: "110px", flexShrink: 0 }}>{k}</span>
                  <span style={{ fontWeight: "700", color: "var(--slate-800)" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {saved && (
        <div className="success-toast">✓ Child profile saved — redirecting to profiles...</div>
      )}
    </>
  );
}
