"""
rag.py
======
Embedding creation, storage, retrieval, and answer generation.

Storage backend: Cloudinary (raw for embeddings/PDFs, image for page PNGs).
Local disk is used only as a short-lived temp buffer during a single request.
All persistent I/O goes through cloudinary_storage.
"""

import io
import os
import pickle
import re
import json
import tempfile

import numpy as np
from dotenv import load_dotenv
from openai import OpenAI

from cloudinary_storage import (
    delete_embeddings,
    download_embeddings,
    download_pdf,
    upload_embeddings,
    upload_image,
)
from pdf_utils import get_pdf_image_from_bytes

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

EMBEDDING_MODEL = "text-embedding-3-small"


# ── helpers ───────────────────────────────────────────────────────────────────

def normalize_tokens(text: str) -> list[str]:
    return text.replace("\n", " ").split()


def parse_llm_response(raw: str) -> dict:
    try:
        match = re.search(r'\{[\s\S]*\}', raw)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return {"answer": raw, "highlights": []}


# ── embeddings persistence (Cloudinary-backed) ────────────────────────────────

def save_embeddings(user_id: str, file_id: str, data: dict) -> None:
    """
    Serialise chunks + embeddings with pickle and upload to Cloudinary.
    Keyed by (user_id, file_id) — no local file is kept after upload.
    """
    payload = {
        "user_id":    user_id,
        "file_id":    file_id,
        "chunks":     data["chunks"],
        "embeddings": data["embeddings"],
    }
    data_bytes = pickle.dumps(payload)
    upload_embeddings(user_id, file_id, data_bytes)


def load_embeddings(user_id: str, file_id: str) -> dict | None:
    """
    Download embeddings from Cloudinary and deserialise.
    Returns None if not found.
    Includes ownership safety check so data can never cross user boundaries.
    """
    data_bytes = download_embeddings(user_id, file_id)
    if data_bytes is None:
        return None

    data = pickle.loads(data_bytes)

    # Defensive: reject if ownership metadata doesn't match
    if data.get("user_id") != user_id or data.get("file_id") != file_id:
        return None

    return data


# ── embedding creation ────────────────────────────────────────────────────────

def create_embeddings(chunks: list[dict]) -> list[dict]:
    texts    = [c["text"] for c in chunks]
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)

    return [
        {
            "chunk_id":    i,
            "text":        chunks[i]["text"],
            "page_number": chunks[i]["page_number"],
            "words":       chunks[i].get("words"),
            "embedding":   response.data[i].embedding,
        }
        for i in range(len(chunks))
    ]


# ── retrieval ─────────────────────────────────────────────────────────────────

def cosine_similarity(a, b) -> float:
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


def retrieve_top_chunks(
    query_embedding: list[float],
    chunk_embeddings: list[dict],
    top_k: int = 5,
) -> list[tuple]:
    """Returns list of (score, text, page_number, words)."""
    scored = [
        (
            cosine_similarity(query_embedding, item["embedding"]),
            item["text"],
            item["page_number"],
            item.get("words"),
        )
        for item in chunk_embeddings
    ]
    scored.sort(reverse=True, key=lambda x: x[0])
    return scored[:top_k]


# ── generation ────────────────────────────────────────────────────────────────

def generate_answer(query: str, context: str, history: list | None = None) -> str:
    system_prompt = """
You are a helpful assistant answering questions from a document.

Return ONLY valid JSON in this exact format:
{
  "answer": "...",
  "highlights": [
    {
      "text": "EXACT substring copied character-for-character from context",
      "page": <number>,
      "type": "direct" | "evidence"
    }
  ]
}

RULES:
- For list questions (e.g. "What are the X commandments/rules/steps?"),
  your answer must include ALL items in the list, written out fully.
- "direct"   = sentence/passage that directly answers the question.
- "evidence" = supporting context when no direct answer exists.
- Copy highlight text EXACTLY from context — no rephrasing, no added words.
- You may include multiple highlights from different pages.
- If the answer spans multiple passages, synthesize them into one complete answer.
- Never give a one-fragment answer when the question asks for a complete list.
"""

    messages = [{"role": "system", "content": system_prompt}]

    if history:
        for turn in history[-4:]:   # last 2 exchanges
            messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({
        "role": "user",
        "content": f"Context:\n{context}\n\nQuestion: {query}",
    })

    response = client.chat.completions.create(
        model="openai/gpt-4o-mini",
        messages=messages,
    )
    return response.choices[0].message.content


