import { useEffect, useState } from "react";
import {
  fetchChildren,
  fetchBehaviors
} from "../services/api";

import {
  RECOMMENDED_RESPONSES,
  WHAT_NOT_TO_DO,
  NEED_SPEECH_OUTPUT,
  scoreToConfidenceClass
} from "../utils/storage";
import "../styles/dictionary.css";

const AVATAR_PALETTE = ["#2e6ff2", "#0fae9c", "#f59e0b", "#f4654a", "#7c5cf2"];
function colorFor(id) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function buildDictionary(behaviors, childId) {

  const childBehaviors = behaviors.filter(
    (b) => String(b.childId) === String(childId)
  );

  const groups = {};

  childBehaviors.forEach((b) => {

    const key = `${b.behaviorLabel}_${b.need}`;

    if (!groups[key]) {
      groups[key] = {
        behaviorLabel: b.behaviorLabel,
        need: b.need,
        sampleCount: 0,
        avgConfidenceScore: 0,
        latestExamples: [],
      };
    }

    groups[key].sampleCount++;

    groups[key].avgConfidenceScore += Number(b.confidence || 80);

    groups[key].latestExamples.push(b);

  });

  return Object.values(groups).map((g) => ({
    ...g,
    avgConfidenceScore: Math.round(
      g.avgConfidenceScore / g.sampleCount
    ),
  }));

}

export default function BehaviorDictionary() {
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState(null);
  const [dict, setDict] = useState([]);
  const [behaviors, setBehaviors] = useState([]);
  useEffect(() => {

  async function loadData() {

    try {

      const childrenData = await fetchChildren();
      const behaviorData = await fetchBehaviors();

      setChildren(childrenData);
      setBehaviors(behaviorData);

      if (childrenData.length > 0) {

        setActiveChildId(childrenData[0].id);
        setDict(
        buildDictionary(
          behaviorData,
          childrenData[0].id
        )
      );

      }

    } catch (err) {

      console.error(err);

    }

  }

  loadData();

}, []);

  function selectChild(id) {

  setActiveChildId(id);

  setDict(
    buildDictionary(
      behaviors,
      id
    )
  );

}

  const activeChild = children.find((c) => c.id === activeChildId);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Communication Passport</p>
          <h1>Behavior Dictionary</h1>
          <p className="sub">
            Each child's personalized behavior-to-speech mapping — the hospital's guide to understanding them.
          </p>
        </div>
      </div>

      <div className="page-content">

        {/* Child selector tabs */}
        {children.length > 0 && (
          <div className="dictionary-child-select">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => selectChild(c.id)}
                className={`child-tab ${activeChildId === c.id ? "active" : ""}`}
              >
                <span
                  className="child-tab-avatar"
                  style={{ background: activeChildId === c.id ? "rgba(255,255,255,0.25)" : colorFor(c.id) }}
                >
                  {initials(c.name)}
                </span>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {children.length === 0 && (
          <div className="empty-state">
            <p className="icon">📖</p>
            <h3>No children registered yet.</h3>
            <p>Register a child and upload behavior samples to build their communication passport.</p>
          </div>
        )}

        {activeChild && (
          <>
            {/* Passport header */}
            <div className="passport-header">
              <div>
                <h2>{activeChild.name}'s Communication Passport</h2>
                <p>
                  {activeChild.age} years · {activeChild.gender} · Caregiver: {activeChild.caregiver}
                </p>
                <p style={{ marginTop: "4px" }}>{activeChild.supportLevel}</p>
              </div>
              <div>
                <span className="passport-badge">{dict.length} Behaviors Mapped</span>
              </div>
            </div>

            {dict.length === 0 ? (
              <div className="empty-state">
                <p className="icon">🔍</p>
                <h3>No behaviors mapped for {activeChild.name} yet.</h3>
                <p>Upload labeled behavior videos to populate this child's communication passport.</p>
              </div>
            ) : (
              <div className="grid grid-2">
                {dict.map((entry) => {
                  const confClass = scoreToConfidenceClass(entry.avgConfidenceScore);
                  const speechOutput = NEED_SPEECH_OUTPUT[entry.need];
                  const response = RECOMMENDED_RESPONSES[entry.need];
                  const caution = WHAT_NOT_TO_DO[entry.need];

                  return (
                    <div key={`${entry.behaviorLabel}-${entry.need}`} className="card dict-card">
                      <div className="dict-card-header">
                        <div>
                          <p className="dict-behavior-name">{entry.behaviorLabel}</p>
                          <p className="dict-sample-count">{entry.sampleCount} sample{entry.sampleCount !== 1 ? "s" : ""} · avg {entry.avgConfidenceScore}% confidence</p>
                        </div>
                        <span className={`confidence-badge ${confClass}`}>{entry.avgConfidenceScore}%</span>
                      </div>

                      <div className="dict-card-body">
                        {/* Behavior → Need chip */}
                        <div className="translation-chip">
                          <span className="t-behavior">{entry.behaviorLabel}</span>
                          <span className="t-path" />
                          <span className="t-speech">{entry.need}</span>
                        </div>

                        {/* Confidence bar */}
                        <div>
                          <p className="dict-section-label">Model Confidence</p>
                          <div className="confidence-bar">
                            <div
                              className="confidence-bar-fill"
                              style={{ width: `${entry.avgConfidenceScore}%` }}
                            />
                          </div>
                        </div>

                        {/* Speech output */}
                        <div className="dict-speech-output">
                          <p className="dict-section-label">🔊 Child's Voice</p>
                          <p className="speech-text">"{speechOutput}"</p>
                        </div>

                        {/* Recommended response */}
                        <div>
                          <p className="dict-section-label">✅ Recommended Response</p>
                          <p className="dict-response-text">{response}</p>
                        </div>

                        {/* What not to do */}
                        <div>
                          <p className="dict-section-label">⚠️ What Not To Do</p>
                          <p className="dict-caution-text">{caution}</p>
                        </div>

                        {/* Recent examples */}
                        {entry.latestExamples.length > 0 && (
                          <div>
                            <p className="dict-section-label">🎥 Example Samples</p>
                            {entry.latestExamples.map((ex) => (
                              <div key={ex.id} style={{ fontSize: "12.5px", color: "var(--slate-500)", marginBottom: "4px" }}>
                                {ex.videoName || "No video"} · <span style={{ fontStyle: "italic" }}>{ex.notes ? ex.notes.slice(0, 60) + (ex.notes.length > 60 ? "…" : "") : "No notes"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
