# ============================================================
# services/behavior_service.py
#
# Derived-intelligence helpers ported 1:1 from the frontend's
# src/utils/storage.js so the backend produces identical numbers
# (confidence scores, dataset readiness, dictionary grouping,
# analytics aggregations) to what the app already shows today.
# ============================================================

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from models import Behavior

# Mirrors CONFIDENCE_SCORE in storage.js
CONFIDENCE_SCORE = {"Certain": 95, "Likely": 72, "Unsure": 42}

# Mirrors NEED_CATEGORIES in storage.js
NEED_CATEGORIES = [
    "Want To Leave Room",
    "Thirst",
    "Hunger",
    "Pain",
    "Sensory Overload",
    "Toilet Need",
    "Anxiety",
    "Discomfort",
    "Other",
]

CONFIDENCE_LEVELS = ["Certain", "Likely", "Unsure"]

# Mirrors NEED_SPEECH_OUTPUT
NEED_SPEECH_OUTPUT = {
    "Want To Leave Room": "I would like to leave this room.",
    "Thirst": "I am thirsty. I would like something to drink.",
    "Hunger": "I am hungry. I would like something to eat.",
    "Pain": "I am in pain. I need help right now.",
    "Sensory Overload": "This space feels like too much for me right now.",
    "Toilet Need": "I need to use the bathroom.",
    "Anxiety": "I am feeling anxious. I need some support.",
    "Discomfort": "Something is uncomfortable. I need help adjusting it.",
    "Other": "I am trying to tell you something important.",
}

# Mirrors RECOMMENDED_RESPONSES
RECOMMENDED_RESPONSES = {
    "Want To Leave Room": "Calmly guide the child toward the door or a quieter space. Avoid blocking the exit.",
    "Thirst": "Offer water or the child's preferred drink in their usual cup.",
    "Hunger": "Offer a small, familiar snack. Avoid introducing new foods during distress.",
    "Pain": "Check for visible injury or illness immediately and notify the attending clinician.",
    "Sensory Overload": "Dim lights, lower noise, and offer noise-cancelling headphones or a calm-down space.",
    "Toilet Need": "Escort to the restroom promptly using the child's established routine.",
    "Anxiety": "Use a calm, low voice. Offer a known comfort item and reduce surrounding stimulation.",
    "Discomfort": "Check clothing, positioning, medical equipment, or temperature for the source of discomfort.",
    "Other": "Observe closely and consult the caregiver's behavior dictionary for similar past patterns.",
}

# Mirrors WHAT_NOT_TO_DO
WHAT_NOT_TO_DO = {
    "Want To Leave Room": "Do not physically restrain or raise your voice — this can escalate distress.",
    "Thirst": "Do not assume the request is for food or attention.",
    "Hunger": "Do not delay feeding for long periods; this can intensify behaviors.",
    "Pain": "Do not dismiss the behavior as 'just a habit' — rule out a medical cause first.",
    "Sensory Overload": "Do not add more stimulation (bright lights, loud announcements, crowding).",
    "Toilet Need": "Do not ask the child to wait without escorting them — this can cause distress or accidents.",
    "Anxiety": "Do not force eye contact or rapid-fire questions.",
    "Discomfort": "Do not ignore repeated tugging or fidgeting as 'just a tic' without checking the cause.",
    "Other": "Do not guess and act without checking the caregiver's notes first.",
}

# Mirrors KNOWN_TRIGGERS_LIBRARY
KNOWN_TRIGGERS_LIBRARY = {
    "Want To Leave Room": ["Crowded waiting areas", "Unfamiliar staff entering", "Long wait times"],
    "Thirst": ["Warm room temperature", "Extended time since last drink"],
    "Hunger": ["Missed or delayed meal times", "Sight or smell of food carts"],
    "Pain": ["Recent procedure or injection site", "Pressure on a sensitive area"],
    "Sensory Overload": ["Loud intercom announcements", "Fluorescent lighting", "Crowded hallways", "Beeping medical equipment"],
    "Toilet Need": ["Extended appointments without breaks"],
    "Anxiety": ["New or unfamiliar staff", "Unexpected schedule changes", "Loud or sudden noises"],
    "Discomfort": ["Medical equipment (IV, monitor leads)", "Tags or seams on hospital gowns"],
    "Other": [],
}


