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
    await page.render({ canvasContext: context, viewport }).promise;
    pages.push({ id: `${parentId}-p${number}`, name: `${label} · page ${number}`, src: canvas.toDataURL("image/jpeg", 0.78), kind: "image", pageOf: parentId, ratio: canvas.width / canvas.height });
    page.cleanup();
  }
  await doc.destroy();
  return pages;
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
