"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);

export default function TraceLines() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const path = document.getElementById("trace-path");
      const particle = document.getElementById("trace-particle");
      const nodes = document.querySelectorAll(".trace-node");

      // Set initial state — path is fully hidden
      gsap.set(path, { drawSVG: "0%" });
      gsap.set(particle, { opacity: 0 });
      gsap.set(nodes, { scale: 0, opacity: 0, transformOrigin: "center center" });

      // Main scroll-driven draw
      gsap.to(path, {
        drawSVG: "100%",
        ease: "none",
        scrollTrigger: {
          trigger: "body",
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      });

      // Particle follows the path
      gsap.to(particle, {
        opacity: 1,
        motionPath: {
          path: "#trace-path",
          align: "#trace-path",
          alignOrigin: [0.5, 0.5],
          autoRotate: false,
        },
        ease: "none",
        scrollTrigger: {
          trigger: "body",
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      });

      // Pop each node as it enters view
      nodes.forEach((node, i) => {
        gsap.to(node, {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          ease: "back.out(2)",
          scrollTrigger: {
            trigger: node,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });
      });

      // Pulse glow on particle
      gsap.to("#trace-particle-glow", {
        r: 10,
        opacity: 0,
        duration: 1.2,
        ease: "power2.out",
        repeat: -1,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed left-0 top-0 h-full pointer-events-none z-20"
      style={{ width: 48 }}
      aria-hidden="true"
    >
      <svg
        width="48"
        height="100%"
        viewBox="0 0 48 100"
        preserveAspectRatio="none"
        className="w-full h-full"
        style={{ overflow: "visible" }}
      >
        <defs>
          <filter id="glow-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="trace-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="40%" stopColor="#06b6d4" />
            <stop offset="70%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>

        {/* Static ghost path (very faint track) */}
        <path
          d="M24,0 C24,8 18,12 24,20 C30,28 18,32 24,40 C30,48 18,52 24,60 C30,68 18,72 24,80 C30,88 18,92 24,100"
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Animated draw path */}
        <path
          id="trace-path"
          d="M24,0 C24,8 18,12 24,20 C30,28 18,32 24,40 C30,48 18,52 24,60 C30,68 18,72 24,80 C30,88 18,92 24,100"
          fill="none"
          stroke="url(#trace-gradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          filter="url(#glow-filter)"
        />

        {/* Section nodes at 0%, 20%, 40%, 60%, 80%, 100% */}
        {[0, 20, 40, 60, 80, 100].map((pct, i) => {
          // Compute approximate y on the sine-wave path
          const y = pct;
          // x oscillates: center=24, offset follows the cubic bezier roughly
          const offsets = [0, -6, 0, 6, 0, -6, 0];
          const x = 24 + (offsets[i] || 0);
          const colors = ["#8b5cf6", "#7c3aed", "#06b6d4", "#0891b2", "#10b981", "#8b5cf6"];
          return (
            <g key={i} className="trace-node" style={{ transformOrigin: `${x}px ${y}%` }}>
              <circle
                cx={x}
                cy={`${y}%`}
                r="3.5"
                fill={colors[i]}
                fillOpacity="0.3"
                stroke={colors[i]}
                strokeWidth="1"
              />
              <circle
                cx={x}
                cy={`${y}%`}
                r="1.5"
                fill={colors[i]}
              />
            </g>
          );
        })}

        {/* Traveling particle */}
        <circle
          id="trace-particle-glow"
          cx="0"
          cy="0"
          r="6"
          fill="#8b5cf6"
          fillOpacity="0.3"
          filter="url(#glow-filter)"
        />
        <circle
          id="trace-particle"
          cx="0"
          cy="0"
          r="3"
          fill="#a78bfa"
          filter="url(#glow-filter)"
        />
      </svg>
    </div>
  );
}