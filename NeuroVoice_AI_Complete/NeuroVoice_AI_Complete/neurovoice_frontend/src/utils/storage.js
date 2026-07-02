// ============================================================
// NeuroVoice AI — Local Data Layer
// All persistence runs through localStorage for the MVP.
// Shaped so services/api.js can swap this for FastAPI calls later
// without changing any page component.
// ============================================================

const CHILDREN_KEY = "neurovoice_children";
const BEHAVIORS_KEY = "neurovoice_behaviors";
const PREDICTIONS_KEY = "neurovoice_predictions";
const PASSPORT_KEY = "neurovoice_passports";
const SHARE_LINKS_KEY = "neurovoice_share_links";
const DEMO_MODE_KEY = "neurovoice_demo_mode";

export const NEED_CATEGORIES = [
  "Want To Leave Room",
  "Thirst",
  "Hunger",
  "Pain",
  "Sensory Overload",
  "Toilet Need",
  "Anxiety",
  "Discomfort",
  "Other"
];

export const CONFIDENCE_LEVELS = ["Certain", "Likely", "Unsure"];

export const SUPPORT_LEVELS = [
  "Level 1 — Requiring Support",
  "Level 2 — Requiring Substantial Support",
  "Level 3 — Requiring Very Substantial Support"
];

// Speech generated when a need is predicted/confirmed.
export const NEED_SPEECH_OUTPUT = {
  "Want To Leave Room": "I would like to leave this room.",
  Thirst: "I am thirsty. I would like something to drink.",
  Hunger: "I am hungry. I would like something to eat.",
  Pain: "I am in pain. I need help right now.",
  "Sensory Overload": "This space feels like too much for me right now.",
  "Toilet Need": "I need to use the bathroom.",
  Anxiety: "I am feeling anxious. I need some support.",
  Discomfort: "Something is uncomfortable. I need help adjusting it.",
  Other: "I am trying to tell you something important."
};

// Recommended response for each need category, written for hospital staff.
export const RECOMMENDED_RESPONSES = {
  "Want To Leave Room": "Calmly guide the child toward the door or a quieter space. Avoid blocking the exit.",
  Thirst: "Offer water or the child's preferred drink in their usual cup.",
  Hunger: "Offer a small, familiar snack. Avoid introducing new foods during distress.",
  Pain: "Check for visible injury or illness immediately and notify the attending clinician.",
  "Sensory Overload": "Dim lights, lower noise, and offer noise-cancelling headphones or a calm-down space.",
  "Toilet Need": "Escort to the restroom promptly using the child's established routine.",
  Anxiety: "Use a calm, low voice. Offer a known comfort item and reduce surrounding stimulation.",
  Discomfort: "Check clothing, positioning, medical equipment, or temperature for the source of discomfort.",
  Other: "Observe closely and consult the caregiver's behavior dictionary for similar past patterns."
};

// What hospital staff should avoid doing for each need category.
export const WHAT_NOT_TO_DO = {
  "Want To Leave Room": "Do not physically restrain or raise your voice — this can escalate distress.",
  Thirst: "Do not assume the request is for food or attention.",
  Hunger: "Do not delay feeding for long periods; this can intensify behaviors.",
  Pain: "Do not dismiss the behavior as 'just a habit' — rule out a medical cause first.",
  "Sensory Overload": "Do not add more stimulation (bright lights, loud announcements, crowding).",
  "Toilet Need": "Do not ask the child to wait without escorting them — this can cause distress or accidents.",
  Anxiety: "Do not force eye contact or rapid-fire questions.",
  Discomfort: "Do not ignore repeated tugging or fidgeting as 'just a tic' without checking the cause.",
  Other: "Do not guess and act without checking the caregiver's notes first."
};

