"use client";

import { useState, useCallback } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export function usePDFAssistant(token) {
  const [files, setFiles]                   = useState([]);
  const [sessions, setSessions]             = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeFileId, setActiveFileId]     = useState(null);
  const [activeMessageId, setActiveMessageId] = useState(null); // which assistant msg is shown in viewer
  const [messages, setMessages]             = useState([]);
  const [images, setImages]                 = useState([]);
  const [loading, setLoading]               = useState(false);
  const [fileName, setFileName]             = useState(null);
  const [fileId, setFileId]                 = useState(null);
  const [processingStatus, setProcessingStatus] = useState("");
  const [error, setError]                   = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  // ── helpers ───────────────────────────────────────────────────────────────

  const resolveImageUrl = (image_url) => {
    if (!image_url) return null;
    if (image_url.startsWith("http")) return image_url;
    return `${API_BASE_URL}${image_url}`;
  };

  const mapMessage = (m, idx, sessionId) => ({
    role:       m.role,
    content:    m.content,
    highlights: m.highlights || [],
    images: (m.images || []).map((img) => ({
      page:       img.page,
      types:      img.types || [],
      image_path: resolveImageUrl(img.image_url),
    })),
    id:         m.id ?? `${sessionId}-${idx}`,
    created_at: m.created_at,
  });

  // ── select a specific message's evidence in the viewer ────────────────────

  /**
   * Called when the user clicks an assistant message bubble.
   * Updates the viewer to show that message's images and marks it active.
   */
  const selectMessage = useCallback((messageId, messageImages) => {
    setActiveMessageId(messageId);
    setImages(messageImages);
  }, []);

  // ── fetch all files with nested sessions ──────────────────────────────────

  const fetchChatHistory = useCallback(async () => {
    if (!token) return;
    setSessionsLoading(true);
    try {
      const filesRes = await fetch(`${API_BASE_URL}/files`, {
        headers: authHeaders(),
      });
      if (!filesRes.ok) throw new Error("Failed to fetch files");
      const fileList = await filesRes.json();

      const filesWithSessions = await Promise.all(
        (Array.isArray(fileList) ? fileList : []).map(async (file) => {
          try {
            const sessRes = await fetch(
              `${API_BASE_URL}/files/${file.file_id}/sessions`,
              { headers: authHeaders() }
            );
            const sessData = sessRes.ok ? await sessRes.json() : [];
            return { ...file, sessions: Array.isArray(sessData) ? sessData : [] };
          } catch {
            return { ...file, sessions: [] };
          }
        })
      );

      setFiles(filesWithSessions);
      const flat = filesWithSessions.flatMap((f) =>
        f.sessions.map((s) => ({ ...s, file_name: f.file_name }))
      );
      setSessions(flat);
    } catch (e) {
      console.error("fetchChatHistory error:", e);
    } finally {
      setSessionsLoading(false);
    }
  }, [token, authHeaders]);

  const fetchSessions = fetchChatHistory;

  // ── load a session ────────────────────────────────────────────────────────

  const loadSession = useCallback(
    async (sessionId) => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error("Failed to load session");
        const data = await res.json();

        setActiveSessionId(data.session_id);
        setActiveFileId(data.file_id || null);
        setError(null);

        const matchedSession = sessions.find((s) => s.session_id === data.session_id);
        const matchedFile    = files.find((f) => f.file_id === data.file_id);
        setFileName(
          matchedSession?.file_name || matchedFile?.file_name || data.file_name || null
        );
        setFileId(data.file_id || null);

        const mapped = (data.messages || []).map((m, i) =>
          mapMessage(m, i, data.session_id)
        );
        setMessages(mapped);

        // Show the last assistant message's images in the viewer
        const lastAssistant = [...mapped].reverse().find((m) => m.role === "assistant");
        if (lastAssistant?.images?.length) {
          setImages(lastAssistant.images);
          setActiveMessageId(lastAssistant.id);
        } else {
          setImages([]);
          setActiveMessageId(null);
        }

        setProcessingStatus(data.file_id ? "Ready" : "");
      } catch (e) {
        console.error("Load session error:", e);
        setError(e.message);
      }
    },
    [token, authHeaders, sessions, files]
  );

  // ── upload PDF ────────────────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (file) => {
      setFileName(file.name);
      setProcessingStatus("Uploading and processing PDF...");
      setMessages([]);
      setImages([]);
      setActiveMessageId(null);
      setError(null);
      setActiveSessionId(null);
      setActiveFileId(null);
      setFileId(null);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_BASE_URL}/upload-pdf`, {
          method:  "POST",
          headers: authHeaders(),
          body:    formData,
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();

        setActiveSessionId(data.session_id);
        setActiveFileId(data.file_id);
        setFileId(data.file_id);
        setProcessingStatus("Ready");

        await fetchChatHistory();
      } catch (err) {
        setError(err.message);
        setProcessingStatus("Upload failed. Try again.");
        console.error("Upload error:", err);
      }
    },
    [authHeaders, fetchChatHistory]
  );

  // ── ask ───────────────────────────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (query) => {
      if (!activeSessionId || !query.trim()) return;

      const userMessage = {
        role: "user", content: query,
        id: Date.now(), highlights: [], images: [],
      };
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE_URL}/sessions/${activeSessionId}/ask`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body:    JSON.stringify({ query }),
          }
        );
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();

        const processedImages = (data.images || []).map((img) => ({
          page:       img.page,
          types:      img.types || [],
          image_path: resolveImageUrl(img.image_url),
        }));

        const assistantId = Date.now() + 1;
        const assistantMessage = {
          role:       "assistant",
          content:    data.answer,
          highlights: data.highlights || [],
          images:     processedImages,
          id:         assistantId,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Always update viewer to the newest response
        setImages(processedImages);
        setActiveMessageId(assistantId);

        await fetchChatHistory();
      } catch (err) {
        setError(err.message);
        const errorId = Date.now() + 1;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${err.message}. Please try again.`,
            id: errorId, highlights: [], images: [],
          },
        ]);
        console.error("Ask error:", err);
      } finally {
        setLoading(false);
      }
    },
    [activeSessionId, authHeaders]
  );

  // ── new session on existing file ──────────────────────────────────────────

  const startNewSessionOnFile = useCallback(
    async (fId) => {
      if (!token || !fId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/files/${fId}/sessions`, {
          method:  "POST",
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error("Failed to create session");
        const data = await res.json();

        setActiveSessionId(data.session_id);
        setActiveFileId(fId);
        setMessages([]);
        setImages([]);
        setActiveMessageId(null);
        setError(null);
        setProcessingStatus("Ready");

        const matchedFile = files.find((f) => f.file_id === fId);
        setFileName(matchedFile?.file_name || null);
        setFileId(fId);

        await fetchChatHistory();
      } catch (err) {
        console.error("startNewSessionOnFile error:", err);
        setError(err.message);
      }
    },
    [token, authHeaders, files, fetchChatHistory]
  );

  // ── delete session ────────────────────────────────────────────────────────

  const deleteSession = useCallback(
    async (sessionId) => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
          method:  "DELETE",
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error("Failed to delete session");

        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
        setFiles((prev) =>
          prev.map((f) => ({
            ...f,
            sessions: f.sessions.filter((s) => s.session_id !== sessionId),
          }))
        );

        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
          setActiveFileId(null);
          setMessages([]);
          setImages([]);
          setActiveMessageId(null);
          setFileId(null);
          setFileName(null);
          setProcessingStatus("");
        }
      } catch (err) {
        console.error("deleteSession error:", err);
        setError(err.message);
      }
    },
    [token, authHeaders, activeSessionId]
  );

  // ── delete file ───────────────────────────────────────────────────────────

  const deleteFile = useCallback(
    async (fId) => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/files/${fId}`, {
          method:  "DELETE",
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error("Failed to delete file");

        const deletedFile       = files.find((f) => f.file_id === fId);
        const deletedSessionIds = new Set(
          (deletedFile?.sessions || []).map((s) => s.session_id)
        );

        setFiles((prev) => prev.filter((f) => f.file_id !== fId));
        setSessions((prev) => prev.filter((s) => !deletedSessionIds.has(s.session_id)));

        if (activeFileId === fId) {
          setActiveSessionId(null);
          setActiveFileId(null);
          setMessages([]);
          setImages([]);
          setActiveMessageId(null);
          setFileId(null);
          setFileName(null);
          setProcessingStatus("");
        }
      } catch (err) {
        console.error("deleteFile error:", err);
        setError(err.message);
      }
    },
    [token, authHeaders, files, activeFileId]
  );

  // ── rename session ────────────────────────────────────────────────────────

  const renameSession = useCallback(
    async (sessionId, title) => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body:    JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error("Failed to rename session");

        setSessions((prev) =>
          prev.map((s) => (s.session_id === sessionId ? { ...s, title } : s))
        );
        setFiles((prev) =>
          prev.map((f) => ({
            ...f,
            sessions: f.sessions.map((s) =>
              s.session_id === sessionId ? { ...s, title } : s
            ),
          }))
        );
      } catch (err) {
        console.error("renameSession error:", err);
        setError(err.message);
      }
    },
    [token, authHeaders]
  );

  // ── legacy helpers ────────────────────────────────────────────────────────

  const startNewSession = useCallback(() => {
    setActiveSessionId(null);
    setActiveFileId(null);
    setMessages([]);
    setImages([]);
    setActiveMessageId(null);
    setFileName(null);
    setFileId(null);
    setProcessingStatus("");
    setError(null);
  }, []);

  const resetAll = useCallback(() => {
    setActiveSessionId(null);
    setActiveFileId(null);
    setMessages([]);
    setImages([]);
    setActiveMessageId(null);
    setLoading(false);
    setFileName(null);
    setFileId(null);
    setProcessingStatus("");
    setError(null);
    setSessions([]);
    setFiles([]);
  }, []);

  return {
    // data
    files,
    sessions,
    sessionsLoading,
    activeSessionId,
    activeFileId,
    activeMessageId,
    fileId,
    fileName,
    messages,
    images,
    loading,
    processingStatus,
    error,

    // actions
    fetchSessions,
    fetchChatHistory,
    loadSession,
    startNewSession,
    startNewSessionOnFile,
    deleteSession,
    deleteFile,
    renameSession,
    selectMessage,
    handleUpload,
    handleSendMessage,
    resetAll,

    // legacy compat
    fileHash:  fileId,
    sessionId: activeSessionId,
  };
}