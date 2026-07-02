# ============================================================
# routers/children.py
#
# Covers every children-scoped endpoint the frontend's
# services/api.js contract expects:
#   GET    /api/children
#   POST   /api/children
#   GET    /api/children/{id}
#   PUT    /api/children/{id}
#   DELETE /api/children/{id}
#   GET    /api/children/{id}/dictionary
#   POST   /api/children/{id}/predict
#   GET    /api/children/{id}/export
#   POST   /api/children/{id}/share
#
# Plus passport read/write + share-link management needed by
# CommunicationPassport.jsx and HospitalShareView.jsx.
# ============================================================

import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from services import behavior_service, prediction_service

router = APIRouter(prefix="/children", tags=["children"])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_child_or_404(db: Session, child_id: str) -> models.Child:
    child = db.query(models.Child).filter(models.Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return child


def _passport_out(passport: Optional[models.Passport]) -> dict:
    if not passport:
        return {
            "emergencyNotes": "",
            "medicalAlerts": "",
            "comfortItems": "",
            "customTriggers": [],
            "lastUpdated": None,
        }
    return {
        "emergencyNotes": passport.emergencyNotes or "",
        "medicalAlerts": passport.medicalAlerts or "",
        "comfortItems": passport.comfortItems or "",
        "customTriggers": json.loads(passport.customTriggers or "[]"),
        "lastUpdated": passport.lastUpdated,
    }


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


def _dictionary_out(entries: list[dict]) -> list[dict]:
    return [
        {
            **e,
            "latestExamples": [_behavior_out(b) for b in e["latestExamples"]],
        }
        for e in entries
    ]


# ---------------- CRUD ----------------

@router.get("", response_model=List[schemas.ChildOut])
def list_children(db: Session = Depends(get_db)):
    return db.query(models.Child).order_by(models.Child.createdAt.desc()).all()


@router.post("", response_model=schemas.ChildOut, status_code=201)
def create_child(payload: schemas.ChildCreate, db: Session = Depends(get_db)):
    child = models.Child(**payload.model_dump(), createdAt=now_iso())
    db.add(child)
    db.commit()
    db.refresh(child)
    return child


@router.get("/{child_id}", response_model=schemas.ChildOut)
def get_child(child_id: str, db: Session = Depends(get_db)):
    return _get_child_or_404(db, child_id)


@router.put("/{child_id}", response_model=schemas.ChildOut)
def update_child(child_id: str, payload: schemas.ChildUpdate, db: Session = Depends(get_db)):
    child = _get_child_or_404(db, child_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(child, field, value)
    db.commit()
    db.refresh(child)
    return child


@router.delete("/{child_id}")
def delete_child(child_id: str, db: Session = Depends(get_db)):
    child = _get_child_or_404(db, child_id)
    db.delete(child)  # cascades to behaviors, predictions, passport, share links
    db.commit()
    return {"success": True, "id": child_id}


# ---------------- Behavior Dictionary ----------------

@router.get("/{child_id}/dictionary")
def get_child_dictionary(child_id: str, db: Session = Depends(get_db)):
    _get_child_or_404(db, child_id)
    entries = behavior_service.build_behavior_dictionary(db, child_id)
    return _dictionary_out(entries)


# ---------------- Live Prediction ----------------

@router.post("/{child_id}/predict")
def predict_for_child(child_id: str, payload: schemas.LivePredictionRequest, db: Session = Depends(get_db)):
    child = _get_child_or_404(db, child_id)
    result = prediction_service.predict_need_from_frames(db, child_id, payload.frameWindow)

    entry = prediction_service.log_prediction(
        db,
        child_id=child_id,
        child_name=child.name,
        predicted_need=result["predictedNeed"],
        confidence_score=result["confidenceScore"],
        source_behaviors=result["sourceBehaviors"],
    )

    return {
        "id": entry.id,
        "childId": entry.childId,
        "childName": entry.childName,
        "predictedNeed": entry.predictedNeed,
        "confidenceScore": entry.confidenceScore,
        "sourceBehaviors": json.loads(entry.sourceBehaviors or "[]"),
        "status": entry.status,
        "correctedNeed": entry.correctedNeed,
        "timestamp": entry.timestamp,
        "resolvedAt": entry.resolvedAt,
        "speechOutput": behavior_service.NEED_SPEECH_OUTPUT.get(result["predictedNeed"]),
        "recommendedResponse": behavior_service.RECOMMENDED_RESPONSES.get(result["predictedNeed"]),
        "whatNotToDo": behavior_service.WHAT_NOT_TO_DO.get(result["predictedNeed"]),
    }


# ---------------- Passport ----------------

@router.get("/{child_id}/passport", response_model=schemas.CommunicationPassportOut)
def get_communication_passport(child_id: str, db: Session = Depends(get_db)):
    child = _get_child_or_404(db, child_id)
    dict_entries = behavior_service.build_behavior_dictionary(db, child_id)
    passport_extra = _passport_out(child.passport)

    seen = []
    for e in dict_entries:
        if e["need"] not in seen:
            seen.append(e["need"])
    top_needs = seen[:6]

    return {
        "child": child,
        "dictionary": _dictionary_out(dict_entries),
        "topNeeds": top_needs,
        "triggersByNeed": [
            {"need": n, "triggers": behavior_service.KNOWN_TRIGGERS_LIBRARY.get(n, [])} for n in top_needs
        ],
        "recommendedResponses": [
            {"need": n, "response": behavior_service.RECOMMENDED_RESPONSES.get(n, "")} for n in top_needs
        ],
        "whatToAvoid": [
            {"need": n, "avoid": behavior_service.WHAT_NOT_TO_DO.get(n, "")} for n in top_needs
        ],
        "accuracy": prediction_service.get_prediction_accuracy(db, child_id),
        **passport_extra,
        "generatedAt": now_iso(),
    }


@router.put("/{child_id}/passport", response_model=schemas.PassportDataOut)
def update_passport_data(child_id: str, payload: schemas.PassportDataIn, db: Session = Depends(get_db)):
    child = _get_child_or_404(db, child_id)
    passport = child.passport
    if not passport:
        passport = models.Passport(childId=child_id, emergencyNotes="", medicalAlerts="", comfortItems="", customTriggers="[]")
        db.add(passport)

    if payload.emergencyNotes is not None:
        passport.emergencyNotes = payload.emergencyNotes
    if payload.medicalAlerts is not None:
        passport.medicalAlerts = payload.medicalAlerts
    if payload.comfortItems is not None:
        passport.comfortItems = payload.comfortItems
    if payload.customTriggers is not None:
        passport.customTriggers = json.dumps(payload.customTriggers)
    passport.lastUpdated = now_iso()

    db.commit()
    db.refresh(passport)
    return _passport_out(passport)


# ---------------- Export ----------------

@router.get("/{child_id}/export", response_model=schemas.ExportProfileOut)
def export_child_profile(child_id: str, db: Session = Depends(get_db)):
    child = _get_child_or_404(db, child_id)
    behaviors = (
        db.query(models.Behavior)
        .filter(models.Behavior.childId == child_id)
        .order_by(models.Behavior.timestamp.desc())
        .all()
    )
    dict_entries = behavior_service.build_behavior_dictionary(db, child_id)
    return {
        "child": child,
        "dictionary": _dictionary_out(dict_entries),
        "behaviorHistory": [_behavior_out(b) for b in behaviors],
        "exportedAt": now_iso(),
    }


# ---------------- Hospital Share Links ----------------

@router.post("/{child_id}/share", response_model=schemas.ShareLinkOut, status_code=201)
def create_share_link(child_id: str, payload: schemas.ShareLinkCreate, db: Session = Depends(get_db)):
    _get_child_or_404(db, child_id)
    link = models.ShareLink(
        childId=child_id,
        recipient=payload.recipient or "Hospital Staff",
        createdAt=now_iso(),
        active=True,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.get("/{child_id}/share", response_model=List[schemas.ShareLinkOut])
def list_share_links(child_id: str, db: Session = Depends(get_db)):
    _get_child_or_404(db, child_id)
    return (
        db.query(models.ShareLink)
        .filter(models.ShareLink.childId == child_id)
        .order_by(models.ShareLink.createdAt.desc())
        .all()
    )
