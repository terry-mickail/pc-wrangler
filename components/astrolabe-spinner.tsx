"use client";

import React from "react";

/* Spinning Six Axes astrolabe. Drop this in wherever the old inventory emblem
   renders. The disc rotates slowly about its center; pass a size (px) and an
   optional spin duration (seconds). Respects prefers-reduced-motion. */
export default function AstrolabeSpinner({
  size = 200,
  duration = 70,
}: {
  size?: number;
  duration?: number;
}) {
  return (
    <div style={{ width: size, height: size, position: "relative", margin: "0 auto" }} aria-hidden="true">
      <style>{`
        @keyframes astrolabeSpin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: no-preference) {
          .astrolabe-disc { animation: astrolabeSpin ${duration}s linear infinite; }
        }
      `}</style>
      <img
        src="/astrolabe.png"
        alt=""
        draggable={false}
        className="astrolabe-disc"
        style={{ width: "100%", height: "100%", transformOrigin: "50% 50%", userSelect: "none" }}
      />
    </div>
  );
}
