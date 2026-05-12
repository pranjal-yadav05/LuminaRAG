"""
debug_highlights.py
===================
Drop this file into your project root and run:

    python debug_highlights.py <pdf_path> "<highlight_text>" <page_number>

It walks every step of the matching pipeline and prints exactly where
things break so you know what to fix.

Example:
    python debug_highlights.py resume.pdf \
        "eInfochips (An Arrow Company), Software Engineer Intern" 1
"""

import sys
import re
import string
import pdfplumber

# ── copy of normalize_tokens from rag.py ─────────────────────────────────────

_JOINERS = re.compile(r'[-–—/]')

def normalize_tokens(text: str) -> list[str]:
    text = _JOINERS.sub(' ', text)
    text = text.replace('\n', ' ')
    tokens = []
    for word in text.split():
        cleaned = word.lower().strip().translate(
            str.maketrans('', '', string.punctuation)
        )
        if cleaned:
            tokens.append(cleaned)
    return tokens


# ── formatting helpers ────────────────────────────────────────────────────────

def sep(title=""):
    width = 72
    if title:
        pad = (width - len(title) - 2) // 2
        print(f"\n{'─' * pad} {title} {'─' * (width - pad - len(title) - 2)}")
    else:
        print("─" * width)


def dump_words(words: list[dict], limit: int = 40):
    print(f"  {'idx':>4}  {'text':<32}  {'x0':>6}  {'top':>6}  {'x1':>6}  {'btm':>6}")
    print(f"  {'----':>4}  {'----':<32}  {'----':>6}  {'----':>6}  {'----':>6}  {'----':>6}")
    for i, w in enumerate(words[:limit]):
        print(f"  {i:>4}  {w['text']:<32}  {w['x0']:>6.1f}  {w['top']:>6.1f}"
              f"  {w['x1']:>6.1f}  {w['bottom']:>6.1f}")
    if len(words) > limit:
        print(f"  … ({len(words) - limit} more words not shown)")


# ── main debug routine ────────────────────────────────────────────────────────

