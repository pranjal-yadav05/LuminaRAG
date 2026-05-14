"use client";

import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export default function ViewerPanel({ images, mobile = false, onClose }) {
  const transformRef = useRef(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div
        className={`
        flex flex-col h-full
        ${mobile ? "w-full h-full" : "flex w-full h-full"}
        border-l border-border
        ${mobile ? "bg-background" : "bg-card"}
      `}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No evidence yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ask a question to see highlighted pages
          </p>
        </div>
      </div>
    );
  }

  const currentImage = images[currentPageIndex];
  const hasMultiplePages = images.length > 1;

  return (
    <div
      className={`
        flex flex-col h-full
        ${mobile ? "w-full" : "flex w-full h-full"}
        border-l border-border
        ${mobile ? "bg-background" : "bg-card"}
        overflow-hidden
      `}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-sm font-medium text-foreground">
          Evidence viewer
        </span>
        {hasMultiplePages && (
          <span className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-full px-2.5 py-0.5">
            Page {currentImage.page}
          </span>
        )}
      </div>

      {/* ✅ KEY FIX: flex-1 + min-h-0 lets this grow but not overflow */}
      <div className="flex-1 min-h-0 flex flex-col p-3 bg-muted/20 overflow-hidden">
        {currentImage?.image_path ? (
          <div className="relative flex-1 min-h-0 w-full">
            <TransformWrapper
              ref={transformRef}
              initialScale={1}
              minScale={1}
              maxScale={4}
              doubleClick={{ mode: "zoomIn" }}
              wheel={{ step: 0.2 }}
              pinch={{ step: 5 }}>
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
                contentStyle={{ width: "100%", height: "100%" }}>
                <img
                  src={currentImage.image_path}
                  alt={`Page ${currentImage.page}`}
                  className="w-full h-full object-contain rounded-md"
                  onError={(e) => {
                    e.target.src =
                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect fill="%23f3f4f6" width="400" height="500"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%236b7280">Image failed to load</text></svg>';
                  }}
                />
              </TransformComponent>
            </TransformWrapper>

            <button
              onClick={() => transformRef.current?.resetTransform?.()}
              className="absolute top-2 right-2 bg-background/80 backdrop-blur px-2 py-1 text-xs rounded border border-border z-10">
              Reset
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-7 h-7 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">
              Unable to load image
            </p>
          </div>
        )}

        {/* Type badges — inside the image area, below the image */}
        {currentImage?.types?.length > 0 && (
          <div className="flex-shrink-0 flex flex-wrap gap-1.5 pt-2">
            {currentImage.types.map((type, idx) => {
              const styles = {
                direct:
                  "bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
                evidence:
                  "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
              };
              return (
                <span
                  key={idx}
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${styles[type] ?? "bg-blue-500/10 text-blue-700 border-blue-200"}`}>
                  {type === "direct" ? "✓ Direct" : "◆ Evidence"}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ Legend — flex-shrink-0 keeps it always visible */}
      <div className="flex-shrink-0 flex items-center gap-4 px-4 py-2 border-t border-border/50">
        <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          Legend
        </p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
            Direct
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
            Evidence
          </span>
        </div>
      </div>

      {/* ✅ Nav — flex-shrink-0 keeps it always visible at the bottom */}
      {hasMultiplePages && (
        <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-2 border-t border-border/50 bg-background">
          <Button
            onClick={() => setCurrentPageIndex((i) => Math.max(0, i - 1))}
            disabled={currentPageIndex === 0}
            size="sm"
            variant="secondary">
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Page dots */}
          <div className="flex gap-1.5 items-center">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPageIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === currentPageIndex
                    ? "bg-foreground scale-125"
                    : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <Button
            onClick={() =>
              setCurrentPageIndex((i) => Math.min(images.length - 1, i + 1))
            }
            disabled={currentPageIndex === images.length - 1}
            size="sm"
            variant="secondary">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
