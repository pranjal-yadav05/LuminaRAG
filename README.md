<div align="center">
  <img src="./frontend/public/lumina-logo.png" alt="Lumina RAG Logo" width="600" />
  <p><em>A full-stack PDF AI assistant — built from scratch, one layer at a time.</em></p>
</div>

---

Lumina RAG is a personal project born out of curiosity about how retrieval-augmented generation actually works under the hood — not just calling an API and hoping for the best, but genuinely understanding every step: how text gets chunked, why word-level position data matters for highlighting, what cosine similarity is really doing, and how to build something that feels polished enough to actually use.

What started as a simple "upload a PDF and ask questions" experiment evolved into a multi-user SaaS-style application with authentication, persistent sessions, file management, a three-panel UI, and Cloudinary-backed storage that survives free-tier server spin-downs. Every feature was added because it was the natural next problem to solve.

---

## What It Does

Upload any PDF. Ask questions about it in plain English. Get answers grounded in the actual document — with the exact page highlighted so you can verify the source yourself.

- **Upload a PDF** — drag and drop, or click to browse. The file is chunked, embedded, and stored. Upload the same file again and it's instant — embeddings are reused.
- **Ask anything** — the assistant retrieves the most relevant passages, generates a contextual answer, and tells you exactly which page it came from.
- **See the evidence** — the relevant page is rendered with highlight boxes drawn directly on it. Green means the answer came directly from that passage. Orange means it's supporting context.
- **Manage your files** — each PDF is its own entity. You can start multiple independent conversations on the same document, rename them, delete them, or pick up where you left off.
- **It persists** — sessions, messages, files, and highlighted images all survive across logins and server restarts.

---

## Features

✨ **Core Capabilities**
- **PDF Upload with deduplication** — SHA-256 hash checked on every upload. If you've uploaded the same binary before, embeddings are reused instantly without reprocessing
- **AI Chat with conversation history** — last 3 exchanges are included as context so the LLM can handle follow-up questions naturally
- **Visual evidence highlighting** — pdfplumber word bounding boxes are matched token-by-token against the LLM's highlight spans, then drawn onto in-memory page renders and uploaded to Cloudinary
- **Multi-file support** — each upload is an independent file record with its own UUID; files and their sessions are managed separately
- **Multi-session support** — create as many conversations on a file as you want; each has its own message history
- **Session renaming** — inline rename from the sidebar with keyboard shortcuts (Enter to save, Escape to cancel)
- **JWT authentication** — signup/login with bcrypt-hashed passwords; token stored in localStorage and sent as a Bearer header

🎨 **UI / UX**
- **3-panel layout** — Files & Sessions on the left, Chat in the centre, Evidence viewer on the right
- **File groups** — sessions are nested under their parent file with expand/collapse; confirm-before-delete for both files and sessions
- **Mobile drawers** — the session panel and evidence viewer slide in as full-screen overlays on small screens; a badge pulses on the evidence icon when new highlights arrive
- **Zoom & pan on evidence** — react-zoom-pan-pinch lets you inspect highlighted pages at up to 4× zoom; double-click to zoom in, pinch on mobile
- **Dark / light mode** — oklch-based design tokens throughout; no hard-coded colours
- **Processing status indicator** — animated dot in the header reflects upload state in real time

🏗️ **Infrastructure**
- **Cloudinary for all persistent assets** — PDFs, embeddings (pickle files), and highlighted page images are all stored in Cloudinary. No local disk state, so free-tier server restarts don't lose anything
- **MongoDB for metadata** — file records, session documents, and message history are stored in MongoDB via Motor (async driver)
- **OpenRouter** — routes requests to `text-embedding-3-small` for embeddings and `gpt-4o-mini` for generation

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React 19, JavaScript |
| Styling | Tailwind CSS 4, shadcn/ui, Lucide React |
| Backend | FastAPI, Python 3.11+ |
| Database | MongoDB (Motor async driver) |
| Storage | Cloudinary (PDFs · embeddings · page images) |
| Embeddings | OpenAI `text-embedding-3-small` via OpenRouter |
| LLM | `openai/gpt-4o-mini` via OpenRouter |
| Auth | PyJWT + bcrypt |

