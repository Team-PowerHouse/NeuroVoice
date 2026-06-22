// ============================================================
// services/api.js
// MVP currently runs entirely on localStorage (see utils/storage.js).
// This file defines the contract NeuroVoice AI will call once the
// FastAPI backend is live — swap the localStorage calls in pages
// for these functions without changing component logic.
// ============================================================

import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 8000
});

// ---------------- Children ----------------

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

export async function deleteChildRemote(childId) {
  const { data } = await client.delete(`/children/${childId}`);
  return data;
}

// ---------------- Behavior Samples ----------------

export async function fetchBehaviors(params = {}) {
  const { data } = await client.get("/behaviors", { params });
  return data;
}

export async function uploadBehaviorSample(formData) {
  // formData should be a FormData instance containing the video file
  // plus childId, need, confidence, behaviorLabel, and notes fields.
  const { data } = await client.post("/behaviors", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
}

// ---------------- Behavior Dictionary & Prediction ----------------

export async function fetchBehaviorDictionary(childId) {
  const { data } = await client.get(`/children/${childId}/dictionary`);
  return data;
}

export async function requestLivePrediction(childId, frameWindow) {
  // frameWindow: recent detected behavior labels from the camera feed
  const { data } = await client.post(`/children/${childId}/predict`, { frameWindow });
  return data;
}

// ---------------- Profile Export / Sharing ----------------

export async function exportChildProfileRemote(childId) {
  const { data } = await client.get(`/children/${childId}/export`);
  return data;
}

export async function shareChildProfile(childId, recipientEmail) {
  const { data } = await client.post(`/children/${childId}/share`, { recipientEmail });
  return data;
}

export default client;
