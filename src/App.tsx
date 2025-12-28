// src/App.tsx
import { useState } from "react";
import { VideoFeed } from "./components/VideoFeed";
import { CanvasOverlay } from "./components/CanvasOverlay";
import { NotesBoard } from "./components/NotesBoard";
import Toolbar from "./components/Toolbar";
import WordEditor from "./components/WordEditor";
import { useHandTracking } from "./hooks/useHandTracking";
import { useGestureEngine } from "./hooks/useGestureEngine";

function App() {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null
  );
  const [drawingColor, setDrawingColor] = useState("#3b82f6");
  const [clearSignal, setClearSignal] = useState(0);

  const [drawingActive, setDrawingActive] = useState(false);
  const [wordVisible, setWordVisible] = useState(false);
  const [brushSize, setBrushSize] = useState(4);
  const [sessionName, setSessionName] = useState("New Drawing Session");

  // 1. Hand Tracking from Video
  const landmarks = useHandTracking(videoElement);

  // 2. Gesture Engine
  const { cursorX, cursorY, isPinching, isFist } = useGestureEngine(
    landmarks,
    window.innerWidth,
    window.innerHeight
  );

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Background / Video Input */}
      <VideoFeed onStreamReady={setVideoElement} />

      {/* Main UI Area */}
      <h1
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 10,
          fontSize: "1.5rem",
          textShadow: "0 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        Touchless Interface{" "}
        <span style={{ fontSize: "0.8em", opacity: 0.7 }}>v1.0</span>
      </h1>

      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 10,
          display: "flex",
          gap: "0.5rem",
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: "0.5rem 1rem",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <span>Status:</span>
          {landmarks ? (
            <span style={{ color: "#4ade80" }}>● Detectado</span>
          ) : (
            <span style={{ color: "#f87171" }}>● Procurando mão...</span>
          )}
        </div>
      </div>

      {/* Interactive Layer */}
      <NotesBoard
        cursorX={cursorX}
        cursorY={cursorY}
        isPinching={isPinching}
        visible={false}
        onClearDrawing={() => setClearSignal(Date.now())}
      />

      <WordEditor
        visible={wordVisible}
        onClose={() => setWordVisible(false)}
        cursorX={cursorX}
        cursorY={cursorY}
        isPinching={isPinching}
      />

      <CanvasOverlay
        cursorX={cursorX}
        cursorY={cursorY}
        isPinching={isPinching}
        drawingEnabled={drawingActive && !isFist}
        color={drawingColor}
        brushSize={brushSize}
        clearSignal={clearSignal}
      />

      <Toolbar
        onToggleDrawing={() => setDrawingActive((d) => !d)}
        drawingActive={drawingActive}
        onToggleWord={() => setWordVisible((w) => !w)}
        wordActive={wordVisible}
        cursorX={cursorX}
        cursorY={cursorY}
        isPinching={isPinching}
      />

      {/* Controls Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 60,
          display: "flex",
          gap: "1rem",
        }}
      >
        <div
          className="glass-panel"
          style={{ padding: "10px", display: "flex", gap: "10px" }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 12 }}>Session Name</div>
            <input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              style={{ width: 200 }}
            />
            <div style={{ fontSize: 12 }}>Brush Size</div>
            <input
              type="range"
              min={1}
              max={40}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
            />
          </div>
          <button
            className="btn"
            style={{ background: "#ef4444" }}
            onClick={() => setClearSignal(Date.now())}
          >
            Clear
          </button>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: "bold" }}>Color:</div>
            {[
              { color: "#000000", name: "Black" },
              { color: "#3b82f6", name: "Blue" },
              { color: "#ef4444", name: "Red" },
              { color: "#10b981", name: "Green" },
              { color: "#f59e0b", name: "Yellow" },
              { color: "#a78bfa", name: "Purple" },
            ].map((c) => (
              <button
                key={c.color}
                onClick={() => setDrawingColor(c.color)}
                className="btn"
                title={c.name}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: c.color,
                  border:
                    drawingColor === c.color
                      ? "3px solid white"
                      : "2px solid #ddd",
                  padding: 0,
                  cursor: "pointer",
                  boxShadow:
                    drawingColor === c.color
                      ? `0 0 0 2px ${c.color}, 0 2px 8px rgba(0,0,0,0.2)`
                      : "0 2px 4px rgba(0,0,0,0.1)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
