"use client";

import { useState, useEffect, useRef } from "react";
import SmoothScrollProvider from "../components/SmoothScrollProvider";
const cn = (...cls) => cls.filter(Boolean).join(" ");
import {
  Zap,
  Search,
  FolderKanban,
  Shield,
  FileStack,
  Moon,
} from "lucide-react";
// ─────────────────────────────────────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_SCRIPTS = [
  {
    query: "What are the key financial highlights from Q3?",
    answer:
      "Q3 revenue reached $4.2B, up 18% YoY. Operating margin improved to 23.4%, driven by cost optimisation in APAC. Net income of $980M beat consensus by 6%.",
    highlights: [
      { type: "direct", text: "$4.2B revenue" },
      { type: "direct", text: "18% YoY growth" },
      { type: "evidence", text: "Operating margin 23.4%" },
      { type: "evidence", text: "Net income $980M" },
    ],
    page: 3,
    pageLines: [
      { w: 85, h: null },
      { w: 70, h: null },
      { w: 90, h: "direct" },
      { w: 60, h: "direct" },
      { w: 75, h: null },
      { w: 80, h: "evidence" },
      { w: 55, h: "evidence" },
      { w: 90, h: null },
      { w: 65, h: null },
      { w: 78, h: null },
    ],
  },
  {
    query: "Which regions drove the most growth?",
    answer:
      "North America led with 24% growth, followed by EMEA at 19%. APAC showed the highest acceleration — up from 8% in Q2 to 21% in Q3 — primarily from enterprise SaaS contracts.",
    highlights: [
      { type: "direct", text: "North America +24%" },
      { type: "direct", text: "APAC acceleration" },
      { type: "evidence", text: "EMEA 19%" },
      { type: "evidence", text: "Enterprise SaaS" },
    ],
    page: 7,
    pageLines: [
      { w: 70, h: null },
      { w: 88, h: "direct" },
      { w: 60, h: "direct" },
      { w: 82, h: null },
      { w: 75, h: "evidence" },
      { w: 65, h: null },
      { w: 90, h: "direct" },
      { w: 58, h: "evidence" },
      { w: 80, h: null },
      { w: 70, h: null },
    ],
  },
  {
    query: "What are the main risks outlined for Q4?",
    answer:
      "Management flagged three key risks: FX headwinds from a stronger dollar (–2% impact), supply-chain delays in semiconductor components, and potential regulatory scrutiny in the EU market.",
    highlights: [
      { type: "direct", text: "FX headwinds –2%" },
      { type: "direct", text: "Regulatory scrutiny EU" },
      { type: "evidence", text: "Supply-chain delays" },
      { type: "evidence", text: "Semiconductor components" },
    ],
    page: 11,
    pageLines: [
      { w: 80, h: null },
      { w: 65, h: "direct" },
      { w: 90, h: null },
      { w: 72, h: "evidence" },
      { w: 60, h: "evidence" },
      { w: 85, h: null },
      { w: 78, h: "direct" },
      { w: 55, h: "direct" },
      { w: 88, h: null },
      { w: 68, h: null },
    ],
  },
];

