"use client";

import { useRef } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  maxTiltDeg?: number;
};

export function TiltCard({ children, className = "", maxTiltDeg = 8 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const rx = (py - 0.5) * (maxTiltDeg * 2);
    const ry = (px - 0.5) * -(maxTiltDeg * 2);
    el.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg)`;
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`card border-neon border-neon-glow ${className}`}
      style={{ transition: "transform 160ms ease-out" }}
    >
      {children}
    </div>
  );
}


