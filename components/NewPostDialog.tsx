"use client";

import { ArrowRight, FileText, ImagePlus, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

type PostDraft = {
  projectId: string;
  platform: string;
  format: string;
  title: string;
  caption: string;
  date: string;
  destination: string;
  reviewer: string;
  media: string[];
  designLink: string;
};

type Props = {
  projects: { id: string; name: string }[];
  draft: PostDraft;
  setDraft: Dispatch<SetStateAction<PostDraft>>;
  onClose: () => void;
  onCreate: () => void;
};

const field = "mt-1.5 w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-3 text-[12px]";

export function NewPostDialog({ projects, draft, setDraft, onClose, onCreate }: Props) {
  if (projects.length === 0) return null;

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const media = await Promise.all(Array.from(files).map(file => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    })));
    setDraft(old => ({ ...old, media: [...old.media, ...media] }));
  }

  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#302E32]/45 p-4" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="my-6 w-full max-w-[680px] rounded-[26px] bg-white p-5 shadow-2xl sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div><span className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#1557B8]">QUICK POST</span><h2 className="mt-1 text-[25px] font-extrabold">Make a post</h2><p className="mt-1 text-[12px] text-[#77716A]">Creative, copy, and next step stay with the account.</p></div>
        <button onClick={onClose} aria-label="Close new post" className="rounded-full bg-[#F4F1EC] p-2"><X size={16}/></button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-[10px] font-bold">Account<select value={draft.projectId} onChange={event => setDraft(old => ({ ...old, projectId: event.target.value }))} className={field}>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label className="text-[10px] font-bold">Platform<select value={draft.platform} onChange={event => setDraft(old => ({ ...old, platform: event.target.value }))} className={field}>{["LinkedIn", "Instagram", "Facebook", "X", "TikTok"].map(platform => <option key={platform}>{platform}</option>)}</select></label>
        <label className="text-[10px] font-bold">Format<select value={draft.format} onChange={event => setDraft(old => ({ ...old, format: event.target.value }))} className={field}>{["Single image", "Carousel", "Reel / video", "Text post", "Story", "Other"].map(format => <option key={format}>{format}</option>)}</select></label>
        <label className="text-[10px] font-bold">Target date<input type="date" value={draft.date} onChange={event => setDraft(old => ({ ...old, date: event.target.value }))} className={field}/></label>
      </div>
      <label className="mt-3 block text-[10px] font-bold">Post title<input value={draft.title} onChange={event => setDraft(old => ({ ...old, title: event.target.value }))} placeholder="What is this post about?" className={field}/></label>
      <label className="mt-3 block text-[10px] font-bold">Caption / copy<textarea value={draft.caption} onChange={event => setDraft(old => ({ ...old, caption: event.target.value }))} placeholder="Write the post or paste the approved copy…" className={`${field} min-h-28`}/></label>
      <label className="mt-3 block text-[10px] font-bold">Canva, Drive, or design link<input type="url" value={draft.designLink} onChange={event => setDraft(old => ({ ...old, designLink: event.target.value }))} placeholder="https://…" className={field}/></label>
      <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-[#C9D5E8] bg-[#F4F8FE] p-4">
        <ImagePlus size={22} className="text-[#1557B8]"/><span className="flex-1"><span className="block text-[11px] font-bold">Add images, video, or a PDF</span><span className="mt-1 block text-[9px] text-[#858078]">Choose several files for a carousel. You can also use the design link above.</span></span>
        <input type="file" multiple accept="image/*,video/*,application/pdf" onChange={event => { void addFiles(event.target.files); event.target.value = ""; }} className="sr-only"/>
      </label>
      {draft.media.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{draft.media.map((src, index) => <div key={`${index}-${src.slice(0,20)}`} className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[#F4F5F7]">{src.startsWith("data:video/") ? <video src={src} className="h-full w-full object-contain" muted/> : src.startsWith("data:application/pdf") ? <div className="grid h-full place-items-center text-[#1557B8]"><FileText size={28}/></div> : <img src={src} alt={`Creative ${index + 1}`} className="h-full w-full object-contain"/>}<button onClick={() => setDraft(old => ({ ...old, media: old.media.filter((_, item) => item !== index) }))} aria-label={`Remove creative ${index + 1}`} className="absolute right-1 top-1 rounded-full bg-white p-1"><X size={12}/></button><span className="absolute bottom-1 left-1 rounded-full bg-[#17212F]/80 px-1.5 py-0.5 text-[9px] font-bold text-white">{index + 1}</span></div>)}</div>}
      <div className="mt-5 rounded-2xl bg-[#F7F5F1] p-4">
        <div className="text-[10px] font-extrabold uppercase tracking-wide text-[#77716A]">Next step</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">{[["Draft", "Save draft"], ["Planned", "Add to plan"], ["Review", "Submit for review"]].map(([value, label]) => <button key={value} onClick={() => setDraft(old => ({ ...old, destination: value }))} className={`rounded-xl px-3 py-3 text-[10px] font-bold ${draft.destination === value ? "bg-[#1557B8] text-white" : "bg-white text-[#57534E]"}`}>{label}</button>)}</div>
        {draft.destination === "Review" && <label className="mt-3 block text-[10px] font-bold">Send to<select value={draft.reviewer} onChange={event => setDraft(old => ({ ...old, reviewer: event.target.value }))} className={field}>{["María", "Gareth", "Niamh"].map(person => <option key={person}>{person}</option>)}</select></label>}
      </div>
      <button onClick={onCreate} className="mt-4 w-full rounded-full bg-[#1557B8] py-3.5 text-[12px] font-extrabold text-white">{draft.destination === "Review" ? "Submit for review" : draft.destination === "Draft" ? "Save draft" : "Add to plan"} <ArrowRight size={14} className="ml-1 inline"/></button>
    </section>
  </div>;
}