def confidence_to_score(level: str) -> int:
    return CONFIDENCE_SCORE.get(level, 50)


def score_to_confidence_class(score: int) -> str:
    if score >= 85:
        return "confidence-certain"
    if score >= 60:
        return "confidence-likely"
    return "confidence-unsure"


def get_most_common_need(behaviors: List[Behavior]) -> Optional[str]:
    if not behaviors:
        return None
    counts = defaultdict(int)
    for b in behaviors:
        counts[b.need] += 1
    return sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[0][0]


def get_dataset_readiness(behaviors: List[Behavior]) -> int:
    """Climbs toward 100% as samples accumulate (target = 60 samples)."""
    target = 60
    return min(100, round((len(behaviors) / target) * 100))


def get_average_confidence(behaviors: List[Behavior]) -> int:
    if not behaviors:
        return 0
    total = sum(confidence_to_score(b.confidence) for b in behaviors)
    return round(total / len(behaviors))


def build_behavior_dictionary(db: Session, child_id: str) -> list[dict]:
    """Groups a child's behavior samples into dictionary entries:
    behaviorLabel + need -> aggregated confidence, sample count, examples.
    Mirrors buildBehaviorDictionary() in storage.js exactly.
    """
    behaviors = (
        db.query(Behavior)
        .filter(Behavior.childId == child_id)
        .order_by(Behavior.timestamp.desc())
        .all()
    )

    groups: dict[str, dict] = {}
    for b in behaviors:
        label = (b.behaviorLabel or "Unlabeled Pattern").strip()
        key = f"{label}::{b.need}"
        if key not in groups:
            groups[key] = {"behaviorLabel": label, "need": b.need, "samples": []}
        groups[key]["samples"].append(b)

    result = []
    for g in groups.values():
        samples = g["samples"]
        avg_score = round(
            sum(confidence_to_score(s.confidence) for s in samples) / len(samples)
        )
        result.append(
            {
                "behaviorLabel": g["behaviorLabel"],
                "need": g["need"],
                "sampleCount": len(samples),
                "avgConfidenceScore": avg_score,
                "latestExamples": samples[:3],
            }
        )

    result.sort(key=lambda e: e["sampleCount"], reverse=True)
    return result


def get_need_frequency(db: Session, child_id: Optional[str] = None) -> list[dict]:
    q = db.query(Behavior)
    if child_id:
        q = q.filter(Behavior.childId == child_id)
    counts = defaultdict(int)
    for b in q.all():
        counts[b.need] += 1
    return sorted(
        ({"need": n, "count": c} for n, c in counts.items()),
        key=lambda e: e["count"],
        reverse=True,
    )


def get_behavior_timeline(db: Session, child_id: Optional[str] = None, days: int = 14) -> list[dict]:
    q = db.query(Behavior)
    if child_id:
        q = q.filter(Behavior.childId == child_id)
    behaviors = q.all()

    now = datetime.now(timezone.utc)
    buckets: dict[str, int] = {}
    order: list[str] = []
    for i in range(days - 1, -1, -1):
        d = now - timedelta(days=i)
        key = d.strftime("%b %-d") if hasattr(d, "strftime") else str(d.date())
        try:
            key = d.strftime("%b %-d")
        except ValueError:
            key = d.strftime("%b %d").replace(" 0", " ")
        buckets[key] = 0
        order.append(key)

    for b in behaviors:
        try:
            ts = datetime.fromisoformat(b.timestamp.replace("Z", "+00:00"))
        except Exception:
            continue
        try:
            key = ts.strftime("%b %-d")
        except ValueError:
            key = ts.strftime("%b %d").replace(" 0", " ")
        if key in buckets:
            buckets[key] += 1

    return [{"date": k, "count": buckets[k]} for k in order]


def get_confidence_distribution(db: Session, child_id: Optional[str] = None) -> list[dict]:
    q = db.query(Behavior)
    if child_id:
        q = q.filter(Behavior.childId == child_id)
    counts = {"Certain": 0, "Likely": 0, "Unsure": 0}
    for b in q.all():
        if b.confidence in counts:
            counts[b.confidence] += 1
    return [{"level": lvl, "count": c} for lvl, c in counts.items()]
