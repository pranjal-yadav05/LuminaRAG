"use client";

import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export default function ViewerPanel({ images, mobile = false, onClose }) {
  const transformRef = useRef(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  if (!images || images.length === 0) {
    return (
      <div
        className={`${
          mobile ? "flex w-full h-full" : "hidden md:flex md:w-80 lg:w-96"
        } border-l border-border flex-col ${
          mobile ? "bg-background" : "bg-card"
        }`}>
        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No evidence yet</p>
          <p className="text-sm text-muted-foreground mt-1">
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
      className={`${
        mobile ? "flex w-full h-full" : "hidden md:flex md:w-80 lg:w-96"
      } border-l border-border flex-col ${
        mobile ? "bg-background" : "bg-card"
      }`}>
      {/* Image Container */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 bg-muted/20">
        {currentImage && currentImage.image_path ? (
          <div className="w-full space-y-3 animate-in fade-in duration-300">
            <div className="relative w-full max-w-2xl">
              <TransformWrapper
                initialScale={1}
                ref={transformRef}
                minScale={1}
                maxScale={4}
                doubleClick={{ mode: "zoomIn" }}
                wheel={{ step: 0.2 }}
                pinch={{ step: 5 }}>
                {({ resetTransform }) => (
                  <>
                    <TransformComponent>
                      <img
                        src={currentImage.image_path}
                        alt={`Page ${currentImage.page}`}
                        className="w-full h-auto object-contain rounded-lg"
                        onError={(e) => {
                          e.target.src =
                            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect fill="%23f3f4f6" width="400" height="500"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%236b7280">Image failed to load</text></svg>';
                        }}
                      />
                    </TransformComponent>
                    <button
                      onClick={() => {
                        transformRef.current?.resetTransform?.();
                      }}
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur px-2 py-1 text-xs rounded border">
                      Reset
                    </button>
                  </>
                )}
              </TransformWrapper>
            </div>

            {/* Page Info */}
            <div className="px-2 py-2 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs font-medium text-foreground">
                Page {currentImage.page}
              </p>
              {currentImage.types && currentImage.types.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {currentImage.types.map((type, idx) => {
                    const typeColors = {
                      direct:
                        "bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
                      evidence:
                        "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
                    };
                    const colors =
                      typeColors[type] ||
                      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
                    return (
                      <span
                        key={idx}
                        className={`inline-block text-xs font-medium px-2 py-1 rounded border ${colors}`}>
                        {type === "direct" ? "✓ Direct" : "◆ Evidence"}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Unable to load image
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      {hasMultiplePages && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
          <Button
            onClick={() => setCurrentPageIndex((i) => Math.max(0, i - 1))}
            disabled={currentPageIndex === 0}
            size="sm"
            variant="secondary">
            <ChevronLeft className="w-4 h-4" />
          </Button>

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

      {/* Highlight Legend */}
      <div className="px-5 py-4 border-t border-border/50 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Highlight Legend
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Direct answer</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-muted-foreground">Supporting evidence</span>
          </div>
        </div>
      </div>
    </div>
  );
}
