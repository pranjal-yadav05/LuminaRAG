import io
import pdfplumber
import re


def extract_pages_from_pdf(file):
    pages = []

    with pdfplumber.open(file) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""

            pages.append({
                "page_number": i + 1,
                "text": text
            })

    return pages


def extract_pages_with_positions(file):
    pages = []

    with pdfplumber.open(file) as pdf:
        for i, page in enumerate(pdf.pages):
            words = page.extract_words()

            pages.append({
                "page_number": i + 1,
                "words": words
            })

    return pages


def chunk_pages(pages, chunk_size=1000, overlap=200):
    chunks = []

    for page in pages:
        text = page["text"]
        page_number = page["page_number"]

        for i in range(0, len(text), chunk_size - overlap):
            chunk_text = text[i:i + chunk_size]

            chunks.append({
                "text": chunk_text,
                "page_number": page_number
            })

    return chunks


def chunk_words(pages, max_words=150, overlap_words=30):
    """
    Chunk by sentences/paragraphs instead of raw word count.
    Keeps semantic units (lists, paragraphs) together.
    """
    chunks = []

    for page in pages:
        words = page["words"]
        page_number = page["page_number"]

        if not words:
            continue

        # Rebuild text preserving line breaks using y-position
        # Group words into lines by their vertical position
        lines = []
        current_line = []
        current_top = None

        for w in words:
            if current_top is None or abs(w["top"] - current_top) < 5:
                current_line.append(w)
                current_top = w["top"]
            else:
                if current_line:
                    lines.append(current_line)
                current_line = [w]
                current_top = w["top"]

        if current_line:
            lines.append(current_line)

        # Group lines into paragraphs (gap > ~10 units = new paragraph)
        paragraphs = []
        current_para_words = []
        prev_bottom = None

        for line in lines:
            line_top = line[0]["top"]
            if prev_bottom is not None and (line_top - prev_bottom) > 10:
                # New paragraph
                if current_para_words:
                    paragraphs.append(current_para_words)
                current_para_words = list(line)
            else:
                current_para_words.extend(line)
            prev_bottom = max(w["bottom"] for w in line)

        if current_para_words:
            paragraphs.append(current_para_words)

        # Now chunk paragraphs, keeping them together when possible
        current_chunk_words = []

        def flush_chunk(word_list):
            if not word_list:
                return
            text = " ".join(
                w["text"].strip() for w in word_list
            ).replace("\n", " ")
            chunks.append({
                "chunk_id": len(chunks),
                "text": text,
                "page_number": page_number,
                "words": word_list
            })

        for para_words in paragraphs:
            if len(current_chunk_words) + len(para_words) <= max_words:
                current_chunk_words.extend(para_words)
            else:
                # If current chunk has content, flush it with overlap
                flush_chunk(current_chunk_words)
                # Start new chunk with overlap from end of previous
                overlap = current_chunk_words[-overlap_words:] if current_chunk_words else []
                current_chunk_words = overlap + para_words

                # If a single paragraph exceeds max_words, split it
                if len(current_chunk_words) > max_words * 2:
                    for i in range(0, len(current_chunk_words), max_words - overlap_words):
                        flush_chunk(current_chunk_words[i:i + max_words])
                    current_chunk_words = []

        flush_chunk(current_chunk_words)

    return chunks


# ── image rendering ───────────────────────────────────────────────────────────

_pdf_cache: dict[str, object] = {}


def get_pdf_image(pdf_path: str, page_number: int):
    """
    Render a page from a PDF file on disk.
    Kept for any callers that still have a local path.
    """
    key = f"{pdf_path}_{page_number}"
    if key in _pdf_cache:
        return _pdf_cache[key]

    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[page_number - 1]
        img  = page.to_image(resolution=150)

    _pdf_cache[key] = img
    return img


def get_pdf_image_from_bytes(pdf_bytes: bytes, page_number: int):
    """
    Render a page from in-memory PDF bytes (no temp file needed).
    Used by rag.highlight_sources so no disk I/O is required.
    """
    buf = io.BytesIO(pdf_bytes)
    with pdfplumber.open(buf) as pdf:
        page = pdf.pages[page_number - 1]
        img  = page.to_image(resolution=150)
    return img