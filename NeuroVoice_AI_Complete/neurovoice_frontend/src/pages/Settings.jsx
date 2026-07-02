import { useState, useEffect } from "react";
import { getChildren, exportChildProfile } from "../utils/storage";
import "../styles/settings.css";

const DEFAULTS = {
  notifications: true,
  soundAlerts: true,
  highContrastMode: false,
  emergencyAccess: false,
  autoSpeak: false,
  sharingEnabled: false
};

export default function Settings() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("neurovoice_settings");
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });
  const [children, setChildren] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setChildren(getChildren());
  }, []);

  function toggle(key) {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("neurovoice_settings", JSON.stringify(next));
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  function handleExportAll() {
    const allProfiles = children.map((c) => exportChildProfile(c.id));
    const blob = new Blob([JSON.stringify({ profiles: allProfiles, exportedAt: new Date().toISOString() }, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "neurovoice_all_profiles.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClearAllData() {
    if (window.confirm("This will permanently delete all children, behavior samples, and settings. Are you sure?")) {
      localStorage.clear();
      window.location.reload();
    }
  }

  const Toggle = ({ settingKey }) => (
    <label className="toggle-switch">
      <input type="checkbox" checked={settings[settingKey]} onChange={() => toggle(settingKey)} />
      <span className="toggle-slider" />
    </label>
  );

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Settings</h1>
          <p className="sub">Customize NeuroVoice AI for your hospital environment and care team.</p>
        </div>
      </div>

      <div className="page-content settings-page">

        {/* Notifications */}
        <div className="settings-section">
          <p className="settings-section-title">Notifications</p>
          <div className="card">
            <div className="settings-row">
              <div className="settings-row-info">
                <h4>Behavior Alerts</h4>
                <p>Notify staff when a new behavior signal is detected during live monitoring.</p>
              </div>
              <Toggle settingKey="notifications" />
            </div>
            <div className="settings-row">
              <div className="settings-row-info">
                <h4>Sound Alerts</h4>
                <p>Play an audio chime when a behavior is detected with Certain confidence.</p>
              </div>
              <Toggle settingKey="soundAlerts" />
            </div>
            <div className="settings-row">
              <div className="settings-row-info">
                <h4>Auto-Speak on Detection</h4>
                <p>Automatically read the speech output aloud when a need is predicted at ≥85% confidence.</p>
              </div>
              <Toggle settingKey="autoSpeak" />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="settings-section">
          <p className="settings-section-title">Appearance</p>
          <div className="card">
            <div className="settings-row">
              <div className="settings-row-info">
                <h4>High Contrast Mode</h4>
                <p>Increase contrast for use in bright clinical environments or by staff with low vision.</p>
              </div>
              <Toggle settingKey="highContrastMode" />
            </div>
          </div>
        </div>

        {/* Profile Export & Sharing */}
        <div className="settings-section">
          <p className="settings-section-title">Profile Export & Sharing</p>
          <div className="card">
            <div className="settings-row">
              <div className="settings-row-info">
                <h4>Enable Profile Sharing</h4>
                <p>Allow this device to share child behavior profiles with other hospital staff via QR code or link.</p>
              </div>
              <Toggle settingKey="sharingEnabled" />
            </div>
            <div className="settings-row" style={{ flexWrap: "wrap" }}>
              <div className="settings-row-info">
                <h4>Export All Profiles</h4>
                <p>Download all child behavioral dictionaries as a single JSON file for backup or transfer to a new device.</p>
              </div>
              <button
                onClick={handleExportAll}
                className="btn btn-secondary"
                disabled={children.length === 0}
              >
                ⬇ Export {children.length} Profile{children.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>

        {/* Emergency Access */}
        <div className="settings-section">
          <p className="settings-section-title">Emergency Access</p>
          <div className="emergency-access-card">
            <div>
              <h4>Emergency Staff Access</h4>
              <p>
                When enabled, first responders and emergency staff can view a child's behavioral dictionary
                without authentication using the child's ID. Only enable in authorized environments.
              </p>
            </div>
            <Toggle settingKey="emergencyAccess" />
          </div>
        </div>

        {/* About */}
        <div className="settings-section">
          <p className="settings-section-title">About</p>
          <div className="card">
            <div className="settings-row">
              <div className="settings-row-info">
                <h4>NeuroVoice AI</h4>
                <p>Version 1.0.0 MVP · Behavioral Speech Translator for Non-Verbal Autistic Children</p>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-row-info">
                <h4>Data Storage</h4>
                <p>All data in this MVP is stored locally on this device only. No data is transmitted to any server.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="settings-section">
          <p className="settings-section-title" style={{ color: "var(--alert-coral)" }}>Danger Zone</p>
          <div className="card" style={{ borderColor: "rgba(244,101,74,0.2)" }}>
            <div className="settings-row">
              <div className="settings-row-info">
                <h4>Clear All Data</h4>
                <p>Permanently delete all children, behavior samples, and settings from this device. This cannot be undone.</p>
              </div>
              <button onClick={handleClearAllData} className="btn btn-secondary" style={{ color: "var(--alert-coral)", borderColor: "var(--alert-coral)", flexShrink: 0 }}>
                🗑 Clear All Data
              </button>
            </div>
          </div>
        </div>

      </div>

      {saved && <div className="success-toast">✓ Setting saved</div>}
    </>
  );
}