// Known environmental/sensory triggers commonly associated with each need —
// used to pre-populate a child's Communication Passport.
export const KNOWN_TRIGGERS_LIBRARY = {
  "Want To Leave Room": ["Crowded waiting areas", "Unfamiliar staff entering", "Long wait times"],
  Thirst: ["Warm room temperature", "Extended time since last drink"],
  Hunger: ["Missed or delayed meal times", "Sight or smell of food carts"],
  Pain: ["Recent procedure or injection site", "Pressure on a sensitive area"],
  "Sensory Overload": ["Loud intercom announcements", "Fluorescent lighting", "Crowded hallways", "Beeping medical equipment"],
  "Toilet Need": ["Extended appointments without breaks"],
  Anxiety: ["New or unfamiliar staff", "Unexpected schedule changes", "Loud or sudden noises"],
  Discomfort: ["Medical equipment (IV, monitor leads)", "Tags or seams on hospital gowns"],
  Other: []
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------------- Children ----------------

export function getChildren() {
  return readJSON(CHILDREN_KEY, []);
}

export function saveChildren(children) {
  writeJSON(CHILDREN_KEY, children);
}

export function addChild(child) {
  const children = getChildren();
  const newChild = { id: uid(), ...child };
  children.push(newChild);
  saveChildren(children);
  return newChild;
}

export function getChildById(id) {
  return getChildren().find((c) => c.id === id) || null;
}

export function deleteChild(id) {
  saveChildren(getChildren().filter((c) => c.id !== id));
  saveBehaviors(getBehaviors().filter((b) => b.childId !== id));
}

// ---------------- Behavior Samples ----------------

export function getBehaviors() {
  return readJSON(BEHAVIORS_KEY, []);
}

export function saveBehaviors(behaviors) {
  writeJSON(BEHAVIORS_KEY, behaviors);
}

export function addBehavior(behavior) {
  const behaviors = getBehaviors();
  const newBehavior = {
    id: uid(),
    timestamp: new Date().toISOString(),
    ...behavior
  };
  behaviors.unshift(newBehavior);
  saveBehaviors(behaviors);
  return newBehavior;
}

export function getBehaviorsByChild(childId) {
  return getBehaviors().filter((b) => b.childId === childId);
}

// ---------------- Derived Intelligence ----------------

const CONFIDENCE_SCORE = { Certain: 95, Likely: 72, Unsure: 42 };

export function confidenceToScore(level) {
  return CONFIDENCE_SCORE[level] ?? 50;
}

export function scoreToConfidenceClass(score) {
  if (score >= 85) return "confidence-certain";
  if (score >= 60) return "confidence-likely";
  return "confidence-unsure";
}

export function getMostCommonNeed(behaviors) {
  if (!behaviors.length) return null;
  const counts = {};
  behaviors.forEach((b) => {
    counts[b.need] = (counts[b.need] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export function getDatasetReadiness(behaviors) {
  // Readiness climbs toward 100% as samples accumulate, modeling the idea
  // that the behavioral dictionary needs volume before it's hospital-ready.
  const target = 60;
  return Math.min(100, Math.round((behaviors.length / target) * 100));
}

export function getAverageConfidence(behaviors) {
  if (!behaviors.length) return 0;
  const total = behaviors.reduce((sum, b) => sum + confidenceToScore(b.confidence), 0);
  return Math.round(total / behaviors.length);
}

// Groups a child's behavior samples into dictionary entries:
// behaviorLabel + need -> aggregated confidence, sample count, examples
export function buildBehaviorDictionary(childId) {
  const behaviors = getBehaviorsByChild(childId);
  const groups = {};

  behaviors.forEach((b) => {
    const label = (b.behaviorLabel || "Unlabeled Pattern").trim();
    const key = `${label}::${b.need}`;
    if (!groups[key]) {
      groups[key] = {
        behaviorLabel: label,
        need: b.need,
        samples: []
      };
    }
    groups[key].samples.push(b);
  });

  return Object.values(groups)
    .map((g) => ({
      ...g,
      sampleCount: g.samples.length,
      avgConfidenceScore: Math.round(
        g.samples.reduce((sum, s) => sum + confidenceToScore(s.confidence), 0) / g.samples.length
      ),
      latestExamples: g.samples.slice(0, 3)
    }))
    .sort((a, b) => b.sampleCount - a.sampleCount);
}

export function getTopBehaviorsForChild(childId, limit = 4) {
  return buildBehaviorDictionary(childId).slice(0, limit);
}

export function exportChildProfile(childId) {
  const child = getChildById(childId);
  if (!child) return null;
  return {
    child,
    dictionary: buildBehaviorDictionary(childId),
    behaviorHistory: getBehaviorsByChild(childId),
    exportedAt: new Date().toISOString()
  };
}

// ============================================================
// Predictions & AI Feedback Loop
// Every time Live Monitoring (or Demo Mode) produces a prediction,
// it is logged here. Caregivers/staff confirm or correct it, and
// that outcome feeds Prediction Accuracy Tracking system-wide.
// ============================================================

export function getPredictions() {
  return readJSON(PREDICTIONS_KEY, []);
}

export function savePredictions(predictions) {
  writeJSON(PREDICTIONS_KEY, predictions);
}

export function logPrediction(prediction) {
  const predictions = getPredictions();
  const entry = {
    id: uid(),
    timestamp: new Date().toISOString(),
    status: "pending", // pending | confirmed | corrected
    correctedNeed: null,
    ...prediction
  };
  predictions.unshift(entry);
  savePredictions(predictions);
  return entry;
}

export function resolvePrediction(predictionId, outcome, correctedNeed = null) {
  const predictions = getPredictions();
  const updated = predictions.map((p) =>
    p.id === predictionId
      ? { ...p, status: outcome, correctedNeed, resolvedAt: new Date().toISOString() }
      : p
  );
  savePredictions(updated);
  return updated.find((p) => p.id === predictionId);
}

export function getPredictionsByChild(childId) {
  return getPredictions().filter((p) => p.childId === childId);
}

// Accuracy = confirmed / (confirmed + corrected). Pending predictions are excluded.
export function getPredictionAccuracy(childId = null) {
  const all = childId ? getPredictionsByChild(childId) : getPredictions();
  const resolved = all.filter((p) => p.status === "confirmed" || p.status === "corrected");
  if (resolved.length === 0) return null;
  const correct = resolved.filter((p) => p.status === "confirmed").length;
  return Math.round((correct / resolved.length) * 100);
}

export function getAccuracyTrend(childId = null, buckets = 7) {
  // Returns accuracy % per chronological bucket of resolved predictions,
  // used to chart whether the AI is improving over time for this child.
  const all = (childId ? getPredictionsByChild(childId) : getPredictions())
    .filter((p) => p.status === "confirmed" || p.status === "corrected")
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  if (all.length === 0) return [];

  const bucketSize = Math.max(1, Math.ceil(all.length / buckets));
  const trend = [];
  for (let i = 0; i < all.length; i += bucketSize) {
    const slice = all.slice(i, i + bucketSize);
    const correct = slice.filter((p) => p.status === "confirmed").length;
    trend.push({
      label: `Batch ${trend.length + 1}`,
      accuracy: Math.round((correct / slice.length) * 100),
      samples: slice.length
    });
  }
  return trend;
}

// ============================================================
// Communication Passport 2.0
// Extends a child's profile with caregiver-authored emergency
// notes and custom triggers that travel with the printable/shareable passport.
// ============================================================

export function getPassports() {
  return readJSON(PASSPORT_KEY, {});
}

export function savePassports(passports) {
  writeJSON(PASSPORT_KEY, passports);
}

export function getPassportData(childId) {
  const passports = getPassports();
  return (
    passports[childId] || {
      emergencyNotes: "",
      customTriggers: [],
      medicalAlerts: "",
      comfortItems: "",
      lastUpdated: null
    }
  );
}

export function savePassportData(childId, data) {
  const passports = getPassports();
  passports[childId] = { ...getPassportData(childId), ...data, lastUpdated: new Date().toISOString() };
  savePassports(passports);
  return passports[childId];
}

// Builds the full passport bundle used by both the on-screen view,
// the PDF export, and the hospital sharing view.
export function buildCommunicationPassport(childId) {
  const child = getChildById(childId);
  if (!child) return null;
  const dict = buildBehaviorDictionary(childId);
  const passportExtra = getPassportData(childId);
  const topNeeds = [...new Set(dict.map((e) => e.need))].slice(0, 6);

  const triggersByNeed = topNeeds.map((need) => ({
    need,
    triggers: KNOWN_TRIGGERS_LIBRARY[need] || []
  }));

  return {
    child,
    dictionary: dict,
    topNeeds,
    triggersByNeed,
    recommendedResponses: topNeeds.map((n) => ({ need: n, response: RECOMMENDED_RESPONSES[n] })),
    whatToAvoid: topNeeds.map((n) => ({ need: n, avoid: WHAT_NOT_TO_DO[n] })),
    accuracy: getPredictionAccuracy(childId),
    ...passportExtra,
    generatedAt: new Date().toISOString()
  };
}

// ============================================================
// Hospital Profile Sharing
// Generates a local shareable token that simulates a secure,
// authorized read-only link to a child's Communication Passport.
// ============================================================

export function getShareLinks() {
  return readJSON(SHARE_LINKS_KEY, []);
}

export function saveShareLinks(links) {
  writeJSON(SHARE_LINKS_KEY, links);
}

export function createShareLink(childId, recipient = "Hospital Staff") {
  const links = getShareLinks();
  const token = uid() + uid();
  const link = {
    token,
    childId,
    recipient,
    createdAt: new Date().toISOString(),
    active: true
  };
  links.unshift(link);
  saveShareLinks(links);
  return link;
}

export function getShareLinksByChild(childId) {
  return getShareLinks().filter((l) => l.childId === childId);
}

export function getShareLinkByToken(token) {
  return getShareLinks().find((l) => l.token === token) || null;
}

export function revokeShareLink(token) {
  const links = getShareLinks().map((l) => (l.token === token ? { ...l, active: false } : l));
  saveShareLinks(links);
}

// ============================================================
// Demo Mode & Auto Demo Data Generation
// ============================================================

export function isDemoMode() {
  return readJSON(DEMO_MODE_KEY, false);
}

export function setDemoMode(value) {
  writeJSON(DEMO_MODE_KEY, value);
}

const DEMO_BEHAVIOR_LIBRARY = [
  { behaviorLabel: "Door Approach", need: "Want To Leave Room" },
  { behaviorLabel: "Door Handle Interaction", need: "Want To Leave Room" },
  { behaviorLabel: "Exit Fixation", need: "Want To Leave Room" },
  { behaviorLabel: "Bottle Fixation", need: "Thirst" },
  { behaviorLabel: "Reaching Toward Cup", need: "Thirst" },
  { behaviorLabel: "Lip Licking", need: "Thirst" },
  { behaviorLabel: "Hand Flapping Near Tray", need: "Hunger" },
  { behaviorLabel: "Looking At Food Cart", need: "Hunger" },
  { behaviorLabel: "Ear Covering", need: "Sensory Overload" },
  { behaviorLabel: "Head Turning Away", need: "Sensory Overload" },
  { behaviorLabel: "Body Rocking", need: "Sensory Overload" },
  { behaviorLabel: "Leg Crossing And Fidgeting", need: "Toilet Need" },
  { behaviorLabel: "Shifting Weight", need: "Toilet Need" },
  { behaviorLabel: "Rocking In Place", need: "Anxiety" },
  { behaviorLabel: "Avoiding Eye Contact", need: "Anxiety" },
  { behaviorLabel: "Repeated Shirt Pulling", need: "Discomfort" },
  { behaviorLabel: "Tugging At Collar", need: "Discomfort" },
  { behaviorLabel: "Wincing", need: "Pain" },
  { behaviorLabel: "Guarding A Body Part", need: "Pain" }
];

const CONFIDENCE_WEIGHTED = ["Certain", "Certain", "Likely", "Likely", "Likely", "Unsure"];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generates one realistic, randomized behavior sample for a given child
// and logs it, simulating continuous real-world data collection.
export function generateAutoDemoBehavior(childId, childName) {
  const lib = randomFrom(DEMO_BEHAVIOR_LIBRARY);
  const confidence = randomFrom(CONFIDENCE_WEIGHTED);
  const behavior = addBehavior({
    childId,
    childName,
    behaviorLabel: lib.behaviorLabel,
    need: lib.need,
    confidence,
    notes: "Auto-generated demo observation.",
    videoName: `${childName.toLowerCase().replace(/\s+/g, "_")}_demo_${Date.now()}.mp4`
  });

  // Simulate an AI prediction tied to this behavior, auto-resolved most of the time
  // to keep the accuracy tracker populated during a live demo.
  const prediction = logPrediction({
    childId,
    childName,
    predictedNeed: lib.need,
    confidenceScore: confidenceToScore(confidence),
    sourceBehaviors: [lib.behaviorLabel]
  });

  const roll = Math.random();
  if (roll < 0.82) {
    resolvePrediction(prediction.id, "confirmed");
  } else if (roll < 0.95) {
    resolvePrediction(prediction.id, "corrected", randomFrom(NEED_CATEGORIES));
  }
  // else leave pending

  return behavior;
}

// Runs one full auto-demo "tick" across all registered children —
// called on an interval while Demo Mode is active.
export function runAutoDemoTick() {
  const children = getChildren();
  if (children.length === 0) return [];
  const child = randomFrom(children);
  return [generateAutoDemoBehavior(child.id, child.name)];
}

// ============================================================
// Behavior Frequency & Analytics helpers (for Recharts dashboards)
// ============================================================

export function getNeedFrequency(childId = null) {
  const behaviors = childId ? getBehaviorsByChild(childId) : getBehaviors();
  const counts = {};
  behaviors.forEach((b) => {
    counts[b.need] = (counts[b.need] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([need, count]) => ({ need, count }))
    .sort((a, b) => b.count - a.count);
}

export function getBehaviorTimeline(childId = null, days = 14) {
  // Groups behavior samples by day for the last N days, for trend charts.
  const behaviors = (childId ? getBehaviorsByChild(childId) : getBehaviors())
    .slice()
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const buckets = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    buckets[key] = 0;
  }

  behaviors.forEach((b) => {
    const d = new Date(b.timestamp);
    const key = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (key in buckets) buckets[key] += 1;
  });

  return Object.entries(buckets).map(([date, count]) => ({ date, count }));
}

export function getConfidenceDistribution(childId = null) {
  const behaviors = childId ? getBehaviorsByChild(childId) : getBehaviors();
  const counts = { Certain: 0, Likely: 0, Unsure: 0 };
  behaviors.forEach((b) => {
    if (b.confidence in counts) counts[b.confidence] += 1;
  });
  return Object.entries(counts).map(([level, count]) => ({ level, count }));
}

// ============================================================
// Demo Seed Data
// Populates two example children with realistic behavioral
// histories so the dashboard is never empty on first load.
// ============================================================

export function seedDemoDataIfEmpty() {
  if (getChildren().length > 0) return;

  const ram = addChild({
    name: "Ram Iyer",
    age: 7,
    gender: "Male",
    supportLevel: SUPPORT_LEVELS[2],
    caregiver: "Priya Iyer (Mother)"
  });

  const meera = addChild({
    name: "Meera Nair",
    age: 5,
    gender: "Female",
    supportLevel: SUPPORT_LEVELS[1],
    caregiver: "Anand Nair (Father)"
  });

  const seedSamples = [
    {
      childId: ram.id,
      childName: ram.name,
      behaviorLabel: "Door Approach",
      need: "Want To Leave Room",
      notes: "Walks toward door repeatedly, glances back at caregiver.",
      videoName: "ram_door_approach_01.mp4",
      confidence: "Certain"
    },
    {
      childId: ram.id,
      childName: ram.name,
      behaviorLabel: "Door Handle Interaction",
      need: "Want To Leave Room",
      notes: "Touches and rattles the door handle.",
      videoName: "ram_door_handle_02.mp4",
      confidence: "Certain"
    },
    {
      childId: ram.id,
      childName: ram.name,
      behaviorLabel: "Bottle Fixation",
      need: "Thirst",
      notes: "Stares at and reaches toward water bottle on the table.",
      videoName: "ram_bottle_fixation_01.mp4",
      confidence: "Likely"
    },
    {
      childId: ram.id,
      childName: ram.name,
      behaviorLabel: "Ear Covering",
      need: "Sensory Overload",
      notes: "Covers both ears tightly during loud hallway announcements.",
      videoName: "ram_ear_covering_01.mp4",
      confidence: "Certain"
    },
    {
      childId: ram.id,
      childName: ram.name,
      behaviorLabel: "Repeated Shirt Pulling",
      need: "Discomfort",
      notes: "Tugs at collar repeatedly after IV placement.",
      videoName: "ram_shirt_pulling_01.mp4",
      confidence: "Unsure"
    },
    {
      childId: meera.id,
      childName: meera.name,
      behaviorLabel: "Hand Flapping Near Tray",
      need: "Hunger",
      notes: "Rapid hand flapping while looking at the food tray cart.",
      videoName: "meera_hand_flap_01.mp4",
      confidence: "Likely"
    },
    {
      childId: meera.id,
      childName: meera.name,
      behaviorLabel: "Leg Crossing And Fidgeting",
      need: "Toilet Need",
      notes: "Crosses legs and shifts weight repeatedly.",
      videoName: "meera_leg_fidget_01.mp4",
      confidence: "Certain"
    },
    {
      childId: meera.id,
      childName: meera.name,
      behaviorLabel: "Rocking In Place",
      need: "Anxiety",
      notes: "Rocks back and forth before unfamiliar staff enter the room.",
      videoName: "meera_rocking_01.mp4",
      confidence: "Likely"
    }
  ];

  seedSamples.forEach((s) => addBehavior(s));

  // Seed prediction history so Prediction Accuracy Tracking has data immediately.
  const seedPredictions = [
    { childId: ram.id, childName: ram.name, predictedNeed: "Want To Leave Room", confidenceScore: 91, sourceBehaviors: ["Door Approach"], status: "confirmed" },
    { childId: ram.id, childName: ram.name, predictedNeed: "Thirst", confidenceScore: 76, sourceBehaviors: ["Bottle Fixation"], status: "confirmed" },
    { childId: ram.id, childName: ram.name, predictedNeed: "Sensory Overload", confidenceScore: 88, sourceBehaviors: ["Ear Covering"], status: "confirmed" },
    { childId: ram.id, childName: ram.name, predictedNeed: "Discomfort", confidenceScore: 54, sourceBehaviors: ["Repeated Shirt Pulling"], status: "corrected", correctedNeed: "Pain" },
    { childId: ram.id, childName: ram.name, predictedNeed: "Want To Leave Room", confidenceScore: 93, sourceBehaviors: ["Door Handle Interaction"], status: "confirmed" },
    { childId: meera.id, childName: meera.name, predictedNeed: "Hunger", confidenceScore: 79, sourceBehaviors: ["Hand Flapping Near Tray"], status: "confirmed" },
    { childId: meera.id, childName: meera.name, predictedNeed: "Toilet Need", confidenceScore: 87, sourceBehaviors: ["Leg Crossing And Fidgeting"], status: "confirmed" },
    { childId: meera.id, childName: meera.name, predictedNeed: "Anxiety", confidenceScore: 68, sourceBehaviors: ["Rocking In Place"], status: "confirmed" },
    { childId: meera.id, childName: meera.name, predictedNeed: "Hunger", confidenceScore: 61, sourceBehaviors: ["Hand Flapping Near Tray"], status: "corrected", correctedNeed: "Sensory Overload" }
  ];

  seedPredictions.forEach((p) => {
    const entry = logPrediction(p);
    if (p.status !== "pending") {
      resolvePrediction(entry.id, p.status, p.correctedNeed || null);
    }
  });

  // Seed passport extras for the demo children.
  savePassportData(ram.id, {
    emergencyNotes: "Ram becomes distressed by sudden loud noises and unfamiliar staff approaching quickly. Allow him to see new people before they get close. He responds well to a 10-second verbal warning before any physical contact (e.g. blood pressure cuff).",
    medicalAlerts: "No known drug allergies. Mild sensory sensitivity to adhesive bandages — use paper tape only.",
    comfortItems: "Small blue fidget cube (always in left pocket). Noise-cancelling headphones in backpack.",
    customTriggers: ["Sudden loud intercom announcements", "Being approached from behind"]
  });

  savePassportData(meera.id, {
    emergencyNotes: "Meera communicates 'I need the bathroom' through leg-crossing and weight shifting — please respond within 2 minutes to avoid escalation. She does not make eye contact when anxious; this is not a sign of non-cooperation.",
    medicalAlerts: "Mild lactose sensitivity — confirm before offering dairy-based snacks.",
    comfortItems: "Soft elephant toy. Prefers dim lighting when possible.",
    customTriggers: ["New staff entering without introduction", "Bright overhead lighting"]
  });
}
