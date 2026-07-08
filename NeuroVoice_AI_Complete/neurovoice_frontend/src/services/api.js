// ============================================================
// services/api.js
// Single API layer for all NeuroVoice AI backend communication.
// All pages import from here — never from utils/storage.js for
// remote data.
// ============================================================

import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 12000,
});

// ── Children ────────────────────────────────────────────────

export async function fetchChildren() {
  const { data } = await client.get("/children");
  return data;
}

export async function createChild(payload) {
  const { data } = await client.post("/children", payload);
  return data;
}

export async function fetchChildProfile(childId) {
  const { data } = await client.get(`/children/${childId}`);
  return data;
}

export async function updateChild(childId, payload) {
  const { data } = await client.put(`/children/${childId}`, payload);
  return data;
}

export async function deleteChildRemote(childId) {
  const { data } = await client.delete(`/children/${childId}`);
  return data;
}

// ── Behavior Samples ─────────────────────────────────────────

export async function fetchBehaviors(params = {}) {
  const { data } = await client.get("/behaviors", { params });
  return data;
}

export async function uploadBehaviorSample(formData) {
  const { data } = await client.post("/behaviors", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteBehaviorRemote(behaviorId) {
  const { data } = await client.delete(`/behaviors/${behaviorId}`);
  return data;
}

// ── Behavior Dictionary ──────────────────────────────────────

export async function fetchBehaviorDictionary(childId) {
  const { data } = await client.get(`/children/${childId}/dictionary`);
  return data;
}

// ── Predictions ──────────────────────────────────────────────

export async function requestLivePrediction(childId, frameWindow) {
  const { data } = await client.post(`/children/${childId}/predict`, { frameWindow });
  return data;
}

export async function fetchPredictions(params = {}) {
  const { data } = await client.get("/predictions", { params });
  return data;
}

export async function submitPredictionFeedback(predictionId, outcome, correctedNeed = null) {
  const { data } = await client.post("/predictions/feedback", {
    predictionId,
    outcome,
    correctedNeed,
  });
  return data;
}

export async function fetchPredictionAccuracy(childId = null) {
  const params = childId ? { childId } : {};
  const { data } = await client.get("/predictions/accuracy", { params });
  return data.accuracy;
}

export async function fetchAccuracyTrend(childId = null, buckets = 6) {
  const params = { buckets, ...(childId ? { childId } : {}) };
  const { data } = await client.get("/predictions/accuracy-trend", { params });
  return data;
}

// ── Communication Passport ────────────────────────────────────

export async function fetchPassport(childId) {
  const { data } = await client.get(`/children/${childId}/passport`);
  return data;
}

export async function updatePassportData(childId, payload) {
  const { data } = await client.put(`/children/${childId}/passport`, payload);
  return data;
}

export function getPassportPdfUrl(childId) {
  return `${API_BASE_URL}/children/${childId}/passport/pdf`;
}

// ── Hospital Sharing ──────────────────────────────────────────

export async function createShareLink(childId, recipient = "Hospital Staff") {
  const { data } = await client.post(`/children/${childId}/share`, { recipient });
  return data;
}

export async function fetchShareLinks(childId) {
  const { data } = await client.get(`/children/${childId}/share`);
  return data;
}

export async function revokeShareLink(token) {
  const { data } = await client.post(`/share/${token}/revoke`);
  return data;
}

export async function fetchSharedPassport(token) {
  const { data } = await client.get(`/share/${token}`);
  return data;
}

// ── Export ────────────────────────────────────────────────────

export async function exportChildProfileRemote(childId) {
  const { data } = await client.get(`/children/${childId}/export`);
  return data;
}

// ── Analytics ─────────────────────────────────────────────────

export async function fetchAnalyticsOverview() {
  const { data } = await client.get("/analytics/overview");
  return data;
}

export async function fetchNeedFrequency(childId = null) {
  const params = childId ? { childId } : {};
  const { data } = await client.get("/analytics/needs", { params });
  return data;
}

export async function fetchConfidenceDistribution(childId = null) {
  const params = childId ? { childId } : {};
  const { data } = await client.get("/analytics/confidence", { params });
  return data;
}

export async function fetchBehaviorTimeline(childId = null, days = 14) {
  const params = { days, ...(childId ? { childId } : {}) };
  const { data } = await client.get("/analytics/timeline", { params });
  return data;
}

// ── Demo Mode ─────────────────────────────────────────────────

export async function fetchDemoMode() {
  const { data } = await client.get("/demo-mode");
  return data.enabled;
}

export async function setDemoModeRemote(enabled) {
  const { data } = await client.put("/demo-mode", { enabled });
  return data.enabled;
}

export async function runDemoTick() {
  const { data } = await client.post("/demo-mode/tick");
  return data;
}

export default client;
