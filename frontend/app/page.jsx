"use client";

import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { File, Image } from "lucide-react";
import DocumentPanel from "@/components/DocumentPanel";
import ChatPanel from "@/components/ChatPanel";
import ViewerPanel from "@/components/ViewerPanel";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";

export default function Home() {
  const [fileHash, setFileHash] = useState(null);
  const [sessionId] = useState(() => uuidv4());
  const [messages, setMessages] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("");
  const panelsRef = useRef(null);
  const [showDocMobile, setShowDocMobile] = useState(false);
  const [showViewerMobile, setShowViewerMobile] = useState(false);
  const [showStatusInfo, setShowStatusInfo] = useState(false);
  const [hasNewEvidence, setHasNewEvidence] = useState(false);
  const [showStatusTextMobile, setShowStatusTextMobile] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!processingStatus && !fileHash) return;

    setShowStatusTextMobile(true);

    const timer = setTimeout(() => {
      setShowStatusTextMobile(false);
    }, 2500); // adjust timing here

    return () => clearTimeout(timer);
  }, [processingStatus, fileHash]);

  const handleUpload = async (file) => {
    setFileName(file.name);
    setProcessingStatus("Uploading and processing PDF...");
    setMessages([]);
    setImages([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setFileHash(data.file_hash);
      setProcessingStatus(`Processed: ${data.chunks || 0} chunks`);
    } catch (error) {
      console.error("Upload error:", error);
      setProcessingStatus("Upload failed. Try again.");
    }
  };

  const handleSendMessage = async (query) => {
    if (!fileHash || !query.trim()) return;

    const userMessage = { role: "user", content: query, id: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          file_hash: fileHash,
          query,
        }),
      });

      if (!response.ok) throw new Error("Request failed");

      const data = await response.json();

      const assistantMessage = {
        role: "assistant",
        content: data.answer,
        highlights: data.highlights || [],
        id: Date.now() + 1,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.images && Array.isArray(data.images)) {
        const processedImages = data.images.map((img) => ({
          page: img.page,
          types: img.types || [],
          image_path: `${API_BASE_URL}/${img.image_path}`,
        }));
        setImages(processedImages);
        if (processedImages.length > 0 && !showViewerMobile) {
          setHasNewEvidence(true);
        }
      }
    } catch (error) {
      console.error("Ask error:", error);
      const errorMessage = {
        role: "assistant",
        content: "Error processing your question. Please try again.",
        id: Date.now() + 1,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusClick = (e) => {
    e.stopPropagation();

    if (processingStatus) {
      toast({
        title: "Processing",
        description: "Your document is being processed...",
      });
    } else if (fileHash) {
      toast({
        title: "Ready",
        description: "Your PDF is ready for questions.",
      });
    } else {
      toast({
        title: "No file",
        description: "Upload a PDF to get started.",
      });
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="border-b border-border h-14 flex items-center px-6 gap-3 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 cursor-default select-none">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg md:text-xl font-semibold tracking-tight [font-family:var(--font-playfair)]">
              Lumina
            </span>
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">
              RAG
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:hidden ml-2">
          <button
            onClick={() => setShowDocMobile(true)}
            aria-label="Open document panel"
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
        <button
          onClick={handleStatusClick}
          className="flex items-center gap-2 relative">
          {/* Mobile: animated swap */}
          <div className="md:hidden relative flex items-center">
            {/* DOT */}
            <span
              className={`absolute transition-all duration-300 ${
                showStatusTextMobile
                  ? "opacity-0 scale-75"
                  : "opacity-100 scale-100"
              } w-2 h-2 rounded-full ${
                processingStatus
                  ? "bg-blue-500 animate-pulse"
                  : fileHash
                    ? "bg-green-500"
                    : "bg-gray-400"
              }`}
            />

            {/* TEXT */}
            <span
              className={`transition-all duration-300 text-xs ${
                showStatusTextMobile
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-2"
              }`}>
              {processingStatus
                ? "Processing..."
                : fileHash
                  ? "Ready"
                  : "No file"}
            </span>
          </div>

          {/* Desktop (unchanged) */}
          <div className="hidden md:flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                processingStatus
                  ? "bg-blue-500 animate-pulse"
                  : fileHash
                    ? "bg-green-500"
                    : "bg-gray-400"
              }`}
            />
            <span>
              {processingStatus ? "Processing" : fileHash ? "Ready" : "No file"}
            </span>
          </div>
        </button>
      </div>

      {/* Main Content - 3 Panel Layout */}
      <div ref={panelsRef} className="flex-1 flex overflow-hidden">
        {/* LEFT: Document Panel */}
        <DocumentPanel
          fileHash={fileHash}
          fileName={fileName}
          processingStatus={processingStatus}
          onUpload={handleUpload}
        />

        {/* CENTER: Chat Panel */}
        <ChatPanel
          messages={messages}
          loading={loading}
          fileHash={fileHash}
          onSendMessage={handleSendMessage}
        />

        {/* RIGHT: Viewer Panel */}
        <ViewerPanel images={images} />
      </div>
      {/* </div> */}

      {/* Mobile Drawers */}
      {/* Document drawer (left) */}
      {showDocMobile && (
        <div className="fixed inset-0 z-50 md:hidden bg-background">
          {/* Header (optional but recommended) */}
          <div className="h-14 flex items-center px-4 border-b">
            <button
              onClick={() => setShowDocMobile(false)}
              className="text-sm font-medium">
              ← Back
            </button>
            <span className="ml-4 text-sm font-semibold">Document</span>
          </div>

          {/* Full panel */}
          <div className="h-[calc(100vh-56px)] overflow-hidden">
            <DocumentPanel
              mobile
              fileHash={fileHash}
              fileName={fileName}
              processingStatus={processingStatus}
              onUpload={handleUpload}
              onClose={() => setShowDocMobile(false)}
            />
          </div>
        </div>
      )}

      {/* Viewer drawer (right) */}
      {showViewerMobile && (
        <div className="fixed inset-0 z-50 md:hidden bg-background">
          {/* Header */}
          <div className="h-14 flex items-center px-4 border-b">
            <button
              onClick={() => setShowViewerMobile(false)}
              className="text-sm font-medium">
              ← Back
            </button>
            <span className="ml-4 text-sm font-semibold">Evidence</span>
          </div>

          {/* Full panel */}
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
