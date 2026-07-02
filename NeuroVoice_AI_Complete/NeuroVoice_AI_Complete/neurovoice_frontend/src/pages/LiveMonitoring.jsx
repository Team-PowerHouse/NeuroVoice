import { useEffect, useRef, useState } from "react";
import MonitoringCard from "../components/MonitoringCard";

import {
  fetchChildren,
  fetchBehaviorDictionary,
  uploadBehaviorSample
} from "../services/api";

import {
  NEED_SPEECH_OUTPUT,
  RECOMMENDED_RESPONSES,
  WHAT_NOT_TO_DO,
  NEED_CATEGORIES
} from "../utils/storage";

import "../styles/monitoring.css";

// Each scenario simulates a realistic behavioral sequence observed in hospital settings.
const SCENARIOS = {
  "Want To Leave Room": {
    behaviors: ["Door Approach", "Exit Fixation", "Door Handle Interaction"],
    confidence: 91,
    triggerHint: "Child is fixating on the exit. Prepare to escort calmly."
  },
  Thirst: {
    behaviors: ["Bottle Fixation", "Reaching Toward Cup", "Lip Licking"],
    confidence: 84,
    triggerHint: "Child appears to be seeking fluids."
  },
  "Sensory Overload": {
    behaviors: ["Ear Covering", "Head Turning Away", "Body Rocking"],
    confidence: 88,
    triggerHint: "Environmental stimulation may be too high — reduce noise and light."
  },
  Hunger: {
    behaviors: ["Hand Flapping Near Tray", "Looking At Food Cart", "Vocalizing"],
    confidence: 79,
    triggerHint: "Child is showing food-seeking behavior."
  },
  Anxiety: {
    behaviors: ["Rocking In Place", "Avoiding Eye Contact", "Stimming (Repetitive Motion)"],
    confidence: 82,
    triggerHint: "Unfamiliar staff or environment may be causing distress."
  },
  "Toilet Need": {
    behaviors: ["Leg Crossing", "Shifting Weight", "Fidgeting"],
    confidence: 87,
    triggerHint: "Escort to bathroom using established routine."
  }
};

const SCENARIO_KEYS = Object.keys(SCENARIOS);

