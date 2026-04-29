"use client";

import { useState, useRef } from "react";
import { Upload, File, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DocumentPanel({
  fileHash,
  fileName,
  processingStatus,
  onUpload,
  mobile = false,
  onClose,
}) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]?.type === "application/pdf") {
      onUpload(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div
      className={`${
        mobile
          ? "flex w-full h-full"
          : "hidden md:flex md:w-64 lg:w-72"
      } border-r border-border ${mobile ? "bg-background" : "bg-card"} flex-col`}> 

      {/* Content */}
      <div className="flex-1 flex flex-col p-5 md:p-4 gap-5 overflow-y-auto">
        {/* Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border/50 hover:border-border"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            className="flex flex-col items-center justify-center gap-3 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}>
            <div className="p-2 rounded-lg bg-muted/50">
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium">Drag and drop PDF</p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse
              </p>
            </div>
          </div>
        </div>

        {/* File Info */}
        {fileHash && (
          <div className="space-y-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-green-700 dark:text-green-300">
                  File Ready
                </p>
              </div>
            </div>

            <div className="space-y-2 ml-6">
              {fileName && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Name</p>
                  <p className="text-xs font-mono bg-muted/50 rounded px-2 py-1 truncate">
                    {fileName}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1">Hash</p>
                <p className="text-xs font-mono bg-muted/50 rounded px-2 py-1 truncate">
                  {fileHash.slice(0, 12)}...
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                  {processingStatus}
                </p>
              </div>
            </div>
          </div>
        )}

        {!fileHash && processingStatus && (
          <div className="space-y-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  Processing
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              {processingStatus}
            </p>
          </div>
        )}

        {/* Quick Tips */}
        <div className="mt-auto pt-4 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            Quick Tips
          </p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Upload PDFs up to 50MB</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Ask questions about content</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">•</span>
              <span>See highlighted evidence</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
