# ============================================================
# services/ai_engine.py
# NeuroVoice AI — Personalized Behavioral Intelligence Engine
#
# Algorithm: Frequency-weighted need scoring across a child's
# historical behavior-to-need mappings. Fully explainable,
# transparent, and caregiver-grounded.
# No LLMs. No black boxes. No external APIs.
# ============================================================

from collections import defaultdict
from typing import List, Optional

from sqlalchemy.orm import Session

from models import Behavior
from services.behavior_service import confidence_to_score


def predict_need_from_frames(
    db: Session,
    child_id: str,
    frame_window: List[str],
) -> dict:
    """
    Given a window of behavior labels observed in the camera feed,
    predict the most likely need using the child's historical
    behavior-to-need frequency table.

    Algorithm:
      1. Load all labeled behaviors for this child from SQLite.
      2. For each behavior label in frame_window, count how many
         times it was historically mapped to each need category.
         Weight each match by the caregiver's confidence level
         (Certain=95, Likely=72, Unsure=42).
      3. Accumulate weighted scores per need across all behaviors
         in the frame window.
      4. The need with the highest accumulated score wins.
      5. Confidence = winner_score / total_score * 100.

    Returns:
      {
        "predictedNeed":  str,
        "confidenceScore": int (0–100),
        "sourceBehaviors": list[str],
        "reasoning": list[str],
      }
    """
    if not frame_window:
        return _no_data_response(frame_window)

    # Load all historical behavior entries for this child
    history: List[Behavior] = (
        db.query(Behavior)
        .filter(Behavior.childId == child_id)
        .all()
    )

    if not history:
        return _no_data_response(frame_window)

    # Build lookup: behaviorLabel -> {need -> weighted_count}
    label_need_weights: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    label_need_raw: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for entry in history:
        label = (entry.behaviorLabel or "").strip()
        need = entry.need
        weight = confidence_to_score(entry.confidence)
        label_need_weights[label][need] += weight
        label_need_raw[label][need] += 1

    # Accumulate scores per need across the entire frame window
    need_scores: dict[str, float] = defaultdict(float)
    reasoning: list[str] = []
    matched_labels: list[str] = []

    for label in frame_window:
        label = label.strip()
        if label not in label_need_weights:
            continue
        matched_labels.append(label)
        label_scores = label_need_weights[label]
        for need, score in label_scores.items():
            need_scores[need] += score

        # Build reasoning entry
        raw_counts = label_need_raw[label]
        dominant_need = max(raw_counts, key=lambda n: raw_counts[n])
        dominant_count = raw_counts[dominant_need]
        reasoning.append(
            f"{label} matched {dominant_count} historical example"
            f"{'s' if dominant_count != 1 else ''} "
            f"(most common → {dominant_need})"
        )

    if not need_scores:
        return _no_data_response(frame_window)

    # Pick winner
    total_score = sum(need_scores.values())
    predicted_need = max(need_scores, key=lambda n: need_scores[n])
    winner_score = need_scores[predicted_need]
    confidence_score = round((winner_score / total_score) * 100) if total_score > 0 else 0
    confidence_score = max(1, min(100, confidence_score))

    return {
        "predictedNeed": predicted_need,
        "confidenceScore": confidence_score,
        "sourceBehaviors": matched_labels if matched_labels else frame_window[-1:],
        "reasoning": reasoning if reasoning else [
            f"No historical match found for: {', '.join(frame_window)}"
        ],
    }


def _no_data_response(frame_window: List[str]) -> dict:
    return {
        "predictedNeed": "Other",
        "confidenceScore": 40,
        "sourceBehaviors": frame_window[-1:] if frame_window else [],
        "reasoning": [
            "No historical behavior data found for this child. "
            "Upload labeled behavior samples to improve prediction accuracy."
        ],
    }
