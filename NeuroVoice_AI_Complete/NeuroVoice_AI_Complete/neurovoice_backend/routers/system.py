# ============================================================
# routers/system.py
#
# Endpoints that don't belong to a single child/behavior resource:
#
#   GET  /api/share/{token}        public, unauthenticated lookup
#                                   used by HospitalShareView.jsx
#                                   (mirrors getShareLinkByToken +
#                                   buildCommunicationPassport)
#   POST /api/share/{token}/revoke revoke a share link
#
#   GET  /api/demo-mode            mirrors isDemoMode()
#   PUT  /api/demo-mode            mirrors setDemoMode()
#   POST /api/demo-mode/tick       mirrors runAutoDemoTick() — generates
#                                   one realistic behavior sample (+ a
#                                   mostly-auto-resolved prediction) for
#                                   a random existing child, used while
#                                   Demo Mode is active.
# ============================================================

import json
import random
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from services import behavior_service, prediction_service

router = APIRouter(tags=["system"])


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


def _passport_out(passport) -> dict:
    if not passport:
        return {"emergencyNotes": "", "medicalAlerts": "", "comfortItems": "", "customTriggers": [], "lastUpdated": None}
    return {
        "emergencyNotes": passport.emergencyNotes or "",
        "medicalAlerts": passport.medicalAlerts or "",
        "comfortItems": passport.comfortItems or "",
        "customTriggers": json.loads(passport.customTriggers or "[]"),
        "lastUpdated": passport.lastUpdated,
    }


def _dictionary_out(entries: list[dict]) -> list[dict]:
    return [{**e, "latestExamples": [_behavior_out(b) for b in e["latestExamples"]]} for e in entries]


def _build_passport_payload(db: Session, child: models.Child) -> dict:
    dict_entries = behavior_service.build_behavior_dictionary(db, child.id)
    seen = []
    for e in dict_entries:
        if e["need"] not in seen:
            seen.append(e["need"])
    top_needs = seen[:6]
    passport_extra = _passport_out(child.passport)

    return {
        "child": child,
        "dictionary": _dictionary_out(dict_entries),
        "topNeeds": top_needs,
        "triggersByNeed": [{"need": n, "triggers": behavior_service.KNOWN_TRIGGERS_LIBRARY.get(n, [])} for n in top_needs],
        "recommendedResponses": [{"need": n, "response": behavior_service.RECOMMENDED_RESPONSES.get(n, "")} for n in top_needs],
        "whatToAvoid": [{"need": n, "avoid": behavior_service.WHAT_NOT_TO_DO.get(n, "")} for n in top_needs],
        "accuracy": prediction_service.get_prediction_accuracy(db, child.id),
        **passport_extra,
        "generatedAt": now_iso(),
    }


# ---------------- Public Share Lookup ----------------

@router.get("/share/{token}", response_model=schemas.CommunicationPassportOut)
def get_shared_passport(token: str, db: Session = Depends(get_db)):
    link = db.query(models.ShareLink).filter(models.ShareLink.token == token).first()
    if not link or not link.active:
        raise HTTPException(status_code=404, detail="Link not found or revoked")

    child = db.query(models.Child).filter(models.Child.id == link.childId).first()
    if not child:
        raise HTTPException(status_code=404, detail="Profile unavailable")

    return _build_passport_payload(db, child)


@router.post("/share/{token}/revoke")
def revoke_share_link(token: str, db: Session = Depends(get_db)):
    link = db.query(models.ShareLink).filter(models.ShareLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    link.active = False
    db.commit()
    return {"success": True, "token": token, "active": False}


# ---------------- Demo Mode ----------------

@router.get("/demo-mode", response_model=schemas.DemoModeOut)
def get_demo_mode(db: Session = Depends(get_db)):
    row = db.query(models.DemoMode).first()
    return {"enabled": bool(row.enabled) if row else False}


@router.put("/demo-mode", response_model=schemas.DemoModeOut)
def set_demo_mode(payload: schemas.DemoModeIn, db: Session = Depends(get_db)):
    row = db.query(models.DemoMode).first()
    if not row:
        row = models.DemoMode(id=1, enabled=payload.enabled)
        db.add(row)
    else:
        row.enabled = payload.enabled
    db.commit()
    return {"enabled": payload.enabled}


# ---------------- Auto Demo Tick ----------------

DEMO_BEHAVIOR_LIBRARY = [
    {"behaviorLabel": "Door Approach", "need": "Want To Leave Room"},
    {"behaviorLabel": "Door Handle Interaction", "need": "Want To Leave Room"},
    {"behaviorLabel": "Exit Fixation", "need": "Want To Leave Room"},
    {"behaviorLabel": "Bottle Fixation", "need": "Thirst"},
    {"behaviorLabel": "Reaching Toward Cup", "need": "Thirst"},
    {"behaviorLabel": "Lip Licking", "need": "Thirst"},
    {"behaviorLabel": "Hand Flapping Near Tray", "need": "Hunger"},
    {"behaviorLabel": "Looking At Food Cart", "need": "Hunger"},
    {"behaviorLabel": "Ear Covering", "need": "Sensory Overload"},
    {"behaviorLabel": "Head Turning Away", "need": "Sensory Overload"},
    {"behaviorLabel": "Body Rocking", "need": "Sensory Overload"},
    {"behaviorLabel": "Leg Crossing And Fidgeting", "need": "Toilet Need"},
    {"behaviorLabel": "Shifting Weight", "need": "Toilet Need"},
    {"behaviorLabel": "Rocking In Place", "need": "Anxiety"},
    {"behaviorLabel": "Avoiding Eye Contact", "need": "Anxiety"},
    {"behaviorLabel": "Repeated Shirt Pulling", "need": "Discomfort"},
    {"behaviorLabel": "Tugging At Collar", "need": "Discomfort"},
    {"behaviorLabel": "Wincing", "need": "Pain"},
    {"behaviorLabel": "Guarding A Body Part", "need": "Pain"},
]

CONFIDENCE_WEIGHTED = ["Certain", "Certain", "Likely", "Likely", "Likely", "Unsure"]


@router.post("/demo-mode/tick")
def run_auto_demo_tick(db: Session = Depends(get_db)):
    children = db.query(models.Child).all()
    if not children:
        return []

    child = random.choice(children)
    lib = random.choice(DEMO_BEHAVIOR_LIBRARY)
    confidence = random.choice(CONFIDENCE_WEIGHTED)

    behavior = models.Behavior(
        childId=child.id,
        childName=child.name,
        behaviorLabel=lib["behaviorLabel"],
        need=lib["need"],
        confidence=confidence,
        notes="Auto-generated demo observation.",
        videoName=f"{child.name.lower().replace(' ', '_')}_demo_{int(datetime.now().timestamp())}.mp4",
        timestamp=now_iso(),
    )
    db.add(behavior)
    db.commit()
    db.refresh(behavior)

    prediction = prediction_service.log_prediction(
        db,
        child_id=child.id,
        child_name=child.name,
        predicted_need=lib["need"],
        confidence_score=behavior_service.confidence_to_score(confidence),
        source_behaviors=[lib["behaviorLabel"]],
    )

    roll = random.random()
    if roll < 0.82:
        prediction_service.resolve_prediction(db, prediction.id, "confirmed")
    elif roll < 0.95:
        corrected = random.choice(behavior_service.NEED_CATEGORIES)
        prediction_service.resolve_prediction(db, prediction.id, "corrected", corrected)
    # else: leave pending

    return [_behavior_out(behavior)]