export default function LiveMonitoring() {
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState(null);
  const [activeDict, setActiveDict] = useState([]);
  const [scenarioKey, setScenarioKey] = useState(SCENARIO_KEYS[0]);
  const [detectedCount, setDetectedCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [clock, setClock] = useState("");
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [showCorrectionPicker, setShowCorrectionPicker] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const [recentPredictions, setRecentPredictions] = useState([]);
  const intervalRef = useRef(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [behaviorLabel, setBehaviorLabel] = useState("");
  const [need, setNeed] = useState("");
  const [confidence, setConfidence] = useState("Certain");
  const [notes, setNotes] = useState("");

 useEffect(() => {

    async function loadData() {

        try {

            const c = await fetchChildren();

            setChildren(c);

            if (c.length > 0) {

                setActiveChildId(c[0].id);

                const dict = await fetchBehaviorDictionary(c[0].id);

                setActiveDict(dict);

            }

        }

        catch (err) {

            console.error(err);

        }

    }

    loadData();

}, []);


const startCamera = async () => {

    try {

        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        console.log(stream);

        streamRef.current = stream;

        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
        }

        setCameraOn(true);

    } catch (err) {

    console.error("Camera Error:", err);

    alert(err.name + "\n\n" + err.message);

}

};

const stopCamera = () => {

    if (streamRef.current) {

        streamRef.current.getTracks().forEach(track => track.stop());

        streamRef.current = null;

    }

    setCameraOn(false);

};

          const startRecording = () => {

                console.log("Entered startRecording");

                if (!streamRef.current) {

                    console.log("No stream found");

                    alert("Please open the camera first.");

                    return;

                }

                console.log("Stream found");

                chunksRef.current = [];

              try {

                  const recorder = new MediaRecorder(streamRef.current);

                  mediaRecorderRef.current = recorder;

                  console.log("MediaRecorder created");

                  recorder.ondataavailable = (event) => {

                      if (event.data.size > 0) {

                          chunksRef.current.push(event.data);

                      }

                  };

                  recorder.onstop = () => {

                      const blob = new Blob(chunksRef.current, {
                          type: "video/webm"
                      });

                      const url = URL.createObjectURL(blob);

                      console.log("Recording stopped");

                      setRecordedBlob(blob);
                      setPreviewUrl(url);

                      console.log("Preview URL:", url);

                  };

                  recorder.start();

                  console.log("Recording started");

                  setRecording(true);

              }

              catch (err) {

                  console.error(err);

                  alert(err.message);

              }

          };

        const stopRecording = () => {

            console.log("Stop button clicked");

            if (!mediaRecorderRef.current) {

                console.log("Recorder is NULL");

                return;

            }

            console.log("Recorder state:", mediaRecorderRef.current.state);

            mediaRecorderRef.current.stop();

            console.log("stop() called");

            setRecording(false);

        };

  function refreshPredictionData(childId) {
    setAccuracy(getPredictionAccuracy(childId));
    setRecentPredictions(getPredictionsByChild(childId).slice(0, 5));
  }

  // Clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Simulate detection animation: behaviors light up one by one
  useEffect(() => {
    if (isRunning) {
      setDetectedCount(0);
      setFeedbackGiven(false);
      setShowCorrectionPicker(false);
      setCurrentPrediction(null);
      const scenario = SCENARIOS[scenarioKey];
      let count = 0;
      intervalRef.current = setInterval(() => {
        count += 1;
        setDetectedCount(count);
        if (count >= scenario.behaviors.length) {
          clearInterval(intervalRef.current);
          // Log this as a real AI prediction tied to the active child
          if (activeChildId) {
            const child = children.find((c) => c.id === activeChildId);
            const pred = logPrediction({
              childId: activeChildId,
              childName: child?.name || "Unknown",
              predictedNeed: scenarioKey,
              confidenceScore: scenario.confidence,
              sourceBehaviors: scenario.behaviors
            });
            setCurrentPrediction(pred);
          }
        }
      }, 900);
    } else {
      clearInterval(intervalRef.current);
      setDetectedCount(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, scenarioKey]);

  function handleFeedback(outcome, correctedNeed = null) {
    if (!currentPrediction) return;
    resolvePrediction(currentPrediction.id, outcome, correctedNeed);
    setFeedbackGiven(true);
    setShowCorrectionPicker(false);
    refreshPredictionData(activeChildId);
  }

  function handleSpeak() {
    const text = NEED_SPEECH_OUTPUT[scenarioKey];
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92;
    utt.pitch = 1.05;
    setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  }

  function selectChild(id) {
    setActiveChildId(id);
    setActiveDict(buildBehaviorDictionary(id));
    setIsRunning(false);
    setFeedbackGiven(false);
    setCurrentPrediction(null);
    refreshPredictionData(id);
  }

  const scenario = SCENARIOS[scenarioKey];
  const allDetected = detectedCount >= scenario.behaviors.length;
  const speechOutput = NEED_SPEECH_OUTPUT[scenarioKey];
  const response = RECOMMENDED_RESPONSES[scenarioKey];
  const avoidText = WHAT_NOT_TO_DO[scenarioKey];
  console.log("Current previewUrl:", previewUrl);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Live Monitoring</p>
          <h1>Hospital Monitoring Dashboard</h1>
          <p className="sub">Real-time behavioral analysis and speech translation for clinical staff.</p>
        </div>
        <div className="topbar-right">
          {accuracy !== null && (
            <div className="feature-pill" title="Prediction accuracy for this child">
              🎯 {accuracy}% accuracy
            </div>
          )}
          <div className="live-pill">
            <span className={isRunning ? "live-dot" : ""} style={!isRunning ? { width: "8px", height: "8px", borderRadius: "50%", background: "var(--slate-300)", display: "inline-block" } : {}} />
            {isRunning ? "Monitoring Active" : "Standby"}
          </div>
        </div>
      </div>

      <div className="page-content">

        {/* Child selector */}
        {children.length > 0 && (
          <div className="child-selector">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => selectChild(c.id)}
                className={`child-selector-tab ${activeChildId === c.id ? "active" : ""}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Scenario selector */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "22px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--slate-500)", marginRight: "4px" }}>Simulate:</span>
          {SCENARIO_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => { setScenarioKey(k); setIsRunning(false); }}
              className={`btn btn-secondary`}
              style={{
                fontSize: "12.5px",
                padding: "8px 14px",
                background: scenarioKey === k ? "#e7efff" : undefined,
                borderColor: scenarioKey === k ? "var(--clinical-blue)" : undefined,
                color: scenarioKey === k ? "var(--clinical-blue-dark)" : undefined
              }}
            >
              {k}
            </button>
          ))}
        </div>

        <div className="monitoring-layout">
          {/* Left: camera + controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="camera-feed">

            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    borderRadius: "12px",
                    background: "#000"
                }}
            />

        </div>

                  {previewUrl && (

              <div
                  className="card"
                  style={{ marginTop: "20px" }}
              >

                  <p className="section-title">
                      Recorded Preview
                  </p>

                  <video
                      src={previewUrl}
                      controls
                      style={{
                          width: "100%",
                          borderRadius: "12px"
                      }}
                  />

              </div>

          )}
          

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>

          <button
              type="button"
              onClick={cameraOn ? stopCamera : startCamera}
          >
              {cameraOn ? "📷 Close Camera" : "📷 Open Camera"}
          </button>
          <button
              type="button"
              onClick={startRecording}
              disabled={!cameraOn || recording}
              className="btn btn-primary"
          >
              🎥 Start Recording
          </button>

          <button
              type="button"
              onClick={stopRecording}
              disabled={!recording}
              className="btn btn-secondary"
          >
              ⏹ Stop Recording
          </button>

      </div>

            {/* Detected behaviors list */}
            <div className="card">
              <p className="section-title">Detected Behaviors</p>
              {scenario.behaviors.map((label, i) => (
                <MonitoringCard key={label} label={label} detected={i < detectedCount} />
              ))}
            </div>

            {/* Trigger hint */}
            {allDetected && isRunning === false && detectedCount > 0 && (
              <div className="card" style={{ borderLeft: "4px solid var(--warm-amber)", background: "var(--warm-amber-soft)" }}>
                <p style={{ fontSize: "12px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.06em", color: "#92660a", marginBottom: "6px" }}>
                  Clinical Observation
                </p>
                <p style={{ fontSize: "14px", color: "#7a5407" }}>{scenario.triggerHint}</p>
              </div>
            )}
          </div>

          {/* Right: prediction + speech */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="prediction-block">
              <p className="pred-eyebrow">AI Prediction</p>
              <p className="pred-need">{allDetected && detectedCount > 0 ? scenarioKey : "Analyzing..."}</p>
              <p className="pred-confidence">
                {allDetected && detectedCount > 0 ? `${scenario.confidence}%` : "--"}
              </p>
              <p className="pred-confidence-label">Confidence score</p>

              <div className="confidence-bar-dark">
                <div
                  className="confidence-bar-dark-fill"
                  style={{ width: `${allDetected && detectedCount > 0 ? scenario.confidence : 0}%`, transition: "width 0.8s ease" }}
                />
              </div>

              <div className="speech-output-block">
                <p className="so-label">
                  🔊 Speech Output
                </p>
                <p className="so-text">
                  {allDetected && detectedCount > 0 ? `"${speechOutput}"` : "Waiting for behavior detection..."}
                </p>
                {allDetected && detectedCount > 0 && (
                  <button
                    className={`speak-btn ${isSpeaking ? "speaking" : ""}`}
                    onClick={handleSpeak}
                  >
                    {isSpeaking ? "🔊 Speaking..." : "▶ Speak Aloud"}
                  </button>
                )}
              </div>
            </div>

            {/* Recommended action */}
            {allDetected && detectedCount > 0 && (
              <div className="recommended-action-card">
                <p className="rac-label">✅ Recommended Action for Staff</p>
                <p className="rac-text">{response}</p>
              </div>
            )}

            {/* What To Avoid */}
            {allDetected && detectedCount > 0 && avoidText && (
              <div className="card" style={{ borderLeft: "4px solid var(--alert-coral)", background: "var(--alert-coral-soft)" }}>
                <p style={{ fontSize: "12px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.06em", color: "#a23a26", marginBottom: "6px" }}>
                  ✕ What To Avoid
                </p>
                <p style={{ fontSize: "13.5px", color: "#7a2b1a", lineHeight: "1.55" }}>{avoidText}</p>
              </div>
            )}

            {/* AI Feedback Loop */}
            {allDetected && detectedCount > 0 && currentPrediction && (
              <div className="card feedback-loop-card">
                <p className="section-title">🔁 AI Feedback Loop</p>
                {!feedbackGiven ? (
                  !showCorrectionPicker ? (
                    <>
                      <p style={{ fontSize: "13px", color: "var(--slate-600)", marginBottom: "12px" }}>
                        Was this prediction correct? Your feedback retrains the model for this child.
                      </p>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleFeedback("confirmed")}>
                          ✓ Confirm Correct
                        </button>
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCorrectionPicker(true)}>
                          ✕ Mark Incorrect
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: "13px", color: "var(--slate-600)", marginBottom: "10px" }}>
                        What was the child actually communicating?
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {NEED_CATEGORIES.filter((n) => n !== scenarioKey).map((n) => (
                          <button
                            key={n}
                            className="btn btn-secondary"
                            style={{ fontSize: "12px", padding: "7px 12px" }}
                            onClick={() => handleFeedback("corrected", n)}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </>
                  )
                ) : (
                  <p className="feedback-confirmed-text">
                    ✓ Feedback recorded. This will improve future predictions for {children.find((c) => c.id === activeChildId)?.name}.
                  </p>
                )}
              </div>
            )}

            {/* Child dictionary quick reference */}
            {activeDict.length > 0 && (
              <div className="card">
                <p className="section-title" style={{ fontSize: "14px" }}>Quick Reference — Known Patterns</p>
                {activeDict.slice(0, 5).map((entry) => (
                  <div key={`${entry.behaviorLabel}-${entry.need}`} className="monitoring-detection-row">
                    <span className="detection-check" style={{ background: "var(--sky-tint)", color: "var(--clinical-blue)", fontSize: "11px" }}>
                      {entry.avgConfidenceScore}%
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="detection-label">{entry.behaviorLabel}</span>
                      <span style={{ marginLeft: "8px", fontSize: "12px", color: "var(--slate-500)" }}>→ {entry.need}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent predictions log */}
            {recentPredictions.length > 0 && (
              <div className="card">
                <p className="section-title" style={{ fontSize: "14px" }}>Recent Predictions</p>
                {recentPredictions.map((p) => (
                  <div key={p.id} className="recent-prediction-row">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span className="rpr-need">{p.predictedNeed}</span>
                      <span className="rpr-score"> · {p.confidenceScore}%</span>
                    </div>
                    <span className={`feature-pill ${
                      p.status === "confirmed" ? "accuracy-pill-confirmed" :
                      p.status === "corrected" ? "accuracy-pill-corrected" : "accuracy-pill-pending"
                    }`}>
                      {p.status === "confirmed" ? "Confirmed" : p.status === "corrected" ? "Corrected" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
