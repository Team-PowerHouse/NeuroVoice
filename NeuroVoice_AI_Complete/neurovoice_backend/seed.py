# ============================================================
# seed.py
#
# Ports seedDemoDataIfEmpty() from src/utils/storage.js so the
# backend's first-load experience matches the frontend exactly:
# two example children (Ram Iyer, Meera Nair) with realistic
# behavior histories, resolved predictions, and passport extras,
# so the dashboard is never empty on first run.
# ============================================================

import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

import models
from services import behavior_service, prediction_service


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


SUPPORT_LEVELS = [
    "Level 1 — Requiring Support",
    "Level 2 — Requiring Substantial Support",
    "Level 3 — Requiring Very Substantial Support",
]


def seed_demo_data_if_empty(db: Session) -> None:
    if db.query(models.Child).count() > 0:
        return

    ram = models.Child(
        name="Ram Iyer",
        age=7,
        gender="Male",
        supportLevel=SUPPORT_LEVELS[2],
        caregiver="Priya Iyer (Mother)",
        createdAt=now_iso(),
    )
    meera = models.Child(
        name="Meera Nair",
        age=5,
        gender="Female",
        supportLevel=SUPPORT_LEVELS[1],
        caregiver="Anand Nair (Father)",
        createdAt=now_iso(),
    )
    db.add(ram)
    db.add(meera)
    db.commit()
    db.refresh(ram)
    db.refresh(meera)

    seed_samples = [
        dict(childId=ram.id, childName=ram.name, behaviorLabel="Door Approach", need="Want To Leave Room",
             notes="Walks toward door repeatedly, glances back at caregiver.",
             videoName="ram_door_approach_01.mp4", confidence="Certain"),
        dict(childId=ram.id, childName=ram.name, behaviorLabel="Door Handle Interaction", need="Want To Leave Room",
             notes="Touches and rattles the door handle.",
             videoName="ram_door_handle_02.mp4", confidence="Certain"),
        dict(childId=ram.id, childName=ram.name, behaviorLabel="Bottle Fixation", need="Thirst",
             notes="Stares at and reaches toward water bottle on the table.",
             videoName="ram_bottle_fixation_01.mp4", confidence="Likely"),
        dict(childId=ram.id, childName=ram.name, behaviorLabel="Ear Covering", need="Sensory Overload",
             notes="Covers both ears tightly during loud hallway announcements.",
             videoName="ram_ear_covering_01.mp4", confidence="Certain"),
        dict(childId=ram.id, childName=ram.name, behaviorLabel="Repeated Shirt Pulling", need="Discomfort",
             notes="Tugs at collar repeatedly after IV placement.",
             videoName="ram_shirt_pulling_01.mp4", confidence="Unsure"),
        dict(childId=meera.id, childName=meera.name, behaviorLabel="Hand Flapping Near Tray", need="Hunger",
             notes="Rapid hand flapping while looking at the food tray cart.",
             videoName="meera_hand_flap_01.mp4", confidence="Likely"),
        dict(childId=meera.id, childName=meera.name, behaviorLabel="Leg Crossing And Fidgeting", need="Toilet Need",
             notes="Crosses legs and shifts weight repeatedly.",
             videoName="meera_leg_fidget_01.mp4", confidence="Certain"),
        dict(childId=meera.id, childName=meera.name, behaviorLabel="Rocking In Place", need="Anxiety",
             notes="Rocks back and forth before unfamiliar staff enter the room.",
             videoName="meera_rocking_01.mp4", confidence="Likely"),
    ]

    for s in seed_samples:
        db.add(models.Behavior(timestamp=now_iso(), **s))
    db.commit()

    seed_predictions = [
        dict(childId=ram.id, childName=ram.name, predictedNeed="Want To Leave Room", confidenceScore=91,
             sourceBehaviors=["Door Approach"], status="confirmed"),
        dict(childId=ram.id, childName=ram.name, predictedNeed="Thirst", confidenceScore=76,
             sourceBehaviors=["Bottle Fixation"], status="confirmed"),
        dict(childId=ram.id, childName=ram.name, predictedNeed="Sensory Overload", confidenceScore=88,
             sourceBehaviors=["Ear Covering"], status="confirmed"),
        dict(childId=ram.id, childName=ram.name, predictedNeed="Discomfort", confidenceScore=54,
             sourceBehaviors=["Repeated Shirt Pulling"], status="corrected", correctedNeed="Pain"),
        dict(childId=ram.id, childName=ram.name, predictedNeed="Want To Leave Room", confidenceScore=93,
             sourceBehaviors=["Door Handle Interaction"], status="confirmed"),
        dict(childId=meera.id, childName=meera.name, predictedNeed="Hunger", confidenceScore=79,
             sourceBehaviors=["Hand Flapping Near Tray"], status="confirmed"),
        dict(childId=meera.id, childName=meera.name, predictedNeed="Toilet Need", confidenceScore=87,
             sourceBehaviors=["Leg Crossing And Fidgeting"], status="confirmed"),
        dict(childId=meera.id, childName=meera.name, predictedNeed="Anxiety", confidenceScore=68,
             sourceBehaviors=["Rocking In Place"], status="confirmed"),
        dict(childId=meera.id, childName=meera.name, predictedNeed="Hunger", confidenceScore=61,
             sourceBehaviors=["Hand Flapping Near Tray"], status="corrected", correctedNeed="Sensory Overload"),
    ]

    for p in seed_predictions:
        entry = prediction_service.log_prediction(
            db,
            child_id=p["childId"],
            child_name=p["childName"],
            predicted_need=p["predictedNeed"],
            confidence_score=p["confidenceScore"],
            source_behaviors=p["sourceBehaviors"],
        )
        if p["status"] != "pending":
            prediction_service.resolve_prediction(
                db, entry.id, p["status"], p.get("correctedNeed")
            )

    # Passport extras
    ram_passport = models.Passport(
        childId=ram.id,
        emergencyNotes=(
            "Ram becomes distressed by sudden loud noises and unfamiliar staff approaching quickly. "
            "Allow him to see new people before they get close. He responds well to a 10-second verbal "
            "warning before any physical contact (e.g. blood pressure cuff)."
        ),
        medicalAlerts="No known drug allergies. Mild sensory sensitivity to adhesive bandages — use paper tape only.",
        comfortItems="Small blue fidget cube (always in left pocket). Noise-cancelling headphones in backpack.",
        customTriggers=json.dumps(["Sudden loud intercom announcements", "Being approached from behind"]),
        lastUpdated=now_iso(),
    )
    meera_passport = models.Passport(
        childId=meera.id,
        emergencyNotes=(
            "Meera communicates 'I need the bathroom' through leg-crossing and weight shifting — please "
            "respond within 2 minutes to avoid escalation. She does not make eye contact when anxious; "
            "this is not a sign of non-cooperation."
        ),
        medicalAlerts="Mild lactose sensitivity — confirm before offering dairy-based snacks.",
        comfortItems="Soft elephant toy. Prefers dim lighting when possible.",
        customTriggers=json.dumps(["New staff entering without introduction", "Bright overhead lighting"]),
        lastUpdated=now_iso(),
    )
    db.add(ram_passport)
    db.add(meera_passport)
    db.commit()
