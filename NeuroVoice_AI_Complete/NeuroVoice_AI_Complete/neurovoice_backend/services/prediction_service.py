# ============================================================
# services/prediction_service.py
#
# Prediction logging, resolution, and accuracy-tracking logic
# ported from storage.js's "Predictions & AI Feedback Loop"
# section. Accuracy = confirmed / (confirmed + corrected).
#
# PHASE 2 PLACEHOLDER
# ------------------------------------------------------------
# predict_need_from_frames() is the seam where real video-based
# inference (TensorFlow / OpenCV / MediaPipe pose+gesture models)
# will plug in later. For now it returns a deterministic stub so
# /children/{id}/predict has a real, working response today.
# Swap the body of this function only — callers (routers) never
# need to change.
# ============================================================

import json
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from models import Prediction, Behavior
from services.behavior_service import confidence_to_score
from services import ai_engine


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def log_prediction(
    db: Session,
    child_id: str,
    child_name: str,
    predicted_need: str,
    confidence_score: int,
    source_behaviors: Optional[List[str]] = None,
) -> Prediction:
    entry = Prediction(
        childId=child_id,
        childName=child_name,
        predictedNeed=predicted_need,
        confidenceScore=confidence_score,
        sourceBehaviors=json.dumps(source_behaviors or []),
        status="pending",
        correctedNeed=None,
        timestamp=now_iso(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def resolve_prediction(
    db: Session, prediction_id: str, outcome: str, corrected_need: Optional[str] = None
) -> Optional[Prediction]:
    entry = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not entry:
        return None
    entry.status = outcome
    entry.correctedNeed = corrected_need
    entry.resolvedAt = now_iso()
    db.commit()
    db.refresh(entry)
    return entry


def get_prediction_accuracy(db: Session, child_id: Optional[str] = None) -> Optional[int]:
    """Accuracy = confirmed / (confirmed + corrected). Pending predictions excluded."""
    q = db.query(Prediction)
    if child_id:
        q = q.filter(Prediction.childId == child_id)
    resolved = [p for p in q.all() if p.status in ("confirmed", "corrected")]
    if not resolved:
        return None
    correct = sum(1 for p in resolved if p.status == "confirmed")
    return round((correct / len(resolved)) * 100)


def get_accuracy_trend(db: Session, child_id: Optional[str] = None, buckets: int = 7) -> list[dict]:
    q = db.query(Prediction)
    if child_id:
        q = q.filter(Prediction.childId == child_id)
    resolved = sorted(
        (p for p in q.all() if p.status in ("confirmed", "corrected")),
        key=lambda p: p.timestamp,
    )
    if not resolved:
        return []

    bucket_size = max(1, -(-len(resolved) // buckets))  # ceil division
    trend = []
    for i in range(0, len(resolved), bucket_size):
        sl = resolved[i : i + bucket_size]
        correct = sum(1 for p in sl if p.status == "confirmed")
        trend.append(
            {
                "label": f"Batch {len(trend) + 1}",
                "accuracy": round((correct / len(sl)) * 100),
                "samples": len(sl),
            }
        )
    return trend


# ------------------------------------------------------------
# Phase 2 placeholder — real-time / video-based need prediction.
# Intentionally has NO TensorFlow / OpenCV / MediaPipe code yet.
# ------------------------------------------------------------

def predict_need_from_frames(db: Session, child_id: str, frame_window: List[str]) -> dict:
    """
    Delegates to the AI engine (services/ai_engine.py) which implements
    frequency-weighted need scoring over the child's caregiver-labelled history.
    Fully explainable — no black-box models, no external APIs.
    """
    return ai_engine.predict_need_from_frames(db, child_id, frame_window)
