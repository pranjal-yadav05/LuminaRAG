"""
cloudinary_storage.py
=====================
Thin wrapper around the Cloudinary API for all persistent storage.

Three resource types are managed:
  • PDFs        — resource_type="raw",  folder pdfs/<user_id>/<file_id>/
  • Embeddings  — resource_type="raw",  folder embeddings/<user_id>/<file_id>/
  • Images      — resource_type="image",folder images/<user_id>/<file_id>/

Public API
----------
    upload_pdf(user_id, file_id, file_bytes)        -> secure_url
    download_pdf(user_id, file_id)                  -> bytes | None
    delete_pdf(user_id, file_id)

    upload_embeddings(user_id, file_id, data_bytes) -> secure_url
    download_embeddings(user_id, file_id)           -> bytes | None
    delete_embeddings(user_id, file_id)

    upload_image(user_id, file_id, page, img_bytes) -> secure_url
    delete_images_for_file(user_id, file_id)

All functions are synchronous (Cloudinary SDK is sync).
Async callers should run them in a thread pool (see asyncio.to_thread).
"""

import io
import os

import cloudinary
import cloudinary.api
import cloudinary.uploader
import requests
from dotenv import load_dotenv

load_dotenv()

# ── SDK configuration ─────────────────────────────────────────────────────────
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)


# ── internal helpers ──────────────────────────────────────────────────────────

def _pdf_public_id(user_id: str, file_id: str) -> str:
    return f"pdfs/{user_id}/{file_id}/original"


def _embeddings_public_id(user_id: str, file_id: str) -> str:
    return f"embeddings/{user_id}/{file_id}/embeddings"


def _image_public_id(user_id: str, file_id: str, page: int) -> str:
    return f"images/{user_id}/{file_id}/page_{page}"


def _download_bytes(url: str) -> bytes:
    """Fetch a Cloudinary secure_url and return raw bytes."""
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.content


# ── PDFs ──────────────────────────────────────────────────────────────────────

def upload_pdf(user_id: str, file_id: str, file_bytes: bytes) -> str:
    """Upload PDF bytes to Cloudinary. Returns the secure URL."""
    result = cloudinary.uploader.upload(
        file_bytes,
        public_id=_pdf_public_id(user_id, file_id),
        resource_type="raw",
        overwrite=True,
    )
    return result["secure_url"]


def download_pdf(user_id: str, file_id: str) -> bytes | None:
    """Download PDF bytes from Cloudinary. Returns None if not found."""
    try:
        info = cloudinary.api.resource(
            _pdf_public_id(user_id, file_id),
            resource_type="raw",
        )
        return _download_bytes(info["secure_url"])
    except cloudinary.exceptions.NotFound:
        return None


def delete_pdf(user_id: str, file_id: str) -> None:
    """Delete the PDF from Cloudinary (silent if missing)."""
    try:
        cloudinary.uploader.destroy(
            _pdf_public_id(user_id, file_id),
            resource_type="raw",
        )
    except cloudinary.exceptions.NotFound:
        pass


# ── Embeddings ────────────────────────────────────────────────────────────────

def upload_embeddings(user_id: str, file_id: str, data_bytes: bytes) -> str:
    """Upload serialised embeddings (pickle bytes) to Cloudinary."""
    result = cloudinary.uploader.upload(
        data_bytes,
        public_id=_embeddings_public_id(user_id, file_id),
        resource_type="raw",
        overwrite=True,
    )
    return result["secure_url"]


def download_embeddings(user_id: str, file_id: str) -> bytes | None:
    """Download embeddings bytes. Returns None if not found."""
    try:
        info = cloudinary.api.resource(
            _embeddings_public_id(user_id, file_id),
            resource_type="raw",
        )
        return _download_bytes(info["secure_url"])
    except cloudinary.exceptions.NotFound:
        return None


def delete_embeddings(user_id: str, file_id: str) -> None:
    try:
        cloudinary.uploader.destroy(
            _embeddings_public_id(user_id, file_id),
            resource_type="raw",
        )
    except cloudinary.exceptions.NotFound:
        pass


# ── Images ────────────────────────────────────────────────────────────────────

def upload_image(user_id: str, file_id: str, page: int, img_bytes: bytes) -> str:
    """
    Upload a highlighted page PNG to Cloudinary.
    Returns the secure URL (used directly in API responses).
    """
    result = cloudinary.uploader.upload(
        img_bytes,
        public_id=_image_public_id(user_id, file_id, page),
        resource_type="image",
        overwrite=True,
        format="png",
    )
    return result["secure_url"]


def delete_images_for_file(user_id: str, file_id: str) -> None:
    """
    Delete all page images for a file.
    Uses the Admin API to list then bulk-delete by prefix.
    """
    prefix = f"images/{user_id}/{file_id}/"
    try:
        # delete_resources_by_prefix works on the free plan
        cloudinary.api.delete_resources_by_prefix(prefix, resource_type="image")
    except Exception:
        pass  # best-effort; log in production