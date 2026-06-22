import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createChild } from "../services/api";
import "../styles/forms.css";

const SUPPORT_LEVELS = [
  "Level 1",
  "Level 2",
  "Level 3"
];

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
  const [loading, setLoading] = useState(false);

  function validate() {
    const errs = {};

    if (!form.name.trim()) {
      errs.name = "Child name is required";
    }

    if (
      !form.age ||
      isNaN(form.age) ||
      Number(form.age) < 1 ||
      Number(form.age) > 18
    ) {
      errs.age = "Enter a valid age between 1 and 18";
    }

    if (!form.gender) {
      errs.gender = "Please select gender";
    }

    if (!form.supportLevel) {
      errs.supportLevel = "Please select support level";
    }

    if (!form.caregiver.trim()) {
      errs.caregiver = "Caregiver name is required";
    }

    return errs;
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined
      }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);

      await createChild({
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        supportLevel: form.supportLevel,
        caregiver: form.caregiver
      });

      setSaved(true);

      setTimeout(() => {
        navigate("/children");
      }, 1200);
    } catch (error) {
      console.error("Create Child Error:", error);

      if (error.response) {
        console.log(error.response.data);
      }

      alert("Failed to save child profile.");
    } finally {
      setLoading(false);
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
          <p className="sub">
            Register a new child and begin building their behavioral dictionary.
          </p>
        </div>
      </div>

      <div className="page-content form-page">
        <div className="card form-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">

              <div className="field">
                <label>Full Name</label>

                <input
                  name="name"
                  type="text"
                  placeholder="Ram Iyer"
                  value={form.name}
                  onChange={handleChange}
                />

                {errors.name && (
                  <span className="error-msg">
                    {errors.name}
                  </span>
                )}
              </div>

              <div className="form-row-2">

                <div className="field">
                  <label>Age</label>

                  <input
                    name="age"
                    type="number"
                    min="1"
                    max="18"
                    value={form.age}
                    onChange={handleChange}
                  />

                  {errors.age && (
                    <span className="error-msg">
                      {errors.age}
                    </span>
                  )}
                </div>

                <div className="field">
                  <label>Gender</label>

                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-binary</option>
                  </select>

                  {errors.gender && (
                    <span className="error-msg">
                      {errors.gender}
                    </span>
                  )}
                </div>

              </div>

              <div className="field">
                <label>Autism Support Level</label>

                <select
                  name="supportLevel"
                  value={form.supportLevel}
                  onChange={handleChange}
                >
                  <option value="">Select Support Level</option>

                  {SUPPORT_LEVELS.map((level) => (
                    <option key={level}>
                      {level}
                    </option>
                  ))}
                </select>

                {errors.supportLevel && (
                  <span className="error-msg">
                    {errors.supportLevel}
                  </span>
                )}
              </div>

              <div className="field">
                <label>Primary Caregiver</label>

                <input
                  name="caregiver"
                  type="text"
                  placeholder="Priya Iyer"
                  value={form.caregiver}
                  onChange={handleChange}
                />

                {errors.caregiver && (
                  <span className="error-msg">
                    {errors.caregiver}
                  </span>
                )}
              </div>

              <div className="form-divider" />

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Child Profile"}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-secondary"
                >
                  Clear Form
                </button>
              </div>

            </div>
          </form>
        </div>
      </div>

      {saved && (
        <div className="success-toast">
          ✓ Child profile saved successfully
        </div>
      )}
    </>
  );
}