import { useRef, useEffect, useState } from "react";

interface Props {
  onToggleDrawing: () => void;
  drawingActive: boolean;
  onToggleWord: () => void;
  wordActive: boolean;
  cursorX: number;
  cursorY: number;
  isPinching: boolean;
}

export function Toolbar({
  onToggleDrawing,
  drawingActive,
  onToggleWord,
  wordActive,
  cursorX,
  cursorY,
  isPinching,
}: Props) {
  const wordButtonRef = useRef<HTMLButtonElement>(null);
  const drawingButtonRef = useRef<HTMLButtonElement>(null);
  const [wordPressed, setWordPressed] = useState(false);
  const [drawingPressed, setDrawingPressed] = useState(false);

  // Detect hand pinch on Drawing button
  useEffect(() => {
    const rect = drawingButtonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const isOver =
      cursorX >= rect.left &&
      cursorX <= rect.right &&
      cursorY >= rect.top &&
      cursorY <= rect.bottom;

    if (isOver && isPinching && !drawingPressed) {
      setDrawingPressed(true);
      onToggleDrawing();
    } else if (!isPinching) {
      setDrawingPressed(false);
    }
  }, [cursorX, cursorY, isPinching, onToggleDrawing, drawingPressed]);

  // Detect hand pinch on Word button
  useEffect(() => {
    const rect = wordButtonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const isOver =
      cursorX >= rect.left &&
      cursorX <= rect.right &&
      cursorY >= rect.top &&
      cursorY <= rect.bottom;

    if (isOver && isPinching && !wordPressed) {
      setWordPressed(true);
      onToggleWord();
    } else if (!isPinching) {
      setWordPressed(false);
    }
  }, [cursorX, cursorY, isPinching, onToggleWord, wordPressed]);

  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        top: "25%", // moved up a bit
        zIndex: 80,
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <button
        ref={wordButtonRef}
        onClick={onToggleWord}
        onMouseDown={() => setWordPressed(true)}
        onMouseUp={() => setWordPressed(false)}
        onBlur={() => setWordPressed(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onToggleWord();
        }}
        className="glass-panel"
        style={{
          width: 125,
          height: 125,
          borderRadius: 24,
          fontSize: 16,
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "8px",
          lineHeight: "1.2",
          background: wordActive
            ? "linear-gradient(135deg, #bbf7d0 0%, #34d399 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)",
          border: wordPressed ? "4px solid #059669" : "3px solid #10b981",
          cursor: "pointer",
          transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          boxShadow: wordPressed
            ? "0 0 0 6px rgba(5, 150, 105, 0.35), 0 12px 32px rgba(5, 150, 105, 0.25), inset 0 -2px 8px rgba(0,0,0,0.05)"
            : "0 10px 32px rgba(16, 185, 129, 0.2)",
          transform: wordPressed
            ? "scale(0.92) translateY(2px)"
            : "scale(1) translateY(0)",
          outline: "none",
          color: wordActive ? "#064e3b" : "#065f46",
        }}
        onMouseEnter={(e) => {
          const button = e.currentTarget as HTMLButtonElement;
          button.style.transform = "scale(1.08) translateY(-4px)";
          button.style.boxShadow = "0 15px 40px rgba(16, 185, 129, 0.35)";
        }}
        onMouseLeave={(e) => {
          const button = e.currentTarget as HTMLButtonElement;
          button.style.transform = "scale(1) translateY(0)";
          button.style.boxShadow = "0 10px 32px rgba(16, 185, 129, 0.2)";
        }}
        title="Word Editor"
      >
        Word
      </button>

      <button
        ref={drawingButtonRef}
        onClick={onToggleDrawing}
        onMouseDown={() => setDrawingPressed(true)}
        onMouseUp={() => setDrawingPressed(false)}
        onBlur={() => setDrawingPressed(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onToggleDrawing();
        }}
        className="glass-panel"
        style={{
          width: 125,
          height: 125,
          borderRadius: 24,
          fontSize: 16,
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "8px",
          lineHeight: "1.2",
          background: drawingActive
            ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #dbeafe 100%)",
          border: drawingPressed ? "4px solid #1e40af" : "3px solid #3b82f6",
          cursor: "pointer",
          transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          boxShadow: drawingPressed
            ? "0 0 0 6px rgba(30, 64, 175, 0.4), 0 12px 32px rgba(30, 64, 175, 0.35), inset 0 -2px 8px rgba(0,0,0,0.1)"
            : "0 10px 32px rgba(59, 130, 246, 0.25)",
          transform: drawingPressed
            ? "scale(0.92) translateY(2px)"
            : "scale(1) translateY(0)",
          outline: "none",
          color: drawingActive ? "#1e3a8a" : "#1e40af",
        }}
        onMouseEnter={(e) => {
          const button = e.currentTarget as HTMLButtonElement;
          button.style.transform = "scale(1.08) translateY(-4px)";
          button.style.boxShadow = "0 15px 40px rgba(59, 130, 246, 0.4)";
        }}
        onMouseLeave={(e) => {
          const button = e.currentTarget as HTMLButtonElement;
          button.style.transform = "scale(1) translateY(0)";
          button.style.boxShadow = "0 10px 32px rgba(59, 130, 246, 0.25)";
        }}
        title="Drawing"
      >
        Drawing
      </button>
    </div>
  );
}

export default Toolbar;
