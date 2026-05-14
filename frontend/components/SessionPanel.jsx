"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Plus,
  Loader2,
  MessageSquare,
  Clock,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  FolderOpen,
} from "lucide-react";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getDocInitials(name) {
  if (!name) return "?";
  const base = name.replace(/\.pdf$/i, "");
  const words = base.split(/[\s_\-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function hashColor(str) {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++)
    h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 55%, 62%)`;
}

// ── Inline rename input ───────────────────────────────────────────────────────
function RenameInput({ initial, onSave, onCancel }) {
  const [value, setValue] = useState(initial || "");
  const inputRef = useRef(null);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== initial) onSave(trimmed);
    else onCancel();
  };

  return (
    <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onCancel();
        }}
        className="flex-1 min-w-0 text-[11px] bg-background border border-primary/40 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <button
        onClick={commit}
        className="p-0.5 rounded hover:bg-green-500/20 text-green-600 shrink-0"
      >
        <Check className="w-3 h-3" />
      </button>
      <button
        onClick={onCancel}
        className="p-0.5 rounded hover:bg-destructive/20 text-destructive shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── File group (collapsible) ──────────────────────────────────────────────────
function FileGroup({
  file,
  activeSessionId,
  onSelectSession,
  onNewSessionOnFile,
  onDeleteSession,
  onDeleteFile,
  onRenameSession,
}) {
  const [expanded, setExpanded] = useState(true);
  const [renamingSessionId, setRenamingSessionId] = useState(null);
  const [confirmDeleteFileId, setConfirmDeleteFileId] = useState(null);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState(null);

  const color = hashColor(file.file_id);
  const initials = getDocInitials(file.file_name);
  const baseName = (file.file_name || "Untitled").replace(/\.pdf$/i, "");
  const sessions = file.sessions || [];
  const hasActiveSession = sessions.some(
    (s) => s.session_id === activeSessionId
  );

  return (
    <div className="mb-1">
      {/* File header row */}
      <div
        className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group transition-all ${
          hasActiveSession
            ? "bg-primary/5 border border-primary/10"
            : "hover:bg-muted/20 border border-transparent"
        }`}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-muted-foreground/60 hover:text-muted-foreground"
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>

        {/* Avatar */}
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          {initials}
        </div>

        {/* File name */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-[11px] font-semibold truncate text-foreground/80 group-hover:text-foreground">
            {baseName}
          </p>
          <p className="text-[10px] text-muted-foreground/50">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </p>
        </button>

        {/* Actions: new session + delete file */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNewSessionOnFile(file.file_id);
            }}
            title="New session"
            className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary"
          >
            <Plus className="w-3 h-3" />
          </button>

          {confirmDeleteFileId === file.file_id ? (
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  onDeleteFile(file.file_id);
                  setConfirmDeleteFileId(null);
                }}
                className="p-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30"
                title="Confirm delete"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => setConfirmDeleteFileId(null)}
                className="p-1 rounded hover:bg-muted/40 text-muted-foreground"
                title="Cancel"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDeleteFileId(file.file_id);
              }}
              title="Delete file"
              className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Sessions list */}
      {expanded && sessions.length > 0 && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/40 pl-2">
          {sessions
            .slice()
            .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
            .map((session) => {
              const isActive = session.session_id === activeSessionId;
              const isRenaming = renamingSessionId === session.session_id;
              const isConfirmingDelete = confirmDeleteSessionId === session.session_id;
              const displayTitle =
                session.title ||
                `Session ${session.session_id.slice(0, 6)}…`;

              return (
                <div
                  key={session.session_id}
                  onClick={() => !isRenaming && onSelectSession(session.session_id)}
                  className={`flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer group transition-all ${
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/30 border border-transparent"
                  }`}
                >
                  <MessageSquare
                    className={`w-3 h-3 mt-0.5 shrink-0 ${
                      isActive ? "text-primary" : "text-muted-foreground/40"
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <RenameInput
                        initial={session.title || ""}
                        onSave={(title) => {
                          onRenameSession(session.session_id, title);
                          setRenamingSessionId(null);
                        }}
                        onCancel={() => setRenamingSessionId(null)}
                      />
                    ) : (
                      <>
                        <p
                          className={`text-[11px] font-medium truncate leading-tight ${
                            isActive
                              ? "text-primary"
                              : "text-foreground/70 group-hover:text-foreground"
                          }`}
                        >
                          {displayTitle}
                        </p>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {timeAgo(session.updated_at || session.created_at)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Session actions */}
                  {!isRenaming && (
                    <div
                      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isConfirmingDelete ? (
                        <>
                          <button
                            onClick={() => {
                              onDeleteSession(session.session_id);
                              setConfirmDeleteSessionId(null);
                            }}
                            className="p-0.5 rounded bg-destructive/20 text-destructive hover:bg-destructive/30"
                            title="Confirm delete"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteSessionId(null)}
                            className="p-0.5 rounded hover:bg-muted/40 text-muted-foreground"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setRenamingSessionId(session.session_id)}
                            title="Rename"
                            className="p-0.5 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteSessionId(session.session_id)}
                            title="Delete session"
                            className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {expanded && sessions.length === 0 && (
        <div className="ml-6 mt-0.5 px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground/50 italic">No sessions yet</p>
        </div>
      )}
    </div>
  );
}

// ── Main SessionPanel ─────────────────────────────────────────────────────────
export default function SessionPanel({
  files = [],
  sessions = [],           // kept for legacy compat; prefer files[]
  sessionsLoading,
  activeSessionId,
  fileId,
  fileHash,                // legacy alias
  fileName,
  processingStatus,
  onUpload,
  onSelectSession,
  onNewSession,
  onNewSessionOnFile,
  onDeleteSession,
  onDeleteFile,
  onRenameSession,
  mobile = false,
}) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type === "application/pdf") onUpload(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  };

  const isProcessing = processingStatus && processingStatus !== "Ready";
  const readySignal = fileId || fileHash; // support both

  // Use files[] if populated (new API), otherwise fall back to flat sessions[]
  const useFileGroups = files && files.length > 0;

  return (
    <div
      className={`${
        mobile ? "flex w-full h-full" : "flex w-full h-full"
      } border-r border-border bg-card flex-col`}
    >
      {/* Panel header */}
      <div className="px-4 py-3.5 border-b border-border/50 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {useFileGroups ? "Files & Sessions" : "Sessions"}
        </h2>
        <button
          onClick={onNewSession}
          title="New session"
          className="p-1.5 rounded-md hover:bg-muted/40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Upload area */}
        <div className="p-3">
          <div
            className={`relative border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border/40 hover:border-border/70 hover:bg-muted/10"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-muted/50 shrink-0">
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium leading-tight">
                  {isProcessing
                    ? "Processing…"
                    : readySignal && fileName
                    ? "Upload another PDF"
                    : "Upload PDF"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {isProcessing
                    ? processingStatus
                    : "drag & drop or click to browse"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Loading…</span>
            </div>
          ) : useFileGroups ? (
            /* ── File-grouped view ── */
            <div className="space-y-0.5 mt-0.5">
              {files
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.created_at) - new Date(a.created_at)
                )
                .map((file) => (
                  <FileGroup
                    key={file.file_id}
                    file={file}
                    activeSessionId={activeSessionId}
                    onSelectSession={onSelectSession}
                    onNewSessionOnFile={onNewSessionOnFile || (() => {})}
                    onDeleteSession={onDeleteSession || (() => {})}
                    onDeleteFile={onDeleteFile || (() => {})}
                    onRenameSession={onRenameSession || (() => {})}
                  />
                ))}
            </div>
          ) : sessions.length === 0 ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center mb-3">
                <FolderOpen className="w-5 h-5 text-muted-foreground/50" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">No sessions yet</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                Upload a PDF to start
              </p>
            </div>
          ) : (
            /* ── Legacy flat session list (fallback) ── */
            <div className="space-y-0.5 mt-0.5">
              {sessions
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.updated_at) - new Date(a.updated_at)
                )
                .map((session) => {
                  const isActive = session.session_id === activeSessionId;
                  const docName = session.file_name || "Untitled";
                  const docBase = docName.replace(/\.pdf$/i, "");
                  const color = hashColor(session.file_id || session.session_id);
                  const initials = getDocInitials(docName);

                  return (
                    <button
                      key={session.session_id}
                      onClick={() => onSelectSession(session.session_id)}
                      className={`w-full text-left rounded-lg px-2.5 py-2.5 transition-all group ${
                        isActive
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted/30 border border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                          style={{ backgroundColor: color }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-[11px] font-semibold truncate leading-tight ${
                              isActive ? "text-primary" : "text-foreground/80"
                            }`}
                          >
                            {session.title || docBase}
                          </p>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {timeAgo(session.updated_at || session.created_at)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Footer tips */}
        <div className="px-4 py-3 border-t border-border/50">
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li className="flex gap-2 items-start">
              <span className="text-primary font-bold shrink-0">•</span>
              Each PDF can have multiple sessions
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-primary font-bold shrink-0">•</span>
              Sessions persist across logins
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}