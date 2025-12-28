import { useRef, useState, useEffect, useCallback } from "react";

interface Props {
  visible: boolean;
  onClose: () => void;
  cursorX: number;
  cursorY: number;
  isPinching: boolean;
}

export default function WordEditor({
  visible,
  onClose,
  cursorX,
  cursorY,
  isPinching,
}: Props) {
  const [activeTab, setActiveTab] = useState<"home" | "insert" | "layout">(
    "home"
  );
  const [fontName, setFontName] = useState<string>("Arial");
  const [fontSize, setFontSize] = useState<number>(3); // 1..7 for execCommand fontSize
  const [pageWidth, setPageWidth] = useState<number>(800);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait"
  );
  const editorRef = useRef<HTMLDivElement | null>(null);
  const ribbonRef = useRef<HTMLDivElement | null>(null);
  const boldRef = useRef<HTMLButtonElement | null>(null);
  const italicRef = useRef<HTMLButtonElement | null>(null);
  const underlineRef = useRef<HTMLButtonElement | null>(null);
  const leftRef = useRef<HTMLButtonElement | null>(null);
  const centerRef = useRef<HTMLButtonElement | null>(null);
  const rightRef = useRef<HTMLButtonElement | null>(null);
  const unorderedRef = useRef<HTMLButtonElement | null>(null);
  const orderedRef = useRef<HTMLButtonElement | null>(null);
  const imageRef = useRef<HTMLButtonElement | null>(null);
  const tableRef = useRef<HTMLButtonElement | null>(null);
  const textInsertRef = useRef<HTMLButtonElement | null>(null);
  const colorRef = useRef<HTMLInputElement | null>(null);
  const fontSelectRef = useRef<HTMLSelectElement | null>(null);
  const fontSizeSelectRef = useRef<HTMLSelectElement | null>(null);
  const pageWidthRef = useRef<HTMLInputElement | null>(null);
  const ribbonSliderRef = useRef<HTMLInputElement | null>(null);
  const saveDocxRef = useRef<HTMLButtonElement | null>(null);
  const savePdfRef = useRef<HTMLButtonElement | null>(null);
  const [openedFileName, setOpenedFileName] = useState<string | null>(null);
  const [openedFileType, setOpenedFileType] = useState<"docx" | "pdf" | null>(
    null
  );
  const [openedFileBuffer, setOpenedFileBuffer] = useState<ArrayBuffer | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pdfNumPages, setPdfNumPages] = useState<number>(0);
  // PDF rendering/annotation refs
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfAnnotCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfScale, setPdfScale] = useState<number>(1.5);
  const [annotColor, setAnnotColor] = useState<string>("#ff0000");
  const [annotWidth, setAnnotWidth] = useState<number>(3);
  const pdfPagesRef = useRef<HTMLDivElement | null>(null);
  const annotCanvasesRef = useRef<HTMLCanvasElement[]>([]);
  const pdfDocRef = useRef<any | null>(null);

  const [sliderValue, setSliderValue] = useState(0);
  const [scrollMax, setScrollMax] = useState(0);

  const [controlsPressed, setControlsPressed] = useState<
    Record<string, boolean>
  >({});

  // Ensure editor starts with a black-colored paragraph so typing defaults to black
  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML.trim() === "") {
      editorRef.current.innerHTML = '<p style="color:#000000"><br></p>';
    }
  }, []);

  // Keep slider max and value in sync with ribbon scroll when the editor opens or tab changes
  useEffect(() => {
    const r = ribbonRef.current;
    if (!r) return;
    const update = () => {
      const max = Math.max(0, r.scrollWidth - r.clientWidth);
      setScrollMax(Math.round(max));
      setSliderValue(Math.round(r.scrollLeft));
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [visible, activeTab]);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const insertImage = useCallback(() => {
    const url = prompt("Enter image URL");
    if (url) exec("insertImage", url);
  }, [exec]);

  const insertTable = useCallback(() => {
    const rows = Number(prompt("Rows", "2")) || 2;
    const cols = Number(prompt("Cols", "2")) || 2;
    let html = "<table style='width:100%; border-collapse: collapse;'>";
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += "<td style='border: 1px solid #ccc; padding:6px'>&nbsp;</td>";
      }
      html += "</tr>";
    }
    html += "</table><p></p>";
    exec("insertHTML", html);
  }, [exec]);

  const changeFontName = useCallback(
    (name: string) => {
      setFontName(name);
      exec("fontName", name);
    },
    [exec]
  );

  const changeFontSize = useCallback(
    (size: number) => {
      setFontSize(size);
      exec("fontSize", String(size));
    },
    [exec]
  );

  // --- Save handlers ---
  const saveAsDocx = useCallback(async () => {
    if (!editorRef.current) return;

    // Try to dynamically import docx; fallback to .doc (HTML) if not available
    try {
      // Use computed module name + /* @vite-ignore */ so Vite can't pre-resolve it at build-time
      const docxName = "doc" + "x";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docxModule = await import(/* @vite-ignore */ docxName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { Document, Packer, Paragraph } = docxModule as any;

      const paras: string[] = [];
      const pEls = editorRef.current.querySelectorAll("p");
      if (pEls.length) {
        pEls.forEach((p) => paras.push(p.innerText));
      } else {
        paras.push(editorRef.current.innerText || "");
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paras.map((t) => new Paragraph(t)),
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename =
        openedFileName?.replace(/\.(docx?|doc)$/i, ".docx") || "document.docx";
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback: save as .doc (HTML blob) so Word can open it
      const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>${editorRef.current.innerHTML}</body></html>`;
      const blob = new Blob([html], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename =
        openedFileName?.replace(/\.(docx?|doc)$/i, ".doc") || "document.doc";
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, []);

  const saveAsPdf = useCallback(async () => {
    if (!editorRef.current) return;

    try {
      // Use computed module names + /* @vite-ignore */ so Vite can't pre-resolve them at build-time
      const html2canvasName = "html2" + "canvas";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2canvasMod = await import(/* @vite-ignore */ html2canvasName);
      const jspdfName = "js" + "pdf";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jspdfMod = await import(/* @vite-ignore */ jspdfName);
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const html2canvas =
        (html2canvasMod as any).default || (html2canvasMod as any);
      const jsPDF = (jspdfMod as any).default || (jspdfMod as any);
      /* eslint-enable @typescript-eslint/no-explicit-any */

      const container = editorRef.current.parentElement as HTMLElement | null;
      if (!container) return;

      const canvas = await html2canvas(container, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("document.pdf");
    } catch (err) {
      // Fallback: save document as HTML file so user can open/print it
      const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>${editorRef.current.innerHTML}</body></html>`;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.html";
      a.click();
      URL.revokeObjectURL(url);
    }
  }, []);

  const onOpenFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name || "";

    if (name.toLowerCase().endsWith(".docx")) {
      try {
        const ab = await file.arrayBuffer();
        // Dynamic import 'mammoth' to convert .docx to HTML in the browser
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mammothMod = await import(/* @vite-ignore */ "mammoth");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mammoth = (mammothMod as any).default || (mammothMod as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await (mammoth as any).convertToHtml(
          {
            arrayBuffer: ab,
          },
          {
            convertImage: (image: any) => {
              return image.read("base64").then((imageBuffer: string) => {
                return {
                  src: `data:${image.contentType};base64,${imageBuffer}`,
                };
              });
            },
          }
        );
        if (editorRef.current) editorRef.current.innerHTML = res.value || "";
        setOpenedFileName(file.name);
        setOpenedFileType("docx");
      } catch (err) {
        alert(
          "Failed to open .docx: " +
            String(err) +
            ".\nTry installing 'mammoth' (npm i mammoth)."
        );
      }
    } else if (name.toLowerCase().endsWith(".pdf")) {
      try {
        const ab = await file.arrayBuffer();
        // dynamic import pdfjs (legacy build) and set worker
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfjsLib = await import("pdfjs-dist");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.js",
          import.meta.url
        ).toString();
        const loadingTask = (pdfjsLib as any).getDocument({ data: ab });
        const pdf = await loadingTask.promise;
        setPdfNumPages(pdf.numPages || 0);
        // render all pages into the pages container so we can scroll
        const pagesContainer = pdfPagesRef.current;
        if (!pagesContainer) return;
        // clear previous content
        pagesContainer.innerHTML = "";
        annotCanvasesRef.current = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: pdfScale });

          // wrapper for page + annotation canvas
          const wrapper = document.createElement("div");
          wrapper.style.position = "relative";
          wrapper.style.marginBottom = "12px";
          wrapper.style.width = Math.floor(viewport.width) + "px";
          wrapper.style.maxWidth = "100%";
          wrapper.style.display = "flex";
          wrapper.style.justifyContent = "center";

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = Math.floor(viewport.width);
          pageCanvas.height = Math.floor(viewport.height);
          pageCanvas.style.width = "100%"; // make it responsive inside wrapper
          pageCanvas.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)";

          const ctx = pageCanvas.getContext("2d");
          if (ctx) await page.render({ canvasContext: ctx, viewport }).promise;

          // annotation canvas overlay
          const aCanvas = document.createElement("canvas");
          aCanvas.width = pageCanvas.width;
          aCanvas.height = pageCanvas.height;
          aCanvas.style.position = "absolute";
          aCanvas.style.left = "0";
          aCanvas.style.top = "0";
          aCanvas.style.pointerEvents = "auto";
          aCanvas.style.width = "100%"; // responsive to wrapper scaling

          // attach drawing handlers
          const aCtx = aCanvas.getContext("2d");
          if (aCtx) {
            aCtx.lineCap = "round";
            aCtx.lineJoin = "round";
            aCtx.strokeStyle = annotColor;
            aCtx.lineWidth = annotWidth;
          }

          let drawing = false;
          let lastPos: { x: number; y: number } | null = null;

          const getPos = (e: PointerEvent) => {
            const rect = aCanvas.getBoundingClientRect();
            return {
              x: ((e.clientX - rect.left) * aCanvas.width) / rect.width,
              y: ((e.clientY - rect.top) * aCanvas.height) / rect.height,
            };
          };

          const onDown = (e: PointerEvent) => {
            drawing = true;
            lastPos = getPos(e);
            try {
              (e.target as Element).setPointerCapture?.(e.pointerId);
            } catch (e) {}
          };

          const onMove = (e: PointerEvent) => {
            if (!drawing || !lastPos) return;
            const pos = getPos(e);
            const ctx2 = aCtx;
            if (!ctx2) return;
            ctx2.beginPath();
            ctx2.moveTo(lastPos.x, lastPos.y);
            ctx2.lineTo(pos.x, pos.y);
            ctx2.stroke();
            lastPos = pos;
          };

          const onUp = (e: PointerEvent) => {
            drawing = false;
            lastPos = null;
            try {
              (e.target as Element).releasePointerCapture?.(e.pointerId);
            } catch (e) {}
          };

          aCanvas.addEventListener("pointerdown", onDown);
          aCanvas.addEventListener("pointermove", onMove);
          aCanvas.addEventListener("pointerup", onUp);

          // keep track for clear/save
          annotCanvasesRef.current.push(aCanvas);

          wrapper.appendChild(pageCanvas);
          wrapper.appendChild(aCanvas);
          pagesContainer.appendChild(wrapper);
        }

        // reset scroll to top so user sees first page at open
        pagesContainer.scrollTop = 0;

        setOpenedFileBuffer(ab);
        setOpenedFileName(file.name);
        setOpenedFileType("pdf");
      } catch (err) {
        alert("Failed to open PDF: " + String(err));
      }
    } else {
      alert("Unsupported file type. Only .docx is supported for edit.");
    }

    if (e.target) e.target.value = "";
  };

  const saveOpenedFile = async () => {
    if (!openedFileType) return;

    if (openedFileType === "docx") {
      // reuse existing saveAsDocx to export current content using opened filename
      try {
        await saveAsDocx();
        alert("Saved .docx");
      } catch (err) {
        alert("Failed to save .docx: " + String(err));
      }
      return;
    }

    if (openedFileType === "pdf") {
      if (!openedFileBuffer) return alert("No PDF loaded");
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfLib = await import(/* @vite-ignore */ "pdf-lib");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const PDFDocument = (pdfLib as any).PDFDocument;
        const pdfDoc = await PDFDocument.load(openedFileBuffer);

        const pages = pdfDoc.getPages();
        for (let i = 0; i < annotCanvasesRef.current.length; i++) {
          const aCanvas = annotCanvasesRef.current[i];
          if (!aCanvas) continue;
          const aCtx = aCanvas.getContext("2d");
          const imgData = aCtx?.getImageData(
            0,
            0,
            aCanvas.width,
            aCanvas.height
          );
          let hasDraw = false;
          if (imgData) {
            for (let p = 3; p < imgData.data.length; p += 4) {
              if (imgData.data[p] !== 0) {
                hasDraw = true;
                break;
              }
            }
          }

          if (hasDraw && pages[i]) {
            const pngDataUrl = aCanvas.toDataURL("image/png");
            const pngImage = await pdfDoc.embedPng(pngDataUrl);
            const page = pages[i];
            const { width, height } = page.getSize();
            page.drawImage(pngImage, { x: 0, y: 0, width, height });
          }
        }

        const bytes = await pdfDoc.save();
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const filename =
          openedFileName?.replace(/\.pdf$/i, ".pdf") || "document.pdf";
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        alert("Saved PDF");
      } catch (err) {
        alert("Failed to save PDF: " + String(err));
      }
      return;
    }
  };

  const clearPdfAnnotations = () => {
    annotCanvasesRef.current.forEach((c) => {
      const ctx = c.getContext("2d");
      ctx?.clearRect(0, 0, c.width, c.height);
    });
  };

  const closeOpenedFile = () => {
    setOpenedFileName(null);
    setOpenedFileType(null);
    setOpenedFileBuffer(null);

    // Clear pages container and annotations
    const pages = pdfPagesRef.current;
    if (pages) pages.innerHTML = "";
    annotCanvasesRef.current = [];

    const a = pdfAnnotCanvasRef.current;
    if (a) {
      const ctx = a.getContext("2d");
      ctx?.clearRect(0, 0, a.width, a.height);
    }
    const c = pdfCanvasRef.current;
    if (c) {
      const ctx2 = c.getContext("2d");
      ctx2?.clearRect(0, 0, c.width, c.height);
    }
  };

  // Reference to loaded PDF document (pdfjs)
  // Render PDF pages from ArrayBuffer using current pdfScale
  const renderPdfPages = async (ab: ArrayBuffer, scale: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjsLib = await import("pdfjs-dist");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.js",
      import.meta.url
    ).toString();

    const loadingTask = (pdfjsLib as any).getDocument({ data: ab });
    const pdf = await loadingTask.promise;
    pdfDocRef.current = pdf;
    setPdfNumPages(pdf.numPages || 0);

    const pagesContainer = pdfPagesRef.current;
    if (!pagesContainer) return;

    // clear previous content and canvases
    pagesContainer.innerHTML = "";
    annotCanvasesRef.current = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });

      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.marginBottom = "12px";
      wrapper.style.width = Math.floor(viewport.width) + "px";
      wrapper.style.maxWidth = "100%";
      wrapper.style.display = "flex";
      wrapper.style.justifyContent = "center";

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = Math.floor(viewport.width);
      pageCanvas.height = Math.floor(viewport.height);
      pageCanvas.style.width = "100%";
      pageCanvas.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)";

      const ctx = pageCanvas.getContext("2d");
      if (ctx) await page.render({ canvasContext: ctx, viewport }).promise;

      const aCanvas = document.createElement("canvas");
      aCanvas.width = pageCanvas.width;
      aCanvas.height = pageCanvas.height;
      aCanvas.style.position = "absolute";
      aCanvas.style.left = "0";
      aCanvas.style.top = "0";
      aCanvas.style.pointerEvents = "auto";
      aCanvas.style.width = "100%";

      const aCtx = aCanvas.getContext("2d");
      if (aCtx) {
        aCtx.lineCap = "round";
        aCtx.lineJoin = "round";
        aCtx.strokeStyle = annotColor;
        aCtx.lineWidth = annotWidth;
      }

      let drawing = false;
      let lastPos: { x: number; y: number } | null = null;

      const getPos = (e: PointerEvent) => {
        const rect = aCanvas.getBoundingClientRect();
        return {
          x: ((e.clientX - rect.left) * aCanvas.width) / rect.width,
          y: ((e.clientY - rect.top) * aCanvas.height) / rect.height,
        };
      };

      const onDown = (e: PointerEvent) => {
        drawing = true;
        lastPos = getPos(e);
        try {
          (e.target as Element).setPointerCapture?.(e.pointerId);
        } catch (e) {
          console.error(e);
        }
      };

      const onMove = (e: PointerEvent) => {
        if (!drawing || !lastPos) return;
        const pos = getPos(e);
        const ctx2 = aCtx;
        if (!ctx2) return;
        ctx2.beginPath();
        ctx2.moveTo(lastPos.x, lastPos.y);
        ctx2.lineTo(pos.x, pos.y);
        ctx2.stroke();
        lastPos = pos;
      };

      const onUp = (e: PointerEvent) => {
        drawing = false;
        lastPos = null;
        try {
          (e.target as Element).releasePointerCapture?.(e.pointerId);
        } catch (e) {
          console.error(e);
        }
      };

      aCanvas.addEventListener("pointerdown", onDown);
      aCanvas.addEventListener("pointermove", onMove);
      aCanvas.addEventListener("pointerup", onUp);

      annotCanvasesRef.current.push(aCanvas);

      wrapper.appendChild(pageCanvas);
      wrapper.appendChild(aCanvas);
      pagesContainer.appendChild(wrapper);
    }

    pagesContainer.scrollTop = 0;
  };

  // Re-render pages when zoom changes
  useEffect(() => {
    if (openedFileType === "pdf" && openedFileBuffer) {
      // re-render using current scale
      renderPdfPages(openedFileBuffer, pdfScale).catch((e) => {
        console.error("Failed to re-render PDF pages:", e);
      });
    }
  }, [pdfScale, openedFileType, openedFileBuffer]);

  const cycleSelect = (
    select: HTMLSelectElement | null,
    setter?: (v: string) => void
  ) => {
    if (!select) return;
    const opts = Array.from(select.options).map((o) => o.value || o.text);
    const cur = (
      select.value || select.selectedIndex >= 0 ? select.value : opts[0]
    ) as string;
    const idx = opts.indexOf(cur);
    const next = opts[(idx + 1) % opts.length];
    if (setter) setter(next);
    // also trigger change event on select element if present
    const evt = new Event("change", { bubbles: true });
    select.value = next;
    select.dispatchEvent(evt);
  };

  const setRangeFromCursor = (input: HTMLInputElement | null, cx: number) => {
    if (!input) return;
    const rect = input.getBoundingClientRect();
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const pct = Math.min(1, Math.max(0, (cx - rect.left) / rect.width));
    const val = Math.round(min + pct * (max - min));
    input.value = String(val);
    const evt = new Event("input", { bubbles: true });
    input.dispatchEvent(evt);
    const changeEvt = new Event("change", { bubbles: true });
    input.dispatchEvent(changeEvt);
  };

  // Update annotation canvas styles when color/width change
  useEffect(() => {
    annotCanvasesRef.current.forEach((c) => {
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = annotColor;
        ctx.lineWidth = annotWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    });
  }, [annotColor, annotWidth]);

  // Pinch interaction: map refs to handlers and toggle on pinch
  useEffect(() => {
    const controls: Array<{
      key: string;
      ref: React.RefObject<HTMLElement>;
      handler: () => void;
    }> = [
      { key: "bold", ref: boldRef, handler: () => exec("bold") },
      { key: "italic", ref: italicRef, handler: () => exec("italic") },
      { key: "underline", ref: underlineRef, handler: () => exec("underline") },
      { key: "left", ref: leftRef, handler: () => exec("justifyLeft") },
      { key: "center", ref: centerRef, handler: () => exec("justifyCenter") },
      { key: "right", ref: rightRef, handler: () => exec("justifyRight") },
      {
        key: "unordered",
        ref: unorderedRef,
        handler: () => exec("insertUnorderedList"),
      },
      {
        key: "ordered",
        ref: orderedRef,
        handler: () => exec("insertOrderedList"),
      },
      { key: "image", ref: imageRef, handler: () => insertImage() },
      { key: "table", ref: tableRef, handler: () => insertTable() },
      {
        key: "textInsert",
        ref: textInsertRef,
        handler: () => {
          const text = prompt("Text to insert", "");
          if (text) exec("insertText", text);
        },
      },
      {
        key: "color",
        ref: colorRef,
        handler: () => {
          const c = prompt("Enter color hex", "#000000");
          if (c) exec("foreColor", c);
        },
      },
      {
        key: "font",
        ref: fontSelectRef,
        handler: () => cycleSelect(fontSelectRef.current, changeFontName),
      },
      {
        key: "fontSize",
        ref: fontSizeSelectRef,
        handler: () =>
          cycleSelect(fontSizeSelectRef.current, (v) =>
            changeFontSize(Number(v))
          ),
      },
      {
        key: "pageWidth",
        ref: pageWidthRef,
        handler: () => setRangeFromCursor(pageWidthRef.current, cursorX),
      },
      {
        key: "ribbonSlider",
        ref: ribbonSliderRef,
        handler: () => setRangeFromCursor(ribbonSliderRef.current, cursorX),
      },
      { key: "saveDocx", ref: saveDocxRef, handler: () => saveAsDocx() },
      { key: "savePdf", ref: savePdfRef, handler: () => saveAsPdf() },
    ];

    const newPressed = { ...controlsPressed };

    controls.forEach((c) => {
      const el = c.ref.current as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const isOver =
        cursorX >= rect.left &&
        cursorX <= rect.right &&
        cursorY >= rect.top &&
        cursorY <= rect.bottom;

      if (isOver && isPinching && !newPressed[c.key]) {
        // Trigger action
        try {
          c.handler();
        } catch (e) {
          // ignore
        }
        newPressed[c.key] = true;
      } else if (!isPinching) {
        newPressed[c.key] = false;
      }
    });

    setControlsPressed(newPressed);
  }, [
    cursorX,
    cursorY,
    isPinching,
    controlsPressed,
    changeFontName,
    changeFontSize,
    insertImage,
    insertTable,
    onClose,
    exec,
    saveAsDocx,
    saveAsPdf,
  ]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
        }}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal
        style={{
          width: orientation === "portrait" ? pageWidth : pageWidth * 1.4,
          height: "92vh",
          background: "#f3f4f6",
          borderRadius: 10,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          zIndex: 210,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Ribbon */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ padding: 8 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                ref={ribbonRef}
                onScroll={() => {
                  if (!ribbonRef.current) return;
                  setSliderValue(Math.round(ribbonRef.current.scrollLeft));
                }}
                style={{
                  overflowX: "auto",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setActiveTab("home")}
                    className={activeTab === "home" ? "btn active" : "btn"}
                    style={{
                      fontWeight: activeTab === "home" ? "bold" : "normal",
                    }}
                  >
                    Home
                  </button>
                  <button
                    onClick={() => setActiveTab("insert")}
                    className={activeTab === "insert" ? "btn active" : "btn"}
                    style={{
                      fontWeight: activeTab === "insert" ? "bold" : "normal",
                    }}
                  >
                    Insert
                  </button>
                  <button
                    onClick={() => setActiveTab("layout")}
                    className={activeTab === "layout" ? "btn active" : "btn"}
                    style={{
                      fontWeight: activeTab === "layout" ? "bold" : "normal",
                    }}
                  >
                    Layout
                  </button>
                </div>

                {/* Home controls */}
                {activeTab === "home" && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginLeft: 8,
                    }}
                  >
                    <select
                      value={fontName}
                      onChange={(e) => changeFontName(e.target.value)}
                      ref={fontSelectRef}
                    >
                      <option>Arial</option>
                      <option>Times New Roman</option>
                      <option>Calibri</option>
                      <option>Tahoma</option>
                    </select>
                    <select
                      value={String(fontSize)}
                      onChange={(e) => changeFontSize(Number(e.target.value))}
                      ref={fontSizeSelectRef}
                    >
                      <option value={1}>8</option>
                      <option value={2}>10</option>
                      <option value={3}>12</option>
                      <option value={4}>14</option>
                      <option value={5}>18</option>
                      <option value={6}>24</option>
                      <option value={7}>36</option>
                    </select>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn"
                        onClick={() => exec("bold")}
                        ref={boldRef}
                      >
                        B
                      </button>
                      <button
                        className="btn"
                        onClick={() => exec("italic")}
                        ref={italicRef}
                      >
                        I
                      </button>
                      <button
                        className="btn"
                        onClick={() => exec("underline")}
                        ref={underlineRef}
                      >
                        U
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn"
                        onClick={() => exec("justifyLeft")}
                        ref={leftRef}
                      >
                        Left
                      </button>
                      <button
                        className="btn"
                        onClick={() => exec("justifyCenter")}
                        ref={centerRef}
                      >
                        Center
                      </button>
                      <button
                        className="btn"
                        onClick={() => exec("justifyRight")}
                        ref={rightRef}
                      >
                        Right
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn"
                        onClick={() => exec("insertUnorderedList")}
                        ref={unorderedRef}
                      >
                        • List
                      </button>
                      <button
                        className="btn"
                        onClick={() => exec("insertOrderedList")}
                        ref={orderedRef}
                      >
                        1. List
                      </button>
                    </div>
                    <input
                      type="color"
                      defaultValue="#000000"
                      onChange={(e) => exec("foreColor", e.target.value)}
                      title="Text color"
                      ref={colorRef}
                    />
                  </div>
                )}

                {/* Insert controls */}
                {activeTab === "insert" && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginLeft: 8,
                    }}
                  >
                    <button
                      className="btn"
                      onClick={insertImage}
                      ref={imageRef}
                    >
                      Image
                    </button>
                    <button
                      className="btn"
                      onClick={insertTable}
                      ref={tableRef}
                    >
                      Table
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        const text = prompt("Text to insert", "");
                        if (text) exec("insertText", text);
                      }}
                      ref={textInsertRef}
                    >
                      Text
                    </button>
                  </div>
                )}

                {/* Layout controls */}
                {activeTab === "layout" && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginLeft: 8,
                    }}
                  >
                    <label>
                      Width:
                      <input
                        type="range"
                        min={400}
                        max={1200}
                        value={pageWidth}
                        onChange={(e) => setPageWidth(Number(e.target.value))}
                        style={{ marginLeft: 8 }}
                        ref={pageWidthRef}
                      />
                    </label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn"
                        onClick={() => setOrientation("portrait")}
                      >
                        Portrait
                      </button>
                      <button
                        className="btn"
                        onClick={() => setOrientation("landscape")}
                      >
                        Landscape
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Slider to scroll ribbon when buttons overflow */}
              <div
                style={{
                  width: 200,
                  marginLeft: 12,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {scrollMax > 0 && (
                  <input
                    type="range"
                    min={0}
                    max={scrollMax}
                    value={sliderValue}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (ribbonRef.current) ribbonRef.current.scrollLeft = val;
                      setSliderValue(val);
                    }}
                    style={{ width: "200px" }}
                    aria-label="Ribbon scroll"
                    ref={ribbonSliderRef}
                  />
                )}
              </div>

              <div
                style={{
                  marginLeft: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <button
                  className="btn"
                  onClick={saveAsDocx}
                  ref={saveDocxRef}
                  title="Save as .docx"
                >
                  Save .docx
                </button>
                <button
                  className="btn"
                  onClick={saveAsPdf}
                  ref={savePdfRef}
                  title="Save as PDF"
                >
                  Save PDF
                </button>
                <button
                  className="btn"
                  onClick={onOpenFileClick}
                  title="Open .docx or .pdf to edit"
                >
                  Open
                </button>
                <input
                  type="file"
                  accept=".docx,.pdf"
                  style={{ display: "none" }}
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />

                {openedFileName && (
                  <>
                    <button
                      className="btn"
                      onClick={saveOpenedFile}
                      title="Save opened file"
                    >
                      Save
                    </button>
                    <button
                      className="btn"
                      onClick={closeOpenedFile}
                      title="Close opened file"
                    >
                      Close
                    </button>
                    {openedFileType === "pdf" && (
                      <button
                        className="btn"
                        onClick={clearPdfAnnotations}
                        title="Clear PDF annotations"
                      >
                        Clear Annotations
                      </button>
                    )}
                    <div style={{ marginLeft: 8, fontStyle: "italic" }}>
                      {openedFileName}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Document area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 1000,
              background: "white",
              padding: 24,
              borderRadius: 6,
              /* Constrain height so the document area scrolls vertically */
              maxHeight: "78vh",
              boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              transform: orientation === "landscape" ? "rotate(0deg)" : "none",
              boxSizing: "border-box",
            }}
          >
            {openedFileType === "pdf" ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <label
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    Color:
                    <input
                      type="color"
                      value={annotColor}
                      onChange={(e) => setAnnotColor(e.target.value)}
                    />
                  </label>
                  <label
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    Width:
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={annotWidth}
                      onChange={(e) => setAnnotWidth(Number(e.target.value))}
                    />
                  </label>

                  <div
                    style={{
                      marginLeft: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <button
                      className="btn"
                      onClick={() =>
                        setPdfScale((s) => Math.max(0.5, s - 0.25))
                      }
                      title="Zoom out"
                    >
                      -
                    </button>
                    <div style={{ minWidth: 48, textAlign: "center" }}>
                      {Math.round(pdfScale * 100)}%
                    </div>
                    <button
                      className="btn"
                      onClick={() => setPdfScale((s) => Math.min(3, s + 0.25))}
                      title="Zoom in"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <div
                    ref={pdfPagesRef}
                    style={{
                      width: "100%",
                      maxHeight: "76vh",
                      overflowY: "scroll",
                      /* force visible scrollbar */
                      scrollbarGutter: "stable",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                      padding: 8,
                    }}
                  />
                </div>

                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button className="btn" onClick={clearPdfAnnotations}>
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                style={{
                  minHeight: "60vh",
                  outline: "none",
                  fontFamily: fontName,
                  color: "#000000",
                }}
              ></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
