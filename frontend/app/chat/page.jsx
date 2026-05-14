"use client";

import { useState, useRef, useEffect } from "react";
import { File, Image, LogOut, Moon, Sun } from "lucide-react";
import { useCallback } from "react";
import SessionPanel from "@/components/SessionPanel";
import ChatPanel from "@/components/ChatPanel";
import ViewerPanel from "@/components/ViewerPanel";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { usePDFAssistant } from "@/hooks/usePDFAssistant";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "../../components/AuthModal";

export default function Home() {
  const {
    token,
    isAuthenticated,
    isHydrated,
    authLoading,
    authError,
    login,
    signup,
    logout,
    clearAuthError,
  } = useAuth();

  const {
    // data
    files,
    sessions,
    sessionsLoading,
    fetchChatHistory,
    loadSession,
    startNewSession,
    startNewSessionOnFile,
    deleteSession,
    deleteFile,
    renameSession,
    activeSessionId,
    activeMessageId,

    // active session state
    fileId,
    fileHash, // legacy alias — same value as fileId
    fileName,
    messages,
    images,
    loading,
    processingStatus,

    // actions
    handleUpload,
    handleSendMessage,
    selectMessage,
    resetAll,
  } = usePDFAssistant(token);

  const [showDocMobile, setShowDocMobile] = useState(false);
  const [showViewerMobile, setShowViewerMobile] = useState(false);
  const [hasNewEvidence, setHasNewEvidence] = useState(false);
  const [showStatusTextMobile, setShowStatusTextMobile] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("lumina-dark-mode");
    if (stored !== null) return stored === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const toggleDark = () => {
    setDarkMode((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("lumina-dark-mode", String(next));
      return next;
    });
  };

  // ── Resizable panels ───────────────────────────────────────────────────────
  const [leftWidth, setLeftWidth] = useState(272); // md:w-64 = 256, lg:w-72 = 288
  const [rightWidth, setRightWidth] = useState(320); // md:w-80 = 320
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  const startResizeLeft = useCallback(
    (e) => {
      isResizingLeft.current = true;
      const startX = e.clientX;
      const startW = leftWidth;
      const onMove = (ev) => {
        if (!isResizingLeft.current) return;
        const next = Math.min(480, Math.max(180, startW + ev.clientX - startX));
        setLeftWidth(next);
      };
      const onUp = () => {
        isResizingLeft.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [leftWidth],
  );

  const startResizeRight = useCallback(
    (e) => {
      isResizingRight.current = true;
      const startX = e.clientX;
      const startW = rightWidth;
      const onMove = (ev) => {
        if (!isResizingRight.current) return;
        const next = Math.min(
          600,
          Math.max(220, startW - (ev.clientX - startX)),
        );
        setRightWidth(next);
      };
      const onUp = () => {
        isResizingRight.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [rightWidth],
  );

  // Fetch files + sessions once authenticated
  useEffect(() => {
    if (isAuthenticated) fetchChatHistory();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!processingStatus && !fileId) return;
    setShowStatusTextMobile(true);
    const timer = setTimeout(() => setShowStatusTextMobile(false), 2500);
    return () => clearTimeout(timer);
  }, [processingStatus, fileId]);

  useEffect(() => {
    if (images.length > 0 && !showViewerMobile) setHasNewEvidence(true);
  }, [images]);

  const handleLogout = () => {
    resetAll();
    logout();
    toast({ title: "Signed out", description: "See you next time." });
  };

  const handleSelectSession = (sessionId) => {
    loadSession(sessionId);
    setShowDocMobile(false);
  };

  const handleNewSession = () => {
    startNewSession();
    setShowDocMobile(false);
  };

  const handleNewSessionOnFile = async (fId) => {
    await startNewSessionOnFile(fId);
    setShowDocMobile(false);
  };

  const handleDeleteSession = async (sessionId) => {
    await deleteSession(sessionId);
    toast({ title: "Session deleted" });
  };

  const handleDeleteFile = async (fId) => {
    await deleteFile(fId);
    toast({ title: "File deleted", description: "All sessions removed." });
  };

  const handleRenameSession = async (sessionId, title) => {
    await renameSession(sessionId, title);
  };

  const activeSessionTitle = files
    ?.flatMap((file) => file.sessions || [])
    ?.find((s) => s.session_id === activeSessionId)?.title;

  // When the user clicks an assistant message, show its evidence and (on
  // mobile) open the viewer drawer automatically.
  const handleSelectMessage = (messageId, messageImages) => {
    selectMessage(messageId, messageImages);
    if (window.innerWidth < 768) {
      setShowViewerMobile(true);
      setHasNewEvidence(false);
    }
  };

  const handleStatusClick = () => {
    if (processingStatus && processingStatus !== "Ready") {
      toast({
        title: "Processing",
        description: "Your document is being processed…",
      });
    } else if (fileId) {
      toast({
        title: "Ready",
        description: "Your PDF is ready for questions.",
      });
    } else {
      toast({ title: "No file", description: "Upload a PDF to get started." });
    }
  };

  if (!isHydrated) return null;

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Auth modal */}
      {!isAuthenticated && (
        <AuthModal
          onLogin={login}
          onSignup={signup}
          authLoading={authLoading}
          authError={authError}
          onClearError={clearAuthError}
        />
      )}

      {/* Header */}
      <div className="border-b border-border h-14 flex items-center px-6 gap-3 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <a
          href="/"
          className="flex items-center gap-2 select-none hover:opacity-80 transition-opacity">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl md:text-xl font-semibold tracking-tight [font-family:var(--font-playfair)]">
              Lumina
            </span>
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">
              RAG
            </span>
          </div>
        </a>

        {/* Mobile panel toggles */}
        <div className="flex items-center gap-2 md:hidden ml-2">
          <button
            onClick={() => setShowDocMobile(true)}
            aria-label="Open sessions panel"
            className="p-2 rounded hover:bg-muted/10">
            <File className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => {
              setShowViewerMobile(true);
              setHasNewEvidence(false);
            }}
            aria-label="Open evidence panel"
            className={`relative p-2 rounded hover:bg-muted/10 ${
              hasNewEvidence ? "bg-primary/10" : ""
            }`}>
            <Image
              className={`w-4 h-4 ${
                hasNewEvidence ? "text-primary" : "text-muted-foreground"
              }`}
            />
            {hasNewEvidence && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {/* Status indicator */}
        <button onClick={handleStatusClick} className="flex items-center gap-2">
          {/* Mobile animated swap */}
          <div className="md:hidden relative flex items-center h-4 w-20">
            <span
              className={`absolute transition-all duration-300 ${
                showStatusTextMobile
                  ? "opacity-0 scale-75"
                  : "opacity-100 scale-100"
              } w-2 h-2 rounded-full ${
                processingStatus && processingStatus !== "Ready"
                  ? "bg-blue-500 animate-pulse"
                  : fileId
                    ? "bg-green-500"
                    : "bg-gray-400"
              }`}
            />
            <span
              className={`transition-all font-mono duration-300 text-xs ${
                showStatusTextMobile
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-2"
              }`}>
              {processingStatus && processingStatus !== "Ready"
                ? "Processing"
                : fileId
                  ? "Ready"
                  : "No file"}
            </span>
          </div>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                processingStatus && processingStatus !== "Ready"
                  ? "bg-blue-500 animate-pulse"
                  : fileId
                    ? "bg-green-500"
                    : "bg-gray-400"
              }`}
            />
            <span className="font-mono text-xs">
              {processingStatus && processingStatus !== "Ready"
                ? "Processing"
                : fileId
                  ? "Ready"
                  : "No file"}
            </span>
          </div>
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          aria-label="Toggle dark mode"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground">
          {darkMode ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Logout */}
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded-lg hover:bg-muted/30">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        )}
      </div>

      {/* Main 3-panel layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT: Session Panel */}
        <div
          className="hidden md:flex flex-col flex-shrink-0 overflow-hidden"
          style={{ width: leftWidth }}>
          <SessionPanel
            files={files}
            sessions={sessions}
            sessionsLoading={sessionsLoading}
            activeSessionId={activeSessionId}
            fileId={fileId}
            fileHash={fileHash}
            fileName={fileName}
            processingStatus={processingStatus}
            onUpload={handleUpload}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onNewSessionOnFile={handleNewSessionOnFile}
            onDeleteSession={handleDeleteSession}
            onDeleteFile={handleDeleteFile}
            onRenameSession={handleRenameSession}
          />
        </div>

        {/* Left resize handle */}
        <div
          onMouseDown={startResizeLeft}
          className="hidden md:flex w-1 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors bg-transparent flex-shrink-0 z-10"
          title="Drag to resize"
        />

        {/* CENTER: Chat Panel */}
        <ChatPanel
          messages={messages}
          loading={loading}
          sessionTitle={activeSessionTitle}
          fileHash={fileId} // ChatPanel checks this for "ready" state
          activeMessageId={activeMessageId}
          onSendMessage={handleSendMessage}
          onSelectMessage={handleSelectMessage}
        />

        {/* Right resize handle */}
        <div
          onMouseDown={startResizeRight}
          className="hidden md:flex w-1 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors bg-transparent flex-shrink-0 z-10"
          title="Drag to resize"
        />

        {/* RIGHT: Viewer Panel */}
        <div
          className="hidden md:block relative flex-shrink-0 h-full overflow-hidden z-0"
          style={{ width: rightWidth }}>
          <ViewerPanel images={images} />
        </div>
      </div>

      {/* Mobile Drawers */}
      {showDocMobile && (
        <div className="fixed inset-0 z-50 md:hidden bg-background">
          <div className="h-14 flex items-center px-4 border-b">
            <button
              onClick={() => setShowDocMobile(false)}
              className="text-sm font-medium">
              ← Back
            </button>
            <span className="ml-4 text-sm font-semibold">Files & Sessions</span>
          </div>
          <div className="h-[calc(100vh-56px)] overflow-hidden">
            <SessionPanel
              mobile
              files={files}
              sessions={sessions}
              sessionsLoading={sessionsLoading}
              activeSessionId={activeSessionId}
              fileId={fileId}
              fileHash={fileHash}
              fileName={fileName}
              processingStatus={processingStatus}
              onUpload={handleUpload}
              onSelectSession={handleSelectSession}
              onNewSession={handleNewSession}
              onNewSessionOnFile={handleNewSessionOnFile}
              onDeleteSession={handleDeleteSession}
              onDeleteFile={handleDeleteFile}
              onRenameSession={handleRenameSession}
            />
          </div>
        </div>
      )}

      {showViewerMobile && (
        <div className="fixed inset-0 z-50 md:hidden bg-background">
          <div className="h-14 flex items-center px-4 border-b">
            <button
              onClick={() => setShowViewerMobile(false)}
              className="text-sm font-medium">
              ← Back
            </button>
            <span className="ml-4 text-sm font-semibold">Evidence</span>
          </div>
          <div className="h-[calc(100vh-56px)] overflow-hidden">
            <ViewerPanel
              images={images}
              mobile
              onClose={() => setShowViewerMobile(false)}
            />
          </div>
        </div>
      )}

      <div className="relative z-[100]">
        <Toaster />
      </div>
    </div>
  );
}
