# ============================================================
# models.py
# SQLAlchemy ORM models.
#
# Field names mirror src/utils/storage.js EXACTLY (camelCase
# stored as-is) because that is the real, currently-running
# data contract the React frontend was built against — every
# page (AddChild, ChildDetail, Dashboard, Analytics, Timeline,
# BehaviorDictionary, LiveMonitoring, CommunicationPassport,
# HospitalShareView, Settings, UploadBehavior, BehaviorHistory)
# imports directly from utils/storage.js, not services/api.js.
#
# IDs are strings to match storage.js's uid() generator
# (Date.now().toString(36) + random), so existing localStorage
# data / frontend assumptions about id shape keep working.
# ============================================================

import uuid

from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


def gen_id() -> str:
    return uuid.uuid4().hex[:16]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Child(Base):
    __tablename__ = "children"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    supportLevel = Column(String, nullable=False)
    caregiver = Column(String, nullable=False)
    createdAt = Column(String, default=now_iso)

    behaviors = relationship("Behavior", back_populates="child", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="child", cascade="all, delete-orphan")
    passport = relationship("Passport", back_populates="child", uselist=False, cascade="all, delete-orphan")
    share_links = relationship("ShareLink", back_populates="child", cascade="all, delete-orphan")


class Behavior(Base):
    __tablename__ = "behaviors"

    id = Column(String, primary_key=True, default=gen_id)
    childId = Column(String, ForeignKey("children.id"), nullable=False, index=True)
    childName = Column(String, nullable=False)
    behaviorLabel = Column(String, nullable=False)
    need = Column(String, nullable=False)
    confidence = Column(String, nullable=False)  # Certain | Likely | Unsure
    notes = Column(Text, default="")
    videoName = Column(String, default="")
    videoUrl = Column(String, nullable=True)  # set if an actual file was uploaded via /upload-video
    timestamp = Column(String, default=now_iso)

    child = relationship("Child", back_populates="behaviors")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String, primary_key=True, default=gen_id)
    childId = Column(String, ForeignKey("children.id"), nullable=False, index=True)
    childName = Column(String, nullable=False)
    predictedNeed = Column(String, nullable=False)
    confidenceScore = Column(Integer, nullable=False)
    sourceBehaviors = Column(Text, default="[]")  # JSON-encoded list[str]
    status = Column(String, default="pending")  # pending | confirmed | corrected
    correctedNeed = Column(String, nullable=True)
    timestamp = Column(String, default=now_iso)
    resolvedAt = Column(String, nullable=True)

    child = relationship("Child", back_populates="predictions")


class Passport(Base):
    """Caregiver-authored extras layered onto the auto-built Communication Passport."""
    __tablename__ = "passports"

    childId = Column(String, ForeignKey("children.id"), primary_key=True)
    emergencyNotes = Column(Text, default="")
    medicalAlerts = Column(Text, default="")
    comfortItems = Column(Text, default="")
    customTriggers = Column(Text, default="[]")  # JSON-encoded list[str]
    lastUpdated = Column(String, nullable=True)

    child = relationship("Child", back_populates="passport")


class ShareLink(Base):
    __tablename__ = "share_links"

    token = Column(String, primary_key=True, default=lambda: gen_id() + gen_id())
    childId = Column(String, ForeignKey("children.id"), nullable=False, index=True)
    recipient = Column(String, default="Hospital Staff")
    createdAt = Column(String, default=now_iso)
    active = Column(Boolean, default=True)

    child = relationship("Child", back_populates="share_links")


class DemoMode(Base):
    """Single-row table holding the global demo mode flag (mirrors a localStorage boolean)."""
    __tablename__ = "demo_mode"

    id = Column(Integer, primary_key=True, default=1)
    enabled = Column(Boolean, default=False)
