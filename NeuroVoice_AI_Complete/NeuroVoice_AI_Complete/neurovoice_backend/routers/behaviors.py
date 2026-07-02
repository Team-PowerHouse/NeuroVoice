# ============================================================
# routers/behaviors.py
#
# GET    /api/behaviors            (optional ?childId= filter — matches
#                                    fetchBehaviors(params) in api.js)
# POST   /api/behaviors            (multipart/form-data, matches
#                                    uploadBehaviorSample(formData) in api.js)
# GET    /api/behaviors/{id}
# DELETE /api/behaviors/{id}
#
# Also exposes analytics read-endpoints used by Analytics.jsx /
# Timeline.jsx / Dashboard.jsx (need-frequency, timeline buckets,
# confidence distribution) since those are derived straight from
# the behaviors table.
# ============================================================

import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from services import behavior_service

router = APIRouter(prefix="/behaviors", tags=["behaviors"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _behavior_out(b: models.Behavior) -> dict:
    return {
        "id": b.id,
        "childId": b.childId,
        "childName": b.childName,
        "behaviorLabel": b.behaviorLabel,
        "need": b.need,
        "confidence": b.confidence,
        "notes": b.notes or "",
        "videoName": b.videoName or "",
        "videoUrl": b.videoUrl,
        "timestamp": b.timestamp,
    }


@router.get("")
def list_behaviors(
    childId: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Behavior)
    if childId:
        q = q.filter(models.Behavior.childId == childId)
    behaviors = q.order_by(models.Behavior.timestamp.desc()).all()
    return [_behavior_out(b) for b in behaviors]


@router.post("", status_code=201)
async def create_behavior(
    childId: str = Form(...),
    behaviorLabel: str = Form(...),
    need: str = Form(...),
    confidence: str = Form(...),
    notes: str = Form(""),
    childName: Optional[str] = Form(None),
    video: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    child = db.query(models.Child).filter(models.Child.id == childId).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    video_name = ""
    video_url = None

    if video is not None and video.filename:
        ext = os.path.splitext(video.filename)[1].lower()
        if ext not in ALLOWED_VIDEO_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported video format '{ext}'. Allowed: mp4, mov, avi.",
            )
        stored_name = f"{uuid.uuid4().hex}{ext}"
        dest_path = os.path.join(UPLOAD_DIR, stored_name)
        with open(dest_path, "wb") as out_file:
            shutil.copyfileobj(video.file, out_file)
        video_name = video.filename
        video_url = f"/uploads/{stored_name}"

    behavior = models.Behavior(
        childId=childId,
        childName=childName or child.name,
        behaviorLabel=behaviorLabel,
        need=need,
        confidence=confidence,
        notes=notes,
        videoName=video_name,
        videoUrl=video_url,
        timestamp=now_iso(),
    )
    db.add(behavior)
    db.commit()
    db.refresh(behavior)
    return _behavior_out(behavior)


# ---------------- Analytics (derived from behaviors) ----------------
# NOTE: registered BEFORE /{behavior_id} below — otherwise FastAPI's
# path matching would treat "analytics" as a behavior_id value.

@router.get("/analytics/need-frequency", response_model=List[schemas.NeedFrequencyEntry])
def need_frequency(childId: Optional[str] = None, db: Session = Depends(get_db)):
    return behavior_service.get_need_frequency(db, childId)


@router.get("/analytics/timeline", response_model=List[schemas.TimelineBucket])
def behavior_timeline(childId: Optional[str] = None, days: int = 14, db: Session = Depends(get_db)):
    return behavior_service.get_behavior_timeline(db, childId, days)


@router.get("/analytics/confidence-distribution", response_model=List[schemas.ConfidenceDistributionEntry])
def confidence_distribution(childId: Optional[str] = None, db: Session = Depends(get_db)):
    return behavior_service.get_confidence_distribution(db, childId)


# ---------------- Single-resource routes ----------------

@router.get("/{behavior_id}")
def get_behavior(behavior_id: str, db: Session = Depends(get_db)):
    b = db.query(models.Behavior).filter(models.Behavior.id == behavior_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Behavior not found")
    return _behavior_out(b)


@router.delete("/{behavior_id}")
def delete_behavior(behavior_id: str, db: Session = Depends(get_db)):
    b = db.query(models.Behavior).filter(models.Behavior.id == behavior_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Behavior not found")
    db.delete(b)
    db.commit()
    return {"success": True, "id": behavior_id}

