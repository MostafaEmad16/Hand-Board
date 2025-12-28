// src/components/NotesBoard.tsx
import { useState, useEffect, useRef, useCallback } from "react";

interface Note {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

interface Props {
  cursorX: number;
  cursorY: number;
  isPinching: boolean;
  visible?: boolean;
  onClearDrawing?: (noteId: string) => void;
}

const STORAGE_KEY = "sticky_notes_v1";

export function NotesBoard({
  cursorX,
  cursorY,
  isPinching,
  visible = true,
  onClearDrawing,
}: Props) {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Note[];
    } catch (err) {
      console.error(err);
    }
    return [
      { id: "1", x: 100, y: 100, text: "Hello — اكتب هنا", color: "#fef3c7" },
    ];
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [lastSpeechText, setLastSpeechText] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentRecognitionRef = useRef<any>(null);

  // Refs for buttons inside each note
  const buttonRefs = useRef<{
    [key: string]: {
      edit?: HTMLButtonElement | null;
      add?: HTMLButtonElement | null;
      mic?: HTMLButtonElement | null;
      del?: HTMLButtonElement | null;
      color?: HTMLButtonElement | null;
      clear?: HTMLButtonElement | null;
    };
  }>({});

  const [pressedButtons, setPressedButtons] = useState<{
    [key: string]: string[];
  }>({});

  // Speech recognition helper - declared before handlers
  const ensureRecognition = useCallback(() => {
    const win = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    const SpeechRecognition =
      win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const RecClass = SpeechRecognition as unknown as {
      new (): {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        onresult?: (ev: unknown) => void;
        onerror?: (ev: unknown) => void;
        onend?: () => void;
        start: () => void;
        stop: () => void;
      };
    };

    const rec = new RecClass();
    rec.lang = "ar-EG";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (ev: unknown) => {
      const e = ev as unknown as {
        resultIndex: number;
        results: Array<{ 0: { transcript: string }; isFinal: boolean }>;
      };
      let finalText = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalText += transcript + " ";
        }
      }

      // Add final text immediately
      if (finalText.trim() && selectedId) {
        const trimmed = finalText.trim();
        if (trimmed !== lastSpeechText) {
          setLastSpeechText(trimmed);
          setNotes((prev) =>
            prev.map((n) =>
              n.id === selectedId
                ? { ...n, text: n.text ? n.text + " " + trimmed : trimmed }
                : n
            )
          );
        }
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (ev: any) => {
      console.log("Speech recognition error:", ev.error);
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
    };
    return rec;
  }, [selectedId, lastSpeechText]);

