// src/components/CanvasOverlay.tsx
import { useEffect, useRef } from "react";

interface Props {
  cursorX: number;
  cursorY: number;
  isPinching: boolean;
  drawingEnabled: boolean;
  color: string;
  brushSize?: number;
  clearSignal?: number;
}

export function CanvasOverlay({
  cursorX,
  cursorY,
  isPinching,
  drawingEnabled,
  color,
  brushSize = 4,
  clearSignal,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    cvs.width = window.innerWidth;
    cvs.height = window.innerHeight;
  }, []);

  // Drawing Logic (touchless via pinch)
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    // Exclude bottom control panel area (bottom 120px)
    const bottomExcludeArea = 120;
    const isInExcludedArea = cursorY > window.innerHeight - bottomExcludeArea;

    if (isPinching && drawingEnabled && !isInExcludedArea) {
      if (lastPos.current) {
        // Draw line
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(cursorX, cursorY);
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.stroke();
      }
      lastPos.current = { x: cursorX, y: cursorY };
    } else if (!isPinching) {
      // Lift pen when not pinching (keep lastPos null so mouse drawing can take over)
      lastPos.current = null;
    }
  }, [cursorX, cursorY, isPinching, drawingEnabled, color, brushSize]);

  // Mouse drawing fallback: allow drawing with the mouse when drawing mode is enabled
  useEffect(() => {
    const mouseDrawing = { active: false };

    const onMouseDown = (e: MouseEvent) => {
      if (!drawingEnabled) return;
      if (e.button !== 0) return; // left button only
      const x = e.clientX;
      const y = e.clientY;
      const bottomExcludeArea = 120;
      if (y > window.innerHeight - bottomExcludeArea) return;
      mouseDrawing.active = true;
      lastPos.current = { x, y };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!mouseDrawing.active) return;
      const x = e.clientX;
      const y = e.clientY;
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      if (lastPos.current) {
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.stroke();
      }
      lastPos.current = { x, y };
    };

    const onMouseUp = () => {
      mouseDrawing.active = false;
      lastPos.current = null;
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [drawingEnabled, color, brushSize]);

  // Clear canvas when clearSignal changes
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
  }, [clearSignal]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {/* Drawing Layer */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      {/* Cursor */}
      <div
        style={{
          position: "absolute",
          transform: `translate(${cursorX}px, ${cursorY}px)`,
          left: -12, // Center cursor (24px width)
          top: -12,
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: `2px solid ${isPinching ? color : "white"}`,
          backgroundColor: isPinching ? "rgba(255,255,255,0.3)" : "transparent",
          boxShadow: "0 0 10px rgba(0,0,0,0.5)",
          transition: "transform 0.05s linear",
          zIndex: 10000, // Always on top
        }}
      />
    </div>
  );
}