# ── main RAG pipeline ─────────────────────────────────────────────────────────

def answer_from_chunks(
    query: str,
    chunk_embeddings: list[dict],
    user_id: str,
    file_id: str,
    history: list | None = None,
) -> tuple[str, list, list]:
    """
    Returns (answer, highlights, images).
    PDF bytes are fetched from Cloudinary only when highlight images are needed.
    """
    query_emb = client.embeddings.create(
        model=EMBEDDING_MODEL, input=query
    ).data[0].embedding

    top_chunks = retrieve_top_chunks(query_emb, chunk_embeddings, top_k=5)

    context = "\n\n".join(
        f"[Page {page}]\n{chunk}"
        for _, chunk, page, _ in top_chunks
    )

    raw    = generate_answer(query, context, history=history)
    parsed = parse_llm_response(raw)

    answer     = parsed["answer"]
    highlights = parsed.get("highlights", [])

    # Only download PDF bytes if there are highlights to render
    pdf_bytes = None
    if highlights:
        pdf_bytes = download_pdf(user_id, file_id)

    images = highlight_sources(user_id, file_id, top_chunks, highlights, pdf_bytes)

    return answer, highlights, images


# ── highlighting ──────────────────────────────────────────────────────────────

def highlight_sources(
    user_id: str,
    file_id: str,
    top_chunks: list[tuple],
    highlights: list[dict],
    pdf_bytes: bytes | None,
) -> list[dict]:
    """
    Draw highlight boxes on PDF pages and upload each annotated page PNG
    to Cloudinary.  Returns a list of dicts with Cloudinary secure_urls.

    pdf_bytes is accepted as a parameter so it is fetched once upstream
    and not re-downloaded per call.
    """
    if not highlights or pdf_bytes is None:
        return []

    page_images: dict[int, object]       = {}
    page_highlight_types: dict[int, set] = {}

    for highlight in highlights:
        target_tokens = normalize_tokens(highlight["text"])
        target_page   = highlight.get("page")
        if target_page is None:
            continue

        for _, _, page, words in top_chunks:
            if not words or page != target_page:
                continue

            if page not in page_images:
                # get_pdf_image_from_bytes renders from in-memory bytes
                page_images[page] = get_pdf_image_from_bytes(pdf_bytes, page)

            im         = page_images[page]
            word_texts = [w["text"] for w in words]

            def normalize(s: str) -> str:
                return s.lower().replace("\n", " ").strip()

            target_norm = [normalize(t) for t in target_tokens]

            for i in range(len(word_texts)):
                window_norm = [normalize(w) for w in word_texts[i: i + len(target_tokens)]]
                if window_norm == target_norm:
                    matched = words[i: i + len(target_tokens)]
                    x0     = min(w["x0"]     for w in matched)
                    x1     = max(w["x1"]     for w in matched)
                    top    = min(w["top"]    for w in matched)
                    bottom = max(w["bottom"] for w in matched)
                    color  = "green" if highlight["type"] == "direct" else "orange"
                    im.draw_rect((x0, top, x1, bottom), stroke=color, stroke_width=3)
                    page_highlight_types.setdefault(page, set()).add(highlight["type"])
                    break

    images = []
    for page in page_highlight_types:
        # Render the annotated page to an in-memory PNG — no disk write
        buf = io.BytesIO()
        page_images[page].save(buf, format="PNG")
        img_bytes = buf.getvalue()

        secure_url = upload_image(user_id, file_id, page, img_bytes)

        images.append({
            "page":      page,
            "types":     list(page_highlight_types[page]),
            "image_url": secure_url,   # direct Cloudinary URL
        })

    return images