  const handleButtonPress = useCallback(
    (noteId: string, btnType: string) => {
      if (btnType === "edit") {
        setSelectedId(noteId);
        setEditingId(noteId);
      } else if (btnType === "add") {
        addNote();
      } else if (btnType === "mic") {
        setSelectedId(noteId);
        if (!listening || selectedId !== noteId) {
          const rec = ensureRecognition();
          if (rec) {
            try {
              setLastSpeechText("");
              currentRecognitionRef.current = rec;
              rec.start();
              setListening(true);
            } catch (err) {
              console.error("Failed to start recognition:", err);
            }
          }
        } else {
          currentRecognitionRef.current?.stop();
          setListening(false);
        }
      } else if (btnType === "del") {
        setSelectedId(noteId);
        deleteNote(noteId);
      } else if (btnType === "color") {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  color: n.color === "#fef3c7" ? "#dcfce7" : "#fef3c7",
                }
              : n
          )
        );
      } else if (btnType === "clear") {
        // Ask parent to clear drawings (global signal)
        onClearDrawing?.(noteId);
      }
    },
    [listening, selectedId, ensureRecognition, onClearDrawing]
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  // Drag with pinch
  useEffect(() => {
    if (!visible) return;
    if (isPinching) {
      if (draggingId) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === draggingId
              ? { ...n, x: cursorX - offset.x, y: cursorY - offset.y }
              : n
          )
        );
      } else {
        // find note under cursor
        const target = notes.find(
          (n) =>
            cursorX >= n.x &&
            cursorX <= n.x + 340 &&
            cursorY >= n.y &&
            cursorY <= n.y + 280
        );
        if (target) {
          setDraggingId(target.id);
          setOffset({ x: cursorX - target.x, y: cursorY - target.y });
          setSelectedId(target.id);
        }
      }
    } else {
      setDraggingId(null);
    }
  }, [cursorX, cursorY, isPinching, notes, draggingId, offset, visible]);

  // Mouse drag support: allow dragging notes with mouse when drawing/hand is not in use
  useEffect(() => {
    if (!visible) return;
    if (!draggingId) return;

    const onMouseMove = (e: MouseEvent) => {
      if (isPinching) return; // don't interfere with hand control
      setNotes((prev) =>
        prev.map((n) =>
          n.id === draggingId
            ? { ...n, x: e.clientX - offset.x, y: e.clientY - offset.y }
            : n
        )
      );
    };

    const onMouseUp = () => {
      setDraggingId(null);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [draggingId, offset, isPinching, visible]);

  // Hand detection for buttons in notes
  useEffect(() => {
    const newPressed: { [key: string]: string[] } = {};

    notes.forEach((note) => {
      newPressed[note.id] = [];
      const buttons = buttonRefs.current[note.id];
      if (!buttons) return;

      // Check each button
      ["edit", "add", "mic", "del", "color", "clear"].forEach((btnType) => {
        const btn = buttons[btnType as keyof typeof buttons];
        if (!btn) return;

        const rect = btn.getBoundingClientRect();
        const isOver =
          cursorX >= rect.left &&
          cursorX <= rect.right &&
          cursorY >= rect.top &&
          cursorY <= rect.bottom;

        if (isOver && isPinching) {
          newPressed[note.id].push(btnType);
        }
      });
    });

    // Trigger actions for newly pressed buttons
    Object.entries(newPressed).forEach(([noteId, pressed]) => {
      const oldPressed = pressedButtons[noteId] || [];
      pressed.forEach((btnType) => {
        if (!oldPressed.includes(btnType)) {
          handleButtonPress(noteId, btnType);
        }
      });
    });

    setPressedButtons(newPressed);
  }, [cursorX, cursorY, isPinching, notes, pressedButtons, handleButtonPress]);

  function addNote() {
    const id = Date.now().toString();
    const randomX = Math.random() * (window.innerWidth - 340);
    const randomY = Math.random() * (window.innerHeight - 280);
    const x = Math.max(20, Math.min(randomX, window.innerWidth - 360));
    const y = Math.max(20, Math.min(randomY, window.innerHeight - 300));
    const newNote: Note = { id, x, y, text: "ملاحظة جديدة", color: "#fef3c7" };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedId(id);
    setEditingId(id);
  }

  function deleteNote(noteId: string) {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setSelectedId(null);
    setEditingId(null);
  }

  function updateText(id: string, text: string) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  }

  if (!visible) return null;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {notes.map((note) => {
        const pressed = pressedButtons[note.id] || [];
        if (!buttonRefs.current[note.id]) {
          buttonRefs.current[note.id] = {};
        }

        return (
          <div
            key={note.id}
            className="glass-panel"
            onClick={() => {
              setSelectedId(note.id);
            }}
            onDoubleClick={() => setEditingId(note.id)}
            onMouseDown={(e) => {
              // start mouse drag for this note (left button only)
              if (e.button !== 0) return;
              const target = e.target as HTMLElement;
              // don't start drag if clicking a button inside the note
              if (target.closest && target.closest("button")) return;
              setDraggingId(note.id);
              setOffset({ x: e.clientX - note.x, y: e.clientY - note.y });
              setSelectedId(note.id);
            }}
            style={{
              position: "absolute",
              left: note.x,
              top: note.y,
              width: 340,
              minHeight: 280,
              backgroundColor: note.color,
              color: "#1e293b",
              padding: "0.75rem",
              boxShadow:
                draggingId === note.id
                  ? "0 20px 25px -5px rgba(0,0,0,0.2)"
                  : undefined,
              cursor: draggingId === note.id ? "grabbing" : "grab",
              transform: draggingId === note.id ? "scale(1.05)" : "scale(1)",
              transition: "box-shadow 0.2s, transform 0.2s",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              pointerEvents: "auto",
              zIndex: selectedId === note.id ? 130 : 100,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <strong style={{ fontSize: 12 }}>ملاحظة</strong>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  ref={(el) => {
                    if (buttonRefs.current[note.id])
                      buttonRefs.current[note.id].edit = el;
                  }}
                  onClick={() => handleButtonPress(note.id, "edit")}
                  className="btn"
                  style={{
                    fontSize: 12,
                    padding: "6px 8px",
                    background: pressed.includes("edit")
                      ? "#1e40af"
                      : "#3b82f6",
                    color: "white",
                    border: pressed.includes("edit")
                      ? "1px solid #1e3a8a"
                      : "1px solid #60a5fa",
                    cursor: "pointer",
                    borderRadius: "4px",
                  }}
                >
                  ✎
                </button>

                <button
                  ref={(el) => {
                    if (buttonRefs.current[note.id])
                      buttonRefs.current[note.id].add = el;
                  }}
                  onClick={() => handleButtonPress(note.id, "add")}
                  className="btn"
                  style={{
                    padding: "6px 8px",
                    fontSize: 12,
                    fontWeight: "bold",
                    background: pressed.includes("add") ? "#1e40af" : "#3b82f6",
                    color: "white",
                    border: pressed.includes("add")
                      ? "1px solid #1e3a8a"
                      : "1px solid #60a5fa",
                    cursor: "pointer",
                    borderRadius: "4px",
                  }}
                >
                  +
                </button>

                <button
                  ref={(el) => {
                    if (buttonRefs.current[note.id])
                      buttonRefs.current[note.id].mic = el;
                  }}
                  onClick={() => handleButtonPress(note.id, "mic")}
                  className="btn"
                  style={{
                    padding: "6px 8px",
                    fontSize: 12,
                    background: pressed.includes("mic") ? "#1e40af" : "#3b82f6",
                    color: "white",
                    border: pressed.includes("mic")
                      ? "1px solid #1e3a8a"
                      : "1px solid #60a5fa",
                    cursor: "pointer",
                    borderRadius: "4px",
                  }}
                >
                  {listening && selectedId === note.id ? "⏹" : "🎤"}
                </button>

                <button
                  ref={(el) => {
                    if (buttonRefs.current[note.id])
                      buttonRefs.current[note.id].del = el;
                  }}
                  onClick={() => handleButtonPress(note.id, "del")}
                  className="btn"
                  style={{
                    padding: "6px 8px",
                    fontSize: 12,
                    fontWeight: "bold",
                    background: pressed.includes("del") ? "#1e40af" : "#3b82f6",
                    color: "white",
                    border: pressed.includes("del")
                      ? "1px solid #1e3a8a"
                      : "1px solid #60a5fa",
                    cursor: "pointer",
                    borderRadius: "4px",
                  }}
                >
                  -
                </button>
              </div>
            </div>

            {editingId === note.id ? (
              <textarea
                autoFocus
                value={note.text}
                onChange={(e) => updateText(note.id, e.target.value)}
                onBlur={() => setEditingId(null)}
                style={{
                  flex: 1,
                  resize: "none",
                  width: "100%",
                  minHeight: 160,
                  wordWrap: "break-word",
                  whiteSpace: "pre-wrap",
                }}
              />
            ) : (
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 14,
                  flex: 1,
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {note.text}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default NotesBoard;