def run_debug(pdf_path: str, highlight_text: str, page_number: int):

    sep("INPUT")
    print(f"  PDF       : {pdf_path}")
    print(f"  Page      : {page_number}")
    print(f"  Highlight : {highlight_text!r}")
    print(f"  Length    : {len(highlight_text)} chars")

    # ── STEP 1: extract words ─────────────────────────────────────────────────
    sep("STEP 1 — pdfplumber extract_words")
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        if page_number < 1 or page_number > total_pages:
            print(f"  ERROR: page {page_number} does not exist "
                  f"(PDF has {total_pages} page(s))")
            return
        page    = pdf.pages[page_number - 1]
        words   = page.extract_words()
        raw_txt = page.extract_text() or ""

    print(f"  Words extracted : {len(words)}")
    if not words:
        print("  ERROR: zero words — PDF may be image-only (scanned).")
        return

    # Sort into reading order: top-to-bottom, then left-to-right within a line
    words.sort(key=lambda w: (round(w["top"]), w["x0"]))
    print(f"\n  First 40 words (reading order):")
    dump_words(words)

    # ── STEP 2: expand words into token stream ────────────────────────────────
    sep("STEP 2 — expand page words through normalize_tokens")
    expanded_tokens: list[str]  = []
    expanded_words:  list[dict] = []

    for w in words:
        sub = normalize_tokens(w["text"])
        if not sub:
            print(f"  WARN: {w['text']!r} → empty after normalisation, skipped")
            continue
        expanded_tokens.extend(sub)
        expanded_words.extend([w] * len(sub))

    print(f"  Expanded token count : {len(expanded_tokens)}")
    print(f"  First 80 tokens:")
    for i in range(0, min(80, len(expanded_tokens)), 10):
        print(f"    [{i:3d}] {expanded_tokens[i:i+10]}")

    # ── STEP 3: tokenise highlight ────────────────────────────────────────────
    sep("STEP 3 — normalize_tokens on highlight text")
    target_tokens = normalize_tokens(highlight_text)
    n = len(target_tokens)
    print(f"  Token count : {n}")
    print(f"  Tokens      : {target_tokens}")

    if not target_tokens:
        print("  ERROR: highlight normalises to nothing.")
        return

    if n > len(expanded_tokens):
        print(f"\n  ERROR: target ({n} tokens) > page token count "
              f"({len(expanded_tokens)}) — cannot match.")
        print("  The LLM probably concatenated multiple paragraphs into one")
        print("  highlight.  The prompt fix (short highlights) should prevent this.")
        return

    # ── STEP 4: exact match ───────────────────────────────────────────────────
    sep("STEP 4 — exact contiguous match scan")
    exact_hit = -1
    for i in range(len(expanded_tokens) - n + 1):
        if expanded_tokens[i: i + n] == target_tokens:
            exact_hit = i
            break

    if exact_hit >= 0:
        print(f"  ✓ EXACT MATCH at token position {exact_hit}")
        matched_words: list[dict] = []
        seen: set[int] = set()
        for w in expanded_words[exact_hit: exact_hit + n]:
            if id(w) not in seen:
                matched_words.append(w)
                seen.add(id(w))
        print(f"  Matched source words ({len(matched_words)}):")
        dump_words(matched_words)
        _report_bbox(matched_words)
        return

    print("  ✗ No exact match")

    # ── STEP 5: best-window diff ──────────────────────────────────────────────
    sep("STEP 5 — best sliding window (why did exact fail?)")
    best_score, best_start = 0.0, -1
    for i in range(len(expanded_tokens) - n + 1):
        window = expanded_tokens[i: i + n]
        score  = sum(a == b for a, b in zip(target_tokens, window)) / n
        if score > best_score:
            best_score, best_start = score, i

    print(f"  Best window : score={best_score:.1%}  position={best_start}")

    if best_start >= 0:
        window = expanded_tokens[best_start: best_start + n]
        print(f"\n  Token-by-token diff  (target vs best window):")
        print(f"  {'#':>4}  {'TARGET':<32}  {'PAGE':<32}  OK?")
        print(f"  {'─'*4}  {'─'*32}  {'─'*32}  ───")
        mismatches = []
        for j, (t, p) in enumerate(zip(target_tokens, window)):
            flag = "✓" if t == p else "✗"
            if t != p:
                mismatches.append((j, t, p))
            print(f"  {j:>4}  {t:<32}  {p:<32}  {flag}")
        print(f"\n  Mismatches: {len(mismatches)}")
        for j, t, p in mismatches:
            print(f"    pos {j:3d}: target={t!r:<28} page={p!r}")

    # ── STEP 6: individual token presence ────────────────────────────────────
    sep("STEP 6 — individual token presence on this page")
    page_token_set = set(expanded_tokens)
    missing = []
    for tok in target_tokens:
        here   = tok in page_token_set
        status = "✓" if here else "✗  ← NOT ON THIS PAGE"
        print(f"  {tok:<34}  {status}")
        if not here:
            missing.append(tok)

    if missing:
        print(f"\n  {len(missing)} token(s) absent from page {page_number}.")
        print("  Likely causes:")
        print("   1. LLM gave wrong page number.")
        print("   2. LLM slightly rephrased (didn't copy verbatim).")
        print("   3. pdfplumber split/merged the word differently (ligatures, kerning).")
        _search_all_pages(missing, pdf_path)
    else:
        print("\n  All tokens present on page — but NOT as a contiguous sequence.")
        print("  Most likely: the highlight spans a chunk boundary and the word")
        print("  lists weren't fully merged.  Confirm the flat merged list is used.")

    # ── STEP 7: raw extracted text for visual check ───────────────────────────
    sep("STEP 7 — raw extract_text() output (first 1200 chars)")
    print(raw_txt[:1200])
    if len(raw_txt) > 1200:
        print(f"  … ({len(raw_txt) - 1200} chars truncated)")

    # ── STEP 8: check how pdfplumber joined adjacent words ───────────────────
    sep("STEP 8 — sliding 2-word and 3-word joins on page")
    print("  (shows what pdfplumber treats as separate tokens that the LLM may")
    print("   have seen as one, or vice-versa)\n")
    joined2 = [f"{words[i]['text']} {words[i+1]['text']}" for i in range(min(30, len(words)-1))]
    print("  Adjacent pairs (first 30):")
    for j in joined2:
        print(f"    {j!r}")


def _report_bbox(matched_words: list[dict]):
    x0     = min(w["x0"]     for w in matched_words)
    x1     = max(w["x1"]     for w in matched_words)
    top    = min(w["top"]    for w in matched_words)
    bottom = max(w["bottom"] for w in matched_words)
    sep("BOUNDING BOX — pass these directly to draw_rect (PDF point coords)")
    print(f"  x0={x0:.2f}  top={top:.2f}  x1={x1:.2f}  bottom={bottom:.2f}")
    print(f"  width={x1-x0:.2f}  height={bottom-top:.2f}")


def _search_all_pages(missing_tokens: list[str], pdf_path: str):
    sep("BONUS — which pages contain the missing tokens?")
    with pdfplumber.open(pdf_path) as pdf:
        for pg_idx, page in enumerate(pdf.pages, start=1):
            ws = page.extract_words() or []
            pg_set = set()
            for w in ws:
                pg_set.update(normalize_tokens(w["text"]))
            found = [t for t in missing_tokens if t in pg_set]
            if found:
                print(f"  Page {pg_idx}: {found}")


# ── entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage:")
        print("  python debug_highlights.py <pdf_path> \"<highlight_text>\" <page_number>")
        print()
        print("Examples:")
        print('  python debug_highlights.py resume.pdf "eInfochips (An Arrow Company)" 1')
        print('  python debug_highlights.py resume.pdf "Pranjal Yadav" 1')
        sys.exit(1)

    run_debug(
        pdf_path      = sys.argv[1],
        highlight_text= sys.argv[2],
        page_number   = int(sys.argv[3]),
    )