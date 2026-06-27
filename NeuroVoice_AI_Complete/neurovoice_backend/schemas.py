# ============================================================
# schemas.py
# Pydantic schemas. Field names and shapes match what the React
# pages already construct/consume via utils/storage.js, so the
# JSON returned here is a drop-in replacement for localStorage.
# ============================================================

from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


# ---------------- Children ----------------

class ChildBase(BaseModel):
    name: str
    age: int
    gender: str
    supportLevel: str
    caregiver: str


class ChildCreate(ChildBase):
    pass


class ChildUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    supportLevel: Optional[str] = None
    caregiver: Optional[str] = None


class ChildOut(ChildBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    createdAt: str


# ---------------- Behaviors ----------------

class BehaviorCreate(BaseModel):
    childId: str
    childName: Optional[str] = None  # auto-filled server-side if omitted
    behaviorLabel: str
    need: str
    confidence: str
    notes: Optional[str] = ""
    videoName: Optional[str] = ""


class BehaviorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    childId: str
    childName: str
    behaviorLabel: str
    need: str
    confidence: str
    notes: str
    videoName: str
    videoUrl: Optional[str] = None
    timestamp: str


# ---------------- Dictionary (derived) ----------------

class DictionaryEntry(BaseModel):
    behaviorLabel: str
    need: str
    sampleCount: int
    avgConfidenceScore: int
    latestExamples: List[BehaviorOut]


# ---------------- Predictions ----------------

class PredictionCreate(BaseModel):
    childId: str
    childName: Optional[str] = None
    predictedNeed: str
    confidenceScore: int
    sourceBehaviors: Optional[List[str]] = []


class PredictionResolve(BaseModel):
    predictionId: str
    outcome: str  # "confirmed" | "corrected"
    correctedNeed: Optional[str] = None


class PredictionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    childId: str
    childName: str
    predictedNeed: str
    confidenceScore: int
    sourceBehaviors: List[str]
    status: str
    correctedNeed: Optional[str] = None
    timestamp: str
    resolvedAt: Optional[str] = None


class LivePredictionRequest(BaseModel):
    frameWindow: List[str] = []


# ---------------- Passport ----------------

class PassportDataIn(BaseModel):
    emergencyNotes: Optional[str] = None
    medicalAlerts: Optional[str] = None
    comfortItems: Optional[str] = None
    customTriggers: Optional[List[str]] = None


class PassportDataOut(BaseModel):
    emergencyNotes: str
    medicalAlerts: str
    comfortItems: str
    customTriggers: List[str]
    lastUpdated: Optional[str] = None


class TriggerGroup(BaseModel):
    need: str
    triggers: List[str]


class ResponseGroup(BaseModel):
    need: str
    response: str


class AvoidGroup(BaseModel):
    need: str
    avoid: str


class CommunicationPassportOut(BaseModel):
    child: ChildOut
    dictionary: List[DictionaryEntry]
    topNeeds: List[str]
    triggersByNeed: List[TriggerGroup]
    recommendedResponses: List[ResponseGroup]
    whatToAvoid: List[AvoidGroup]
    accuracy: Optional[int] = None
    emergencyNotes: str
    medicalAlerts: str
    comfortItems: str
    customTriggers: List[str]
    lastUpdated: Optional[str] = None
    generatedAt: str


# ---------------- Share Links ----------------

class ShareLinkCreate(BaseModel):
    recipient: Optional[str] = "Hospital Staff"


class ShareLinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    token: str
    childId: str
    recipient: str
    createdAt: str
    active: bool


# ---------------- Export ----------------

class ExportProfileOut(BaseModel):
    child: ChildOut
    dictionary: List[DictionaryEntry]
    behaviorHistory: List[BehaviorOut]
    exportedAt: str


# ---------------- Analytics ----------------

class NeedFrequencyEntry(BaseModel):
    need: str
    count: int


class TimelineBucket(BaseModel):
    date: str
    count: int


class ConfidenceDistributionEntry(BaseModel):
    level: str
    count: int


class AccuracyTrendEntry(BaseModel):
    label: str
    accuracy: int
    samples: int


# ---------------- Demo Mode ----------------

class DemoModeOut(BaseModel):
    enabled: bool


class DemoModeIn(BaseModel):
    enabled: bool
