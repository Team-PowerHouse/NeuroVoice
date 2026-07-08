# ============================================================
# routers/uploads.py
#
# POST /api/upload-video
# Accepts mp4 / mov / avi, stores in uploads/, returns a video URL.
# Standalone endpoint (independent of a specific behavior record) —
# useful for upload-then-attach flows, or any future caller that
# just needs a hosted video URL back.
# ============================================================

import os
import uuid

from fastapi import APIRouter, HTTPException, UploadFile, File

router = APIRouter(tags=["uploads"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}


@router.post("/upload-video")
async def upload_video(video: UploadFile = File(...)):
    if not video.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = os.path.splitext(video.filename)[1].lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format '{ext}'. Allowed: mp4, mov, avi.",
        )

    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, stored_name)

    with open(dest_path, "wb") as out_file:
        content = await video.read()
        out_file.write(content)

    return {
        "videoName": video.filename,
        "videoUrl": f"/uploads/{stored_name}",
    }