---

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Python 3.11+
- A running MongoDB instance — [MongoDB Atlas free tier](https://www.mongodb.com/atlas) works fine
- An [OpenRouter](https://openrouter.ai) API key
- A [Cloudinary](https://cloudinary.com) account — the free tier is more than enough

### 1. Clone the repo

```bash
git clone https://github.com/pranjal-yadav05/LuminaRAG.git
cd LuminaRAG
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
MONGO_URL=mongodb://localhost:27017
OPENROUTER_API_KEY=sk-or-...
JWT_SECRET=pick-a-long-random-string

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

CORS_ORIGINS=http://localhost:3000
```

Start the server:

```bash
uvicorn main:app --reload
```

The API will be running at [http://localhost:8000](http://localhost:8000).

### 3. Frontend setup

```bash
cd frontend
pnpm install
```

Create a `.env.local` file in `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture

### How it all fits together

The application has four distinct concerns, each handled by a separate layer:

1. **Who are you?** — `auth.py` + `db_users.py` + `useAuth.js`
2. **What files do you have?** — `db_files.py` + `cloudinary_storage.py`
3. **What conversations have you had?** — `db.py` (sessions + messages)
4. **What does the document say?** — `pdf_utils.py` + `rag.py`

Every cloud resource is scoped to `(user_id, file_id)`. The `file_id` is a UUID generated once on upload and never reused. The `content_hash` exists only for deduplication — it is not a primary key, and two uploads of the same file produce two independent file records that can be deleted separately.

### Backend module map

```
main.py               # FastAPI app — all route handlers, auth middleware
auth.py               # JWT creation/decoding, bcrypt password hashing
db.py                 # Session CRUD (MongoDB via Motor async)
db_files.py           # File metadata CRUD (MongoDB)
db_users.py           # Users collection handle
pdf_utils.py          # pdfplumber extraction, word-level chunking, page rendering
rag.py                # Embeddings create/save/load, retrieval, answer generation, highlighting
cloudinary_storage.py # All Cloudinary I/O — upload/download/delete for PDFs, embeddings, images
```

### Frontend component map

```
app/
├── page.jsx              # Root — auth gate, mobile drawer state, event wiring
└── globals.css           # Design tokens, oklch theme variables

components/
├── AuthModal.jsx         # Login / signup modal with tab switcher and inline error handling
├── SessionPanel.jsx      # Left sidebar — file groups, collapsible sessions, drag-and-drop upload
├── ChatPanel.jsx         # Centre — message thread, highlight accordion, input with Enter-to-send
└── ViewerPanel.jsx       # Right — zoomable evidence images, legend, page dot navigation

hooks/
├── useAuth.js            # Token lifecycle, login/signup/logout, localStorage hydration guard
└── usePDFAssistant.js    # All API calls, file list, session list, active session state, messages
```

### Cloudinary storage layout

All persistent assets live in Cloudinary, scoped by `(user_id, file_id)`. Nothing is served from the FastAPI process itself.

```
pdfs/<user_id>/<file_id>/original          → resource_type: raw   (the original PDF bytes)
embeddings/<user_id>/<file_id>/embeddings  → resource_type: raw   (pickled chunks + vectors)
images/<user_id>/<file_id>/page_<N>        → resource_type: image (annotated page PNG)
```

The PDF is downloaded from Cloudinary only when a `/ask` request produces highlights that need to be rendered — it is not kept in memory between requests.

---

## The RAG Pipeline, Explained

This is the interesting part. Here's exactly what happens when you upload a PDF and ask a question.

### On upload

**1. Hashing and dedup check**

The raw file bytes are SHA-256 hashed. Before doing any work, the backend checks whether this user already has a file with the same hash. If they do — and those embeddings still exist in Cloudinary — they're copied to the new `file_id` and the upload returns immediately. Processing a 50-page PDF takes a few seconds; skipping it takes milliseconds.

**2. Word-level extraction**

Rather than extracting raw text, pdfplumber's `extract_words()` is used. This gives every word its bounding box — `x0`, `x1`, `top`, `bottom` — which is what makes pixel-accurate highlighting possible later. A plain text extraction would lose all spatial information.

**3. Paragraph-aware chunking**

Words are grouped into lines by their vertical `top` coordinate (words within 5 units of each other are on the same line). Lines are then grouped into paragraphs by detecting vertical gaps larger than 10 units — a heuristic that works well for most PDFs.

Paragraphs are then packed into chunks of at most 150 words, with a 30-word overlap between consecutive chunks. The overlap means that a sentence sitting at a chunk boundary won't be split and lose its context. The key decision here was to chunk by paragraph rather than by raw character count — it keeps semantic units (bullet lists, numbered steps, definitions) intact.

**4. Embedding**

Each chunk's text is sent to `text-embedding-3-small` via OpenRouter. The resulting 1536-dimensional vector is stored alongside the chunk text, page number, and word list in a pickle file, which is uploaded to Cloudinary as a raw resource.

### On a question

**5. Query embedding and retrieval**

The user's question is embedded with the same model. Cosine similarity is computed between the query vector and every stored chunk vector. The top 5 chunks are returned — these are the passages most likely to contain the answer.

Cosine similarity was chosen over dot product because it's invariant to vector magnitude, which matters when comparing a short query embedding against longer passage embeddings. The vectors don't always have the same norm, and cosine similarity normalises for that.

**6. Answer generation**

The top 5 chunks are formatted as a context block with page numbers and sent to GPT-4o-mini with a strict system prompt. The model is required to return only valid JSON:

```json
{
  "answer": "...",
  "highlights": [
    {
      "text": "EXACT substring from context",
      "page": 2,
      "type": "direct"
    }
  ]
}
```

The `type` field distinguishes between passages that directly answer the question (`"direct"`) and those that provide supporting context (`"evidence"`). The model is explicitly instructed to copy highlight text character-for-character — any paraphrasing would break the token matching step that follows.

**7. Highlight rendering**

For each highlight, the exact text string is tokenised and matched token-by-token against the word list from the relevant chunk. When a match is found, the bounding boxes of the matched words are unioned into a single rectangle and drawn onto an in-memory pdfplumber page image using `draw_rect`.

Matched highlights for `"direct"` type are drawn in green; `"evidence"` in orange. The annotated page is rendered to a `BytesIO` buffer as a PNG — no temp files are written to disk — and uploaded to Cloudinary. The secure URL is returned directly in the API response.

**8. Conversation history**

The last 6 messages (3 user + 3 assistant turns) are included in the generation prompt. This lets the model handle natural follow-up questions like "can you elaborate on the second point?" without losing context.

---

## API Reference

All endpoints except `/signup` and `/login` require:
```
Authorization: Bearer <jwt_token>
```

### Auth

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/signup` | `{ email, password }` | Create account, returns JWT |
| `POST` | `/login` | `{ email, password }` | Authenticate, returns JWT |

### Files

| Method | Path | Description |
|---|---|---|
| `POST` | `/upload-pdf` | Upload a PDF (multipart/form-data), process embeddings, create default session |
| `GET` | `/files` | List all files for the current user |
| `GET` | `/files/{file_id}` | Get metadata for a single file |
| `DELETE` | `/files/{file_id}` | Delete file, all its sessions, and all Cloudinary assets |

### Sessions

| Method | Path | Description |
|---|---|---|
| `POST` | `/files/{file_id}/sessions` | Start a new session on an existing file |
| `GET` | `/files/{file_id}/sessions` | List all sessions for a file |
| `GET` | `/sessions` | List all sessions for the current user |
| `GET` | `/sessions/{session_id}` | Fetch session including full message history |
| `DELETE` | `/sessions/{session_id}` | Delete a session |
| `PATCH` | `/sessions/{session_id}` | Rename a session — body: `{ "title": "..." }` |

### Q&A

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/sessions/{session_id}/ask` | `{ "query": "..." }` | Ask a question; returns answer, highlights, and Cloudinary image URLs |

**Full response shape:**
```json
{
  "query": "What are the key findings?",
  "answer": "The study found that...",
  "highlights": [
    {
      "text": "exact substring copied from the document",
      "page": 2,
      "type": "direct"
    },
    {
      "text": "another supporting passage",
      "page": 4,
      "type": "evidence"
    }
  ],
  "images": [
    {
      "page": 2,
      "types": ["direct"],
      "image_url": "https://res.cloudinary.com/your-cloud/image/upload/..."
    }
  ],
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Project Structure

```
lumina-rag/
├── backend/
│   ├── main.py
│   ├── auth.py
│   ├── db.py
│   ├── db_files.py
│   ├── db_users.py
│   ├── pdf_utils.py
│   ├── rag.py
│   ├── cloudinary_storage.py
│   └── requirements.txt
│
└── frontend/
    ├── app/
    │   ├── page.jsx
    │   ├── layout.tsx
    │   └── globals.css
    ├── components/
    │   ├── AuthModal.jsx
    │   ├── SessionPanel.jsx
    |   ├── theme-provider.tsx
    │   ├── ChatPanel.jsx
    │   ├── ViewerPanel.jsx
    │   └── ui/  ← shadcnui components
    └── hooks/
        ├── useAuth.js
        └── usePDFAssistant.js
 
```

---

## Building for Production

```bash
# Frontend
cd frontend
pnpm build
pnpm start

# Backend
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

No local volume mounts or persistent disk are required. All assets — PDFs, embeddings, page images — live in Cloudinary. All metadata lives in MongoDB. The server process itself is stateless, which is exactly what free-tier hosting needs.

---

## Design Decisions Worth Noting

**Why Cloudinary for embeddings?** Pickle files are binary blobs — Cloudinary treats them as `resource_type: raw`, which is exactly right. The alternative would be storing them in MongoDB as GridFS or base64, which is messier. Cloudinary gives a CDN, a clean path-based URL scheme, and a free tier generous enough for a side project.

**Why not stream the LLM response?** The highlighting step requires the full JSON response before it can begin token matching and image rendering. Streaming the answer text is possible but would mean showing the answer before the evidence images are ready — a confusing experience. The current approach waits for everything and returns it together.

**Why pickle for embeddings?** It's the simplest possible format for a list of Python dicts containing numpy arrays. A production system might use a proper vector database, but for a project at this scale, pickle-to-Cloudinary is fast, simple, and easy to reason about.

**Why SHA-256 for dedup instead of a perceptual hash?** Deduplication here is about avoiding redundant API calls (embedding costs money), not about detecting similar documents. SHA-256 on the raw bytes is the right tool — it guarantees the files are bit-for-bit identical, which is the condition under which reusing embeddings is safe.

**Why pdfplumber over PyMuPDF or PyPDF2?** pdfplumber gives both text content and the precise spatial position of every word in a single pass. That word-level bounding box data is used directly in the highlighting step — no separate layout analysis needed.

---

<div align="center">
  <p>Built with curiosity</p>
</div>