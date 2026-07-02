# ============================================================
# routers/analytics.py
#
# GET /api/analytics/overview
# GET /api/analytics/needs
# GET /api/analytics/confidence
# GET /api/analytics/timeline
# ============================================================

from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
from database import get_db
from services import behavior_service, prediction_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
def analytics_overview(db: Session = Depends(get_db)):
    children = db.query(models.Child).all()
    behaviors = db.query(models.Behavior).all()
    predictions = db.query(models.Prediction).all()

    need_counts = defaultdict(int)
    child_behavior_counts = defaultdict(int)
    for b in behaviors:
        need_counts[b.need] += 1
        child_behavior_counts[b.childId] += 1

    most_common_need = None
    if need_counts:
        most_common_need = max(need_counts, key=lambda n: need_counts[n])

    most_active_child_id = None
    most_active_child_name = None
    if child_behavior_counts:
        most_active_child_id = max(child_behavior_counts, key=lambda cid: child_behavior_counts[cid])
        child_obj = db.query(models.Child).filter(models.Child.id == most_active_child_id).first()
        if child_obj:
            most_active_child_name = child_obj.name

    resolved = [p for p in predictions if p.status in ("confirmed", "corrected")]
    confirmed = sum(1 for p in resolved if p.status == "confirmed")
    overall_accuracy = round((confirmed / len(resolved)) * 100) if resolved else None

    return {
        "totalChildren": len(children),
        "totalBehaviors": len(behaviors),
        "totalPredictions": len(predictions),
        "mostCommonNeed": most_common_need,
        "mostActiveChildId": most_active_child_id,
        "mostActiveChildName": most_active_child_name,
        "overallAccuracy": overall_accuracy,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/needs")
def analytics_needs(childId: Optional[str] = None, db: Session = Depends(get_db)):
    return behavior_service.get_need_frequency(db, childId)


@router.get("/confidence")
def analytics_confidence(childId: Optional[str] = None, db: Session = Depends(get_db)):
    return behavior_service.get_confidence_distribution(db, childId)


@router.get("/timeline")
def analytics_timeline(childId: Optional[str] = None, days: int = 14, db: Session = Depends(get_db)):
    return behavior_service.get_behavior_timeline(db, childId, days)
