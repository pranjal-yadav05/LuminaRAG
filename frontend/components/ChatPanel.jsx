"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatPanel({
  sessionTitle,
  messages,
  loading,
  fileHash,
  activeMessageId,
  onSendMessage,
  onSelectMessage, // (messageId, images) => void
}) {
  const [inputValue, setInputValue] = useState("");
  const [openHighlights, setOpenHighlights] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim() && fileHash && !loading) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && fileHash && !loading) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background border-r border-border overflow-hidden min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center gap-2 min-w-0 flex-shrink-0">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
          Chat
        </h2>

        {sessionTitle && (
          <>
            <span className="text-muted-foreground/40 text-xs shrink-0">•</span>

            <p className="text-sm font-medium truncate text-foreground/80 min-w-0">
              {sessionTitle}
            </p>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">
              {fileHash
                ? "Start asking questions"
                : "Upload a PDF to get started"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Ask anything about your document and get instant answers with
              visual evidence
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              const hasImages = isAssistant && message.images?.length > 0;
              const isActive = message.id === activeMessageId;

              return (
                <div
                  key={message.id}
                  className={`flex ${isAssistant ? "justify-start" : "justify-end"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div
                    className={`max-w-sm rounded-lg px-4 py-3 transition-all duration-200 ${
                      isAssistant
                        ? `bg-card border rounded-bl-none ${
                            hasImages
                              ? isActive
                                ? "border-primary/50 shadow-sm shadow-primary/10 cursor-pointer"
                                : "border-border hover:border-primary/30 cursor-pointer hover:shadow-sm"
                              : "border-border"
                          }`
                        : "bg-primary text-primary-foreground rounded-br-none"
                    }`}
                    onClick={() => {
                      if (hasImages && onSelectMessage) {
                        onSelectMessage(message.id, message.images);
                      }
                    }}
                    title={hasImages ? "Click to view evidence" : undefined}>
                    <p className="text-sm leading-relaxed">{message.content}</p>

                    {/* Evidence indicator badge */}
                    {hasImages && (
                      <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            isActive ? "bg-primary" : "bg-muted-foreground/40"
                          }`}
                        />
                        <span
                          className={`text-[10px] font-medium transition-colors ${
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground/60"
                          }`}>
                          {isActive
                            ? "Showing evidence"
                            : `${message.images.length} page${message.images.length > 1 ? "s" : ""} · click to view`}
                        </span>
                      </div>
                    )}

                    {/* Highlights accordion */}
                    {message.highlights?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenHighlights((prev) => ({
                              ...prev,
                              [message.id]: !prev[message.id],
                            }));
                          }}
                          className="text-xs font-medium opacity-75 hover:opacity-100 transition flex items-center gap-1">
                          Highlights
                          <ChevronDown
                            className={`w-3.5 h-3.5 opacity-70 transition-transform duration-300 ${
                              openHighlights[message.id] ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        <div
                          className={`transition-all duration-300 ease-in-out overflow-hidden ${
                            openHighlights[message.id]
                              ? "opacity-100 translate-y-0 mt-2"
                              : "max-h-0 opacity-0 -translate-y-1 mt-0"
                          }`}>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {message.highlights.map((h, i) => (
                              <span
                                key={i}
                                className={`inline-block text-xs px-2 py-1 rounded ${
                                  h.type === "direct"
                                    ? "bg-green-500/15 text-green-700 dark:text-green-300"
                                    : "bg-orange-500/15 text-orange-700 dark:text-orange-300"
                                }`}>
                                {h.text}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start animate-in fade-in">
                <div className="bg-card border border-border rounded-lg rounded-bl-none px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" />
                    <div
                      className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border/50 p-4 bg-background/50 backdrop-blur-sm safe-area-bottom">
        {!fileHash && (
          <p className="text-xs text-muted-foreground text-center mb-3">
            Upload a PDF to start chatting
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={fileHash ? "Ask a question..." : "Upload a PDF first"}
            disabled={!fileHash || loading}
            className="flex-1 min-h-10 px-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows="1"
          />
          <Button
            onClick={handleSend}
            disabled={!fileHash || loading || !inputValue.trim()}
            size="sm"
            className="px-3 h-10 flex-shrink-0">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
