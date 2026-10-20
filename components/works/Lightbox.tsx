"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import type { PostFile } from "@/lib/works/types";
import { openableUrl } from "@/lib/works/pdf";

/** Shows what was attached at full size, one file at a time. */
export function Lightbox({ files, start = 0, onClose }: { files: PostFile[]; start?: number; onClose: () => void }) {
  const [index, setIndex] = useState(Math.min(start, Math.max(0, files.length - 1)));
  const file = files[index];
  const pdfUrl = useMemo(() => (file?.kind === "pdf" ? openableUrl(file.src) : ""), [file]);
  const step = (delta: number) => setIndex((value) => (value + delta + files.length) % files.length);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && files.length > 1) setIndex((value) => (value + 1) % files.length);
      if (event.key === "ArrowLeft" && files.length > 1) setIndex((value) => (value - 1 + files.length) % files.length);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [files.length, onClose]);

  if (!file || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#0F1217]/[.98]" role="dialog" aria-modal="true" aria-label="Full size preview" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{files.length > 1 ? `${index + 1} of ${files.length} · ` : ""}{file.name}</span>
        <button onClick={onClose} aria-label="Close" className="rounded-xl p-2 hover:bg-white/10"><X size={22} /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        {file.kind === "image" && /* eslint-disable-next-line @next/next/no-img-element */ <img src={file.src} alt={file.name} className="max-h-full max-w-full rounded-lg object-contain" />}
        {file.kind === "video" && <video src={file.src} controls className="max-h-full max-w-full rounded-lg" />}
        {file.kind === "pdf" && <iframe src={pdfUrl} title={file.name} className="h-full w-full max-w-[900px] rounded-lg bg-white" />}
        {file.kind === "other" && <a href={file.src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[14px] font-semibold">Open {file.name} <ExternalLink size={14} /></a>}
        {files.length > 1 && (
          <>
            <button onClick={() => step(-1)} aria-label="Previous" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow"><ChevronLeft size={22} /></button>
            <button onClick={() => step(1)} aria-label="Next" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow"><ChevronRight size={22} /></button>
          </>
        )}
      </div>
      {files.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 pb-4">
          {files.map((item, position) => (
            <button key={item.id} onClick={() => setIndex(position)} aria-label={`Show ${position + 1}`} className={`h-14 w-11 shrink-0 overflow-hidden rounded-md border-2 ${position === index ? "border-white" : "border-transparent opacity-60"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {item.kind === "image" ? <img src={item.src} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center bg-[#2E3542] text-[10px] font-bold text-white">{item.kind === "pdf" ? "PDF" : item.kind === "video" ? "Vid" : "File"}</span>}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
