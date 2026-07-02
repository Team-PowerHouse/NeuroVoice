# ============================================================
# app.py
# NeuroVoice AI — FastAPI backend entrypoint.
#
# Run with:
#   pip install -r requirements.txt
#   uvicorn app:app --reload
#
# Docs at /docs (Swagger) and /redoc.
# All resource routes are mounted under /api to match the
# frontend's API_BASE_URL = "http://localhost:8000/api"
# (see src/services/api.js).
# ============================================================

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine, SessionLocal
import models
from routers import children, behaviors, predictions, uploads, system, analytics, passport_pdf
from seed import seed_demo_data_if_empty

# Create tables on startup (SQLite file: neurovoice.db)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NeuroVoice AI Backend",
    description="Personalized Behavioral Communication Assistant for Non-Verbal Autistic Children.",
    version="1.0.0",
)

# ---------------- CORS ----------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://neuro-voice-three.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Static file serving for uploaded videos ----------------

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ---------------- Routers (mounted under /api) ----------------

app.include_router(children.router, prefix="/api")
app.include_router(behaviors.router, prefix="/api")
app.include_router(predictions.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(system.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(passport_pdf.router, prefix="/api")


# ---------------- Health Check ----------------

@app.get("/")
def health_check():
    return {"message": "NeuroVoice AI Backend Running"}


# ---------------- Startup: seed demo data if DB is empty ----------------

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed_demo_data_if_empty(db)
    finally:
        db.close()
