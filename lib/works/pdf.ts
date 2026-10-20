import type { PostFile } from "./types";

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let library: Promise<PdfJs> | null = null;
const load = () => (library ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((module) => {
  module.GlobalWorkerOptions.workerSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/pdf.worker.min.mjs`;
  return module;
}));

const newId = () => `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
export const kindOfFile = (file: File): PostFile["kind"] => (file.type.startsWith("image/") ? "image" : file.type === "application/pdf" || /\.pdf$/i.test(file.name) ? "pdf" : file.type.startsWith("video/") ? "video" : "other");

/** Draws each page of a PDF as an image, so a LinkedIn carousel can be seen as slides. */
export async function pdfPages(data: ArrayBuffer, name: string, parentId: string, max = 30): Promise<PostFile[]> {
  const pdfjs = await load();
  // pdf.js waits for the screen to repaint between pieces of a page. A hidden or background tab never repaints, so it would wait for ever.
  const realFrame = window.requestAnimationFrame;
  window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
  try {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) }).promise;
    const count = Math.min(doc.numPages, max);
    const label = name.replace(/\.pdf$/i, "");
    const pages: PostFile[] = [];
    for (let number = 1; number <= count; number++) {
      const page = await doc.getPage(number);
      const natural = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2, 900 / natural.width) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not draw the PDF");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const task = page.render({ canvasContext: context, viewport });
      const finished = await Promise.race([task.promise.then(() => true), new Promise<false>((resolve) => window.setTimeout(() => resolve(false), 25000))]);
      if (!finished) { task.cancel(); throw new Error("Drawing the PDF took too long"); }
      pages.push({ id: `${parentId}-p${number}`, name: `${label} · page ${number}`, src: canvas.toDataURL("image/jpeg", 0.78), kind: "image", pageOf: parentId, ratio: canvas.width / canvas.height });
      page.cleanup();
    }
    await doc.destroy();
    return pages;
  } finally {
    window.requestAnimationFrame = realFrame;
  }
}

/** The shape of a picture, so it can be shown whole. */
const imageRatio = (src: string) =>
  new Promise<number | undefined>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : undefined);
    image.onerror = () => resolve(undefined);
    image.src = src;
  });

const asSource = (file: File) =>
  file.size < 1_500_000
    ? new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the file"));
        reader.readAsDataURL(file);
      })
    : Promise.resolve(URL.createObjectURL(file));

/** Reads uploaded files for a post. A PDF comes back as the PDF plus an image of each page. */
export async function readPostFiles(files: File[]): Promise<{ files: PostFile[]; notes: string[] }> {
  const out: PostFile[] = [];
  const notes: string[] = [];
  for (const file of files) {
    const entry: PostFile = { id: newId(), name: file.name, kind: kindOfFile(file), src: await asSource(file) };
    if (entry.kind === "image") entry.ratio = await imageRatio(entry.src);
    out.push(entry);
    if (entry.kind === "pdf") {
      try { out.push(...(await pdfPages(await file.arrayBuffer(), file.name, entry.id))); }
      catch { notes.push(`${file.name} is attached, but its pages could not be drawn.`); }
    }
  }
  return { files: out, notes };
}

/** Draws the pages of a PDF that is already attached. */
export async function pagesForAttached(file: PostFile): Promise<PostFile[]> {
  const response = await fetch(file.src);
  return pdfPages(await response.arrayBuffer(), file.name, file.id);
}

/** Pages belong to their PDF: taking a PDF away takes its pages with it. */
export const withoutFile = (files: PostFile[], id: string) => files.filter((file) => file.id !== id && file.pageOf !== id);
/** What to show as slides: everything except a PDF that has been drawn as pages. */
export const slidesOf = (files: PostFile[]) => files.filter((file) => file.kind !== "pdf" || !files.some((page) => page.pageOf === file.id));
export const pagesIn = (files: PostFile[], id: string) => files.filter((file) => file.pageOf === id).length;

/** A data: address turned into a file the browser will open. Browsers refuse to open data: addresses in a new tab. */
export function dataUrlToBlob(src: string): Blob {
  const [head, body] = src.split(",");
  const mime = head.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const text = /;base64/.test(head) ? atob(body) : decodeURIComponent(body);
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** An address a new tab can open. */
export const openableUrl = (src: string) => (src.startsWith("data:") ? URL.createObjectURL(dataUrlToBlob(src)) : src);

/** Opens a file in a new tab. */
export function openFile(src: string) {
  window.open(openableUrl(src), "_blank", "noopener");
}

/** Saves a file to the computer. */
export function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read an image"));
    image.src = src;
  });

/** Builds one PDF from slide images, each image on its own page in its own shape. LinkedIn takes a carousel only as a PDF. */
export async function carouselPdf(sources: string[]): Promise<Blob> {
  const pages: { w: number; h: number; jpeg: Uint8Array }[] = [];
  for (const src of sources) {
    const image = await loadImage(src);
    const scale = Math.min(1, 1600 / image.naturalWidth);
    const w = Math.max(1, Math.round(image.naturalWidth * scale));
    const h = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not draw an image");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, w, h);
    context.drawImage(image, 0, 0, w, h);
    const text = atob(canvas.toDataURL("image/jpeg", 0.9).split(",")[1]);
    const jpeg = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) jpeg[i] = text.charCodeAt(i);
    pages.push({ w, h, jpeg });
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (data: string | Uint8Array) => {
    const bytes = typeof data === "string" ? encoder.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const begin = (id: number) => { offsets[id] = length; push(`${id} 0 obj\n`); };
  const total = 2 + pages.length * 3;

  push("%PDF-1.4\n");
  begin(1);
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  begin(2);
  push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj\n`);
  pages.forEach((page, i) => {
    const pageId = 3 + i * 3;
    const content = `q ${page.w} 0 0 ${page.h} 0 0 cm /Im0 Do Q`;
    begin(pageId);
    push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.w} ${page.h}] /Contents ${pageId + 1} 0 R /Resources << /XObject << /Im0 ${pageId + 2} 0 R >> >> >>\nendobj\n`);
    begin(pageId + 1);
    push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    begin(pageId + 2);
    push(`<< /Type /XObject /Subtype /Image /Width ${page.w} /Height ${page.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`);
    push(page.jpeg);
    push("\nendstream\nendobj\n");
  });
  const xref = length;
  push(`xref\n0 ${total + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= total; id++) push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

/** True when the post is a carousel going to LinkedIn, which only accepts a carousel as one PDF. */
export const isLinkedInCarousel = (post: { format: string; platforms: string[] }) => post.format === "Carousel" && post.platforms.includes("LinkedIn");