const FEATURE_CARDS = [
  {
    icon: Zap,
    title: "Instant Upload",
    desc: "Drag, drop, done. Your PDF is chunked, embedded, and ready for questions in seconds.",
  },
  {
    icon: Search,
    title: "Visual Evidence",
    desc: "Every answer links back to the exact page it came from — rendered and highlighted.",
  },
  {
    icon: FolderKanban,
    title: "Multi-Session Memory",
    desc: "Organise conversations by file. Pick up any thread exactly where you left off.",
  },
  {
    icon: Shield,
    title: "Private by Default",
    desc: "Your documents are tied to your account. Nothing is shared or used for training.",
  },
  {
    icon: FileStack,
    title: "Multi-Page Context",
    desc: "The retrieval engine scans the entire document, not just one chunk, for richer answers.",
  },
  {
    icon: Moon,
    title: "Dark & Light Mode",
    desc: "Follows your system preference out of the box. Easy on the eyes at any hour.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Upload your PDF",
    desc: "Drag and drop any PDF — research paper, contract, report, manual. Lumina processes it instantly.",
    color: "#8b5cf6",
  },
  {
    num: "02",
    title: "Ask anything",
    desc: "Type your question in plain English. No query syntax, no boolean operators — just talk.",
    color: "#06b6d4",
  },
  {
    num: "03",
    title: "See the evidence",
    desc: "Get a precise answer alongside the exact document pages that support it.",
    color: "#10b981",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────────────────────────────────────

function Navbar({ scrolled }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5 py-3"
          : "py-5 sm:py-6",
      )}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg sm:text-xl font-semibold tracking-tight text-white [font-family:var(--font-playfair)]">
            Lumina
          </span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono">
            RAG
          </span>
        </div>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-6">
          <a
            href="#how"
            className="text-xs text-white/50 hover:text-white transition-colors tracking-wide">
            How it works
          </a>
          <a
            href="#features"
            className="text-xs text-white/50 hover:text-white transition-colors tracking-wide">
            Features
          </a>
          <a
            href="/chat"
            className="text-xs font-medium bg-white text-[#0a0a0f] px-4 py-2 rounded-full hover:bg-white/90 transition-all">
            Get started →
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu">
          {menuOpen ? (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div className="sm:hidden bg-[#0d0d14]/98 backdrop-blur-xl border-t border-white/5 px-4 py-4 flex flex-col gap-3">
          <a
            href="#how"
            onClick={() => setMenuOpen(false)}
            className="text-sm text-white/60 hover:text-white transition-colors py-1">
            How it works
          </a>
          <a
            href="#features"
            onClick={() => setMenuOpen(false)}
            className="text-sm text-white/60 hover:text-white transition-colors py-1">
            Features
          </a>
          <a
            href="/chat"
            onClick={() => setMenuOpen(false)}
            className="text-sm font-medium bg-white text-[#0a0a0f] px-5 py-2.5 rounded-full text-center hover:bg-white/90 transition-all mt-1">
            Get started →
          </a>
        </div>
      )}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fake document page (evidence viewer)
// ─────────────────────────────────────────────────────────────────────────────

function FakePage({ pageLines, page }) {
  return (
    <div className="rounded-lg overflow-hidden border border-white/10 bg-[#16161f] w-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
        <span className="text-[9px] font-mono text-white/25">
          Q3_Report.pdf
        </span>
        <span className="text-[9px] font-mono text-white/25">p.{page}</span>
      </div>
      <div className="p-3 space-y-1.5">
        <div className="h-2 w-1/2 rounded bg-white/20 mb-3" />
        {pageLines.map((line, i) => {
          const isGreen = line.h === "direct";
          const isOrange = line.h === "evidence";
          return (
            <div key={i} className="relative flex items-center">
              {(isGreen || isOrange) && (
                <div
                  className={cn(
                    "absolute -left-0.5 top-0 bottom-0 w-0.5 rounded-full",
                    isGreen ? "bg-green-400" : "bg-orange-400",
                  )}
                />
              )}
              <div
                className={cn(
                  "h-1.5 rounded-full transition-all ml-1",
                  isGreen
                    ? "bg-green-400/50"
                    : isOrange
                      ? "bg-orange-400/40"
                      : "bg-white/10",
                )}
                style={{ width: `${line.w}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 px-3 py-1.5 border-t border-white/5">
        <span className="flex items-center gap-1 text-[9px] text-white/30">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
          Direct
        </span>
        <span className="flex items-center gap-1 text-[9px] text-white/30">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
          Evidence
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Demo
// ─────────────────────────────────────────────────────────────────────────────

function LiveDemo() {
  const [scriptIdx, setScriptIdx] = useState(0);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [openHighlights, setOpenHighlights] = useState({});
  const [showEvidence, setShowEvidence] = useState(false);
  const messagesContainerRef = useRef(null);

  const currentScript = DEMO_SCRIPTS[scriptIdx] ?? null;
  const isDone = scriptIdx >= DEMO_SCRIPTS.length;
  const activeMsg = messages.find(
    (m) => m.id === activeId && m.role === "assistant",
  );

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing]);

  const handleSend = () => {
    if (typing || !currentScript) return;
    setMessages((p) => [
      ...p,
      { id: Date.now(), role: "user", content: currentScript.query },
    ]);
    setTyping(true);
    setTimeout(() => {
      const aMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: currentScript.answer,
        highlights: currentScript.highlights,
        page: currentScript.page,
        pageLines: currentScript.pageLines,
      };
      setMessages((p) => [...p, aMsg]);
      setActiveId(aMsg.id);
      setTyping(false);
      setScriptIdx((i) => i + 1);
    }, 1400);
  };

  const handleReset = () => {
    setScriptIdx(0);
    setMessages([]);
    setTyping(false);
    setActiveId(null);
    setOpenHighlights({});
    setShowEvidence(false);
  };

  const selectMessage = (id) => {
    setActiveId((prev) => (prev === id ? null : id));
    setShowEvidence(true);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#111118] shadow-2xl shadow-black/50">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 bg-[#0d0d14] border-b border-white/5">
        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500/70" />
        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-500/70" />
        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 sm:ml-3 text-[10px] font-mono text-white/20 tracking-wider hidden sm:inline">
          lumina-rag.app
        </span>
        <span className="ml-auto text-[9px] font-mono text-green-400/60 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
          <span className="hidden sm:inline">Q3_Report.pdf ready</span>
          <span className="sm:hidden">PDF ready</span>
        </span>
      </div>

      {/* 3-panel layout — stacks vertically on mobile */}
      <div className="flex flex-col lg:flex-row">
        {/* LEFT sidebar — hidden below lg */}
        <div className="hidden lg:flex lg:w-44 xl:w-48 border-r border-white/5 bg-[#0d0d14] p-3 flex-col gap-2 shrink-0">
          <div className="text-[9px] font-mono uppercase tracking-widest text-white/20 px-1 mb-1">
            Files & Sessions
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <div className="w-5 h-5 rounded bg-violet-500/80 flex items-center justify-center text-[8px] text-white font-bold shrink-0">
              Q3
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-white/80 font-medium truncate">
                Q3 Report
              </div>
              <div className="text-[9px] text-white/30">1 session</div>
            </div>
          </div>
          <div className="ml-3 pl-2 border-l border-white/10">
            <div className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-violet-500/10 border border-violet-500/20">
              <span className="w-2 h-2 rounded-sm bg-violet-400/60 shrink-0" />
              <span className="text-[9px] text-violet-300 truncate">
                Demo session
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg opacity-35">
            <div className="w-5 h-5 rounded bg-cyan-500/60 flex items-center justify-center text-[8px] text-white font-bold shrink-0">
              CT
            </div>
            <div className="text-[10px] text-white/60 truncate">
              Contract.pdf
            </div>
          </div>
          <div className="mt-auto text-[9px] text-white/15 border-t border-white/5 pt-2 px-1 space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-violet-400/60">•</span> Multi-session
            </div>
            <div className="flex items-center gap-1">
              <span className="text-violet-400/60">•</span> Persistent
            </div>
          </div>
        </div>

        {/* CENTER chat */}
        <div
          className="flex-1 flex flex-col border-white/5 lg:border-r"
          style={{ minWidth: 0 }}>
          {/* Chat header */}
          <div className="px-3 sm:px-4 py-2 border-b border-white/5 flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/20">
              Chat
            </span>
            {/* Mobile file pill */}
            <div className="lg:hidden flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-violet-500/80 flex items-center justify-center text-[7px] text-white font-bold">
                Q3
              </div>
              <span className="text-[10px] text-white/40">
                Q3 Report · Demo session
              </span>
            </div>
          </div>

          {/* Messages */}
          <div
            className="overflow-y-auto p-3 sm:p-4 space-y-3"
            style={{ minHeight: 200, maxHeight: 320 }}>
            {messages.length === 0 && !typing && (
              <div className="flex flex-col items-center justify-center text-center py-12">
                <div className="text-2xl mb-2">📄</div>
                <p className="text-xs text-white/30 font-medium">
                  Q3 Report is ready
                </p>
                <p className="text-[10px] text-white/20 mt-1">
                  Hit Send below to ask your first question
                </p>
              </div>
            )}

            {messages.map((m) => {
              const isAssistant = m.role === "assistant";
              const isActive = m.id === activeId;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    isAssistant ? "justify-start" : "justify-end",
                  )}>
                  <div
                    className={cn(
                      "max-w-[92%] sm:max-w-[82%] rounded-xl px-3 py-2.5 text-xs leading-relaxed transition-all duration-200",
                      isAssistant
                        ? cn(
                            "bg-white/5 border rounded-bl-sm cursor-pointer",
                            isActive
                              ? "border-violet-500/40 shadow-sm shadow-violet-500/10"
                              : "border-white/10 hover:border-white/20",
                          )
                        : "bg-white text-[#0a0a0f] rounded-br-sm",
                    )}
                    onClick={() => isAssistant && selectMessage(m.id)}>
                    <p className={isAssistant ? "text-white/80" : ""}>
                      {m.content}
                    </p>

                    {/* Evidence badge */}
                    {isAssistant && (
                      <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5">
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            isActive ? "bg-violet-400" : "bg-white/20",
                          )}
                        />
                        <span
                          className={cn(
                            "text-[9px] font-medium transition-colors",
                            isActive ? "text-violet-400" : "text-white/30",
                          )}>
                          {isActive
                            ? "Showing evidence"
                            : `p.${m.page} · tap to view`}
                        </span>
                      </div>
                    )}

                    {/* Highlights accordion */}
                    {isAssistant && m.highlights?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenHighlights((prev) => ({
                              ...prev,
                              [m.id]: !prev[m.id],
                            }));
                          }}
                          className="flex items-center gap-1 text-[9px] font-medium text-white/40 hover:text-white/70 transition-colors">
                          Highlights
                          <span
                            className={cn(
                              "inline-block transition-transform duration-200 text-[8px]",
                              openHighlights[m.id] ? "rotate-180" : "",
                            )}>
                            ▾
                          </span>
                        </button>
                        {openHighlights[m.id] && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {m.highlights.map((h, i) => (
                              <span
                                key={i}
                                className={cn(
                                  "inline-block text-[9px] px-2 py-0.5 rounded-full border",
                                  h.type === "direct"
                                    ? "bg-green-500/15 text-green-300 border-green-500/20"
                                    : "bg-orange-500/15 text-orange-300 border-orange-500/20",
                                )}>
                                {h.text}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {typing && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-xl rounded-bl-sm px-3 py-2.5">
                  <div className="flex gap-1 items-center">
                    {[0, 0.15, 0.3].map((d, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                        style={{ animationDelay: `${d}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input row */}
          <div className="border-t border-white/5 p-2.5 sm:p-3 flex gap-2 bg-[#0d0d14]/50 shrink-0">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white/40 select-none truncate min-w-0">
              {isDone ? "Try it with your own PDF →" : currentScript?.query}
            </div>
            {isDone ? (
              <button
                onClick={handleReset}
                className="px-3 py-2 bg-white/10 border border-white/15 text-white/60 rounded-lg text-[11px] font-medium hover:bg-white/15 transition-all whitespace-nowrap shrink-0">
                ↺ Reset
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={typing}
                className="px-3 py-2 bg-white text-[#0a0a0f] rounded-lg text-[11px] font-semibold disabled:opacity-40 hover:bg-white/90 transition-all whitespace-nowrap shrink-0">
                Send →
              </button>
            )}
          </div>
        </div>

        {/* RIGHT evidence — desktop sidebar */}
        <div className="hidden lg:flex lg:w-48 xl:w-52 flex-col bg-[#0d0d14] shrink-0">
          <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/20">
              Evidence
            </span>
            {activeMsg && (
              <span className="text-[9px] font-mono text-white/25 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                p.{activeMsg.page}
              </span>
            )}
          </div>
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-3">
            {activeMsg ? (
              <FakePage pageLines={activeMsg.pageLines} page={activeMsg.page} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-3 py-8">
                <div className="text-xl mb-2">🔍</div>
                <p className="text-[9px] text-white/25 leading-relaxed">
                  Send a question then click the answer to see evidence
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile evidence drawer — shown below chat when an answer is tapped */}
        {showEvidence && activeMsg && (
          <div className="lg:hidden border-t border-white/10 bg-[#0d0d14]">
            <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-white/20">
                  Evidence
                </span>
                <span className="text-[9px] font-mono text-white/25 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                  p.{activeMsg.page}
                </span>
              </div>
              <button
                onClick={() => setShowEvidence(false)}
                className="text-[11px] text-white/30 hover:text-white/70 transition-colors px-1">
                ✕
              </button>
            </div>
            <div className="p-3">
              <FakePage pageLines={activeMsg.pageLines} page={activeMsg.page} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature card
// ─────────────────────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="group p-5 sm:p-6 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all duration-300">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
        <Icon className="w-4 h-4 text-white/70" strokeWidth={1.8} />
      </div>

      <h3 className="text-sm font-semibold text-white mb-2 tracking-tight">
        {title}
      </h3>

      <p className="text-xs text-white/45 leading-relaxed">{desc}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step card
// ─────────────────────────────────────────────────────────────────────────────

function StepCard({ step }) {
  return (
    <div className="flex gap-4 sm:gap-6 items-start group">
      <div
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xs sm:text-sm font-mono font-bold shrink-0 transition-all duration-300 group-hover:scale-110"
        style={{
          backgroundColor: step.color + "33",
          border: `1px solid ${step.color}55`,
          color: step.color,
        }}>
        {step.num}
      </div>
      <div className="pt-0.5 sm:pt-1">
        <h3 className="text-sm font-semibold text-white mb-1.5">
          {step.title}
        </h3>
        <p className="text-xs text-white/45 leading-relaxed">{step.desc}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function LuminaLanding() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <SmoothScrollProvider>
      <div
        className="min-h-screen text-white overflow-x-hidden"
        style={{ background: "#0a0a0f" }}>
        {/* Grain texture */}
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px",
          }}
        />

        {/* Ambient glow blobs */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div
            className="absolute rounded-full opacity-15"
            style={{
              width: "min(600px,120vw)",
              height: "min(600px,120vw)",
              top: -160,
              left: "20%",
              background: "radial-gradient(circle, #8b5cf6, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute rounded-full opacity-10"
            style={{
              width: "min(400px,80vw)",
              height: "min(400px,80vw)",
              bottom: "20%",
              right: "-10%",
              background: "radial-gradient(circle, #06b6d4, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
        </div>

        <Navbar scrolled={scrolled} />

        {/* ── HERO ── */}
        <section className="relative z-10 pt-28 sm:pt-36 pb-14 sm:pb-24 px-4 sm:px-6">
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            {/* Grid */}
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: `
        linear-gradient(to right, white 1px, transparent 1px),
        linear-gradient(to bottom, white 1px, transparent 1px)
      `,
                backgroundSize: "64px 64px",
                maskImage:
                  "radial-gradient(circle at center, black 30%, transparent 80%)",
                WebkitMaskImage:
                  "radial-gradient(circle at center, black 30%, transparent 80%)",
              }}
            />

            {/* Radial fade */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at top center, rgba(255,255,255,0.03), transparent 60%)",
              }}
            />
          </div>
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] sm:text-xs text-white/50 mb-6 sm:mb-8 font-mono tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              RAG-powered document intelligence
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-5 sm:mb-6 leading-[1.1] tracking-tight [font-family:var(--font-playfair)]">
              Ask your PDFs
              <br />
              <span className="text-white/40">anything.</span>
            </h1>

            <p className="text-sm sm:text-base text-white/45 max-w-lg mx-auto mb-8 sm:mb-10 leading-relaxed">
              Lumina extracts precise answers from your documents and shows you
              exactly which pages back them up — no guessing, no hallucination.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/chat"
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-white text-[#0a0a0f] text-sm font-semibold hover:bg-white/90 transition-all hover:scale-105 shadow-lg shadow-black/20 text-center">
                Start for free →
              </a>
              <a
                href="#demo"
                className="w-full sm:w-auto px-6 py-3 rounded-full border border-white/15 text-white/70 text-sm hover:border-white/30 hover:text-white transition-all text-center">
                See the demo
              </a>
            </div>
          </div>
        </section>

        {/* ── DEMO ── */}
        <section
          id="demo"
          className="relative z-10 px-4 sm:px-6 pb-16 sm:pb-28">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6 sm:mb-8">
              <div className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-white/25 mb-3">
                Interactive Demo
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-white [font-family:var(--font-playfair)]">
                See it in action
              </h2>
              <p className="text-xs sm:text-sm text-white/40 mt-2 px-2">
                Step through a live conversation with a Q3 financial report
              </p>
            </div>
            <LiveDemo />
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section
          id="how"
          className="relative z-10 px-4 sm:px-6 py-14 sm:py-24 border-t border-white/5">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start md:items-center">
              <div>
                <div className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-white/25 mb-4">
                  How it works
                </div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-4 leading-tight [font-family:var(--font-playfair)]">
                  Three steps to
                  <br />
                  instant insight.
                </h2>
                <p className="text-sm text-white/40 leading-relaxed">
                  Lumina uses retrieval-augmented generation to ground every
                  answer in your document. No hallucination, no guesswork.
                </p>
              </div>
              <div className="space-y-6 sm:space-y-8">
                {STEPS.map((s) => (
                  <StepCard key={s.num} step={s} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section
          id="features"
          className="relative z-10 px-4 sm:px-6 py-14 sm:py-24 border-t border-white/5">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <div className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-white/25 mb-4">
                Features
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-white [font-family:var(--font-playfair)]">
                Everything you need.
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {FEATURE_CARDS.map((f, i) => (
                <FeatureCard key={f.title} {...f} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-28 border-t border-white/5">
          <div className="max-w-2xl mx-auto text-center">
            <div
              className="px-6 sm:px-10 py-10 sm:py-12 rounded-2xl sm:rounded-3xl border border-white/10 bg-white/3"
              style={{ backdropFilter: "blur(12px)" }}>
              <div className="text-2xl sm:text-3xl mb-4 [font-family:var(--font-playfair)] leading-snug">
                Ready to illuminate
                <br />
                your documents?
              </div>
              <p className="text-xs sm:text-sm text-white/40 mb-7 sm:mb-8 max-w-sm mx-auto leading-relaxed">
                Join researchers, analysts, and lawyers who've stopped
                ctrl+F‑ing through PDFs.
              </p>
              <a
                href="/chat"
                className="inline-flex items-center gap-2 px-7 sm:px-8 py-3 rounded-full bg-white text-[#0a0a0f] text-sm font-semibold hover:bg-white/90 transition-all hover:scale-105 shadow-xl shadow-black/30">
                Get started free →
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="relative z-10 px-4 sm:px-6 py-6 sm:py-8 border-t border-white/5">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-white/70 [font-family:var(--font-playfair)]">
                Lumina
              </span>
              <span className="text-[8px] uppercase tracking-[0.2em] text-white/25 font-mono">
                RAG
              </span>
            </div>
            <p className="text-xs text-white/20">
              Document intelligence, grounded in your content.
            </p>
          </div>
        </footer>
      </div>
    </SmoothScrollProvider>
  );
}
