# ============================================================
# routers/predictions.py
#
# GET  /api/predictions                 (optional ?childId= filter)
# POST /api/predictions                 (log a new prediction)
# POST /api/predictions/feedback        (confirm/correct — mirrors
#                                         resolvePrediction() in storage.js)
# GET  /api/predictions/accuracy        (?childId= optional)
# GET  /api/predictions/accuracy-trend  (?childId=&buckets= optional)
# ============================================================

import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from services import prediction_service

router = APIRouter(prefix="/predictions", tags=["predictions"])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _prediction_out(p: models.Prediction) -> dict:
    return {
        "id": p.id,
        "childId": p.childId,
        "childName": p.childName,
        "predictedNeed": p.predictedNeed,
        "confidenceScore": p.confidenceScore,
        "sourceBehaviors": json.loads(p.sourceBehaviors or "[]"),
        "status": p.status,
        "correctedNeed": p.correctedNeed,
        "timestamp": p.timestamp,
        "resolvedAt": p.resolvedAt,
    }


@router.get("")
def list_predictions(childId: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.Prediction)
    if childId:
        q = q.filter(models.Prediction.childId == childId)
    predictions = q.order_by(models.Prediction.timestamp.desc()).all()
    return [_prediction_out(p) for p in predictions]


@router.post("", status_code=201)
def create_prediction(payload: schemas.PredictionCreate, db: Session = Depends(get_db)):
    child = db.query(models.Child).filter(models.Child.id == payload.childId).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    entry = prediction_service.log_prediction(
        db,
        child_id=payload.childId,
        child_name=payload.childName or child.name,
        predicted_need=payload.predictedNeed,
        confidence_score=payload.confidenceScore,
        source_behaviors=payload.sourceBehaviors,
    )
    return _prediction_out(entry)


@router.post("/feedback")
def submit_feedback(payload: schemas.PredictionResolve, db: Session = Depends(get_db)):
    if payload.outcome not in ("confirmed", "corrected"):
        raise HTTPException(status_code=400, detail="outcome must be 'confirmed' or 'corrected'")

    entry = prediction_service.resolve_prediction(
        db, payload.predictionId, payload.outcome, payload.correctedNeed
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return _prediction_out(entry)


@router.get("/accuracy")
def prediction_accuracy(childId: Optional[str] = None, db: Session = Depends(get_db)):
    accuracy = prediction_service.get_prediction_accuracy(db, childId)
    return {"accuracy": accuracy}


@router.get("/accuracy-trend", response_model=List[schemas.AccuracyTrendEntry])
def accuracy_trend(childId: Optional[str] = None, buckets: int = 7, db: Session = Depends(get_db)):
    return prediction_service.get_accuracy_trend(db, childId, buckets)
