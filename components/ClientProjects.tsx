"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, ChevronRight, FolderKanban, Plus, Search, X } from "lucide-react";

export type ClientRecord = {
  id: string;
  name: string;
  status: "Confirmed" | "Potential";
  industry: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  approvalContact: string;
  goals: string;
  brandLinks: string;
};

export type ProjectKind = "Marketing" | "Web development" | "Operations" | "SEO" | "Brand setup" | "Other";
export type ProjectSetup = {
  name: string;
  clientId: string;
  type: ProjectKind;
  status: "Confirmed" | "Potential";
  paymentModel: "Recurring" | "One-time" | "Recurring + add-on";
  fee: number;
  addOn: number;
  approvalRequired: boolean;
  approver: string;
};
export type DirectoryProject = { id: string; clientId: string; name: string; type: string; status: string; fee?: number; paymentModel?: string; next: string; color: string };

const field = "mt-1.5 w-full rounded-xl border border-[#E5E0D8] bg-white px-3.5 py-3 text-[12px] outline-none focus:border-[#1557B8]";
const emptyClient: Omit<ClientRecord, "id"> = {
  name: "", status: "Potential", industry: "", website: "", contactName: "", contactEmail: "",
  contactPhone: "", approvalContact: "", goals: "", brandLinks: "",
};

export function ClientDirectory({clients,projects,query,onQuery,onOpenClient,onOpenProject,onNewClient,onNewProject}:{
  clients:ClientRecord[];projects:DirectoryProject[];query:string;onQuery:(query:string)=>void;
  onOpenClient:(id:string)=>void;onOpenProject:(id:string)=>void;onNewClient:()=>void;onNewProject:(clientId?:string)=>void;
}) {
  const visible=clients.filter(client=>`${client.name} ${client.industry} ${projects.filter(p=>p.clientId===client.id).map(p=>p.name).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[230px] flex-1"><Search size={16} className="absolute left-3.5 top-3.5 text-[#908981]"/><input value={query} onChange={e=>onQuery(e.target.value)} placeholder="Find a client or project" className="w-full rounded-full border border-[#E5E0D8] bg-white py-3 pl-10 pr-4 text-[12px] outline-none focus:border-[#1557B8]"/></div>
      <button onClick={onNewClient} className="rounded-full bg-[#F6CD33] px-4 py-3 text-[11px] font-extrabold text-[#392F0B]"><Plus size={14} className="mr-1 inline"/>New client</button>
      <button onClick={()=>onNewProject()} className="rounded-full bg-[#1557B8] px-4 py-3 text-[11px] font-extrabold text-white"><Plus size={14} className="mr-1 inline"/>New project</button>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">{visible.map(client=>{
      const work=projects.filter(project=>project.clientId===client.id);
      const active=work.filter(project=>project.status==="Active");
      return <article key={client.id} className="rounded-[23px] border border-[#EAE6DF] bg-white p-5">
        <div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#E7EFFB] text-[#1557B8]"><Building2 size={21}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-[18px] font-extrabold">{client.name}</h2><span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold ${client.status==="Confirmed"?"bg-[#E5F5E7] text-[#258A44]":"bg-[#FFF1C2] text-[#9A5A08]"}`}>{client.status}</span></div><p className="mt-1 text-[11px] text-[#858078]">{client.industry||"Industry to add"} · {active.length} active · {work.length} project{work.length===1?"":"s"}</p></div><button onClick={()=>onOpenClient(client.id)} aria-label={`Open ${client.name}`} className="rounded-full bg-[#F5F3EF] p-2.5 text-[#1557B8]"><ArrowRight size={16}/></button></div>
        <div className="mt-4 space-y-2">{work.map(project=><button key={project.id} onClick={()=>onOpenProject(project.id)} className="flex w-full items-center gap-2 rounded-xl bg-[#F7F6F2] p-3 text-left hover:bg-[#E7EFFB]"><span className="h-8 w-1 rounded-full" style={{background:project.color}}/><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-extrabold">{project.name}</span><span className="text-[10px] text-[#858078]">{project.type} · {project.status}</span></span><ChevronRight size={15} className="text-[#8E8981]"/></button>)}{work.length===0&&<div className="rounded-xl border border-dashed border-[#DED9D0] p-4 text-[11px] text-[#858078]">No project yet. Add one when the scope is ready.</div>}</div>
        <div className="mt-4 flex gap-2"><button onClick={()=>onOpenClient(client.id)} className="rounded-full bg-[#E7EFFB] px-3.5 py-2.5 text-[10px] font-bold text-[#1557B8]">Client profile</button><button onClick={()=>onNewProject(client.id)} className="rounded-full bg-[#F6CD33] px-3.5 py-2.5 text-[10px] font-bold text-[#392F0B]">+ Project</button></div>
      </article>
    })}</div>{visible.length===0&&<div className="rounded-2xl border border-dashed border-[#DED9D0] bg-white p-8 text-center text-[12px] text-[#858078]">No clients match this search.</div>}
  </div>;
}

export function ClientProfile({client,projects,onBack,onOpenProject,onNewProject,onChange}:{
  client:ClientRecord;projects:DirectoryProject[];onBack:()=>void;onOpenProject:(id:string)=>void;onNewProject:()=>void;onChange:(client:ClientRecord)=>void;
}) {
  const [editing,setEditing]=useState(false);
  return <div className="space-y-4"><button onClick={onBack} className="text-[11px] font-bold text-[#77716A]"><ArrowLeft size={13} className="mr-1 inline"/>All clients</button>
    <section className="rounded-[24px] bg-[#1557B8] p-5 text-white sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#F6CD33]">CLIENT PROFILE</div><h2 className="mt-1 text-[28px] font-extrabold">{client.name}</h2><p className="mt-1 text-[12px] text-white/80">{client.industry||"Add the client’s industry"} · {client.status}</p></div><button onClick={()=>setEditing(!editing)} className="rounded-full bg-[#F6CD33] px-4 py-2.5 text-[11px] font-extrabold text-[#392F0B]">{editing?"Done":"Edit client"}</button></div></section>
    {editing&&<section className="grid gap-3 rounded-[22px] border border-[#EAE6DF] bg-white p-5 sm:grid-cols-2">{([["name","Client name"],["industry","Industry"],["website","Website"],["contactName","Main contact"],["contactEmail","Email"],["contactPhone","Phone / WhatsApp"],["approvalContact","Client approval contact"],["goals","Goals"],["brandLinks","Brand and asset links"]] as [keyof ClientRecord,string][]).map(([key,label])=><label key={key} className="text-[10px] font-bold">{label}<input value={client[key]} onChange={e=>onChange({...client,[key]:e.target.value})} className={field}/></label>)}<label className="text-[10px] font-bold">Client status<select value={client.status} onChange={e=>onChange({...client,status:e.target.value as ClientRecord["status"]})} className={field}><option>Potential</option><option>Confirmed</option></select></label></section>}
    <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]"><section className="rounded-[22px] border border-[#EAE6DF] bg-white p-5"><h3 className="text-[19px] font-extrabold">Client at a glance</h3><div className="mt-4 space-y-3 text-[11px]">{[["Contact",client.contactName],["Email",client.contactEmail],["Phone / WhatsApp",client.contactPhone],["Approval contact",client.approvalContact],["Website",client.website],["Goals",client.goals],["Brand links",client.brandLinks]].map(([label,value])=><div key={label} className="flex justify-between gap-4 border-b border-[#F0ECE6] pb-2"><span className="font-bold text-[#77716A]">{label}</span><span className="max-w-[62%] break-all text-right">{value||"To add"}</span></div>)}</div></section><section className="rounded-[22px] border border-[#EAE6DF] bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="text-[19px] font-extrabold">Projects</h3><p className="mt-1 text-[11px] text-[#858078]">Separate scopes under the same client.</p></div><button onClick={onNewProject} className="rounded-full bg-[#1557B8] px-4 py-2.5 text-[10px] font-bold text-white"><Plus size={12} className="mr-1 inline"/>New project</button></div><div className="mt-4 space-y-2">{projects.map(project=><button key={project.id} onClick={()=>onOpenProject(project.id)} className="flex w-full items-center gap-3 rounded-xl bg-[#F7F6F2] p-3 text-left"><span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{background:project.color}}><FolderKanban size={17}/></span><span className="flex-1"><span className="block text-[12px] font-extrabold">{project.name}</span><span className="text-[10px] text-[#858078]">{project.type} · {project.status} · {project.paymentModel??"Terms to add"}</span></span><ArrowRight size={14}/></button>)}{projects.length===0&&<p className="rounded-xl bg-[#F7F6F2] p-5 text-[11px] text-[#858078]">This client has no projects yet.</p>}</div></section></div>
  </div>;
}

export function ClientSetupDialog({onClose,onCreate}:{
  onClose:()=>void;onCreate:(client:Omit<ClientRecord,"id">)=>void;
}) {
  const [step,setStep]=useState(0);const [draft,setDraft]=useState(emptyClient);const update=(key:keyof typeof draft,value:string)=>setDraft(old=>({...old,[key]:value}));
  const steps=["Basics","People","Brief"];
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#302E32]/45 p-4"><section className="my-6 w-full max-w-[600px] rounded-[25px] bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between"><div><div className="text-[10px] font-extrabold uppercase tracking-wide text-[#1557B8]">NEW CLIENT · STEP {step+1} OF 3</div><h2 className="mt-1 text-[24px] font-extrabold">{steps[step]}</h2></div><button onClick={onClose} aria-label="Close new client" className="rounded-full bg-[#F4F1EC] p-2"><X size={17}/></button></div><div className="mt-4 grid grid-cols-3 gap-2">{steps.map((name,index)=><span key={name} className={`rounded-full px-3 py-2 text-center text-[10px] font-bold ${index<=step?"bg-[#1557B8] text-white":"bg-[#F1EFEB] text-[#77716A]"}`}>{index<step?<Check size={12} className="mr-1 inline"/>:null}{name}</span>)}</div>
    {step===0&&<div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-[11px] font-bold sm:col-span-2">Client name<input autoFocus value={draft.name} onChange={e=>update("name",e.target.value)} placeholder="Company or brand name" className={field}/></label><label className="text-[11px] font-bold">Industry<input value={draft.industry} onChange={e=>update("industry",e.target.value)} placeholder="Construction, education…" className={field}/></label><label className="text-[11px] font-bold">Website<input value={draft.website} onChange={e=>update("website",e.target.value)} placeholder="https://…" className={field}/></label><label className="text-[11px] font-bold">Relationship<select value={draft.status} onChange={e=>setDraft(old=>({...old,status:e.target.value as ClientRecord["status"]}))} className={field}><option>Potential</option><option>Confirmed</option></select></label></div>}
    {step===1&&<div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-[11px] font-bold">Main contact<input value={draft.contactName} onChange={e=>update("contactName",e.target.value)} className={field}/></label><label className="text-[11px] font-bold">Contact email<input type="email" value={draft.contactEmail} onChange={e=>update("contactEmail",e.target.value)} className={field}/></label><label className="text-[11px] font-bold">Phone / WhatsApp<input value={draft.contactPhone} onChange={e=>update("contactPhone",e.target.value)} className={field}/></label><label className="text-[11px] font-bold">Who approves client work?<input value={draft.approvalContact} onChange={e=>update("approvalContact",e.target.value)} placeholder="Name or role" className={field}/></label></div>}
    {step===2&&<div className="mt-5 space-y-3"><label className="block text-[11px] font-bold">Goals / immediate need<textarea value={draft.goals} onChange={e=>update("goals",e.target.value)} rows={3} placeholder="What do they need us to achieve?" className={field}/></label><label className="block text-[11px] font-bold">Brand, Drive or reference links<textarea value={draft.brandLinks} onChange={e=>update("brandLinks",e.target.value)} rows={3} placeholder="Paste the links we need at kickoff" className={field}/></label><p className="rounded-xl bg-[#FFF1C2] p-3 text-[10px] text-[#715617]">The client profile is ready after this step. Add one or more projects when the scope is clear.</p></div>}
    <div className="mt-6 flex justify-between gap-2"><button onClick={()=>step===0?onClose():setStep(step-1)} className="rounded-full bg-[#F2F0EB] px-5 py-3 text-[11px] font-bold">{step===0?"Cancel":"Back"}</button><button onClick={()=>{if(step===0&&!draft.name.trim())return;if(step<2)setStep(step+1);else onCreate({...draft,name:draft.name.trim()})}} className="rounded-full bg-[#1557B8] px-5 py-3 text-[11px] font-bold text-white">{step===2?"Create client":"Continue"} <ArrowRight size={13} className="ml-1 inline"/></button></div>
  </section></div>;
}

export function ProjectSetupDialog({clients,initialClientId,initialDraft,onClose,onNewClient,onCreate}:{
  clients:ClientRecord[];initialClientId:string;initialDraft?:Partial<ProjectSetup>;onClose:()=>void;onNewClient:(draft:Partial<ProjectSetup>)=>void;onCreate:(project:ProjectSetup)=>void;
}) {
  const [clientId,setClientId]=useState(initialClientId||initialDraft?.clientId||clients[0]?.id||"");const [name,setName]=useState(initialDraft?.name??"");const [type,setType]=useState<ProjectKind>(initialDraft?.type??"Marketing");
  const [status,setStatus]=useState<ProjectSetup["status"]>(initialDraft?.status??"Potential");const [paymentModel,setPaymentModel]=useState<ProjectSetup["paymentModel"]>(initialDraft?.paymentModel??"Recurring");
  const [fee,setFee]=useState(initialDraft?.fee?.toString()??"");const [addOn,setAddOn]=useState(initialDraft?.addOn?.toString()??"");const [approvalRequired,setApprovalRequired]=useState(initialDraft?.approvalRequired??true);const [approver,setApprover]=useState(initialDraft?.approver??"María");
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#302E32]/45 p-4"><section className="my-6 w-full max-w-[660px] rounded-[25px] bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between"><div><div className="text-[10px] font-extrabold uppercase tracking-wide text-[#1557B8]">NEW SCOPE</div><h2 className="mt-1 text-[24px] font-extrabold">New project</h2><p className="mt-1 text-[11px] text-[#858078]">One client can have several projects with different scopes and fees.</p></div><button onClick={onClose} aria-label="Close new project" className="rounded-full bg-[#F4F1EC] p-2"><X size={17}/></button></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"><label className="text-[11px] font-bold">Client<select value={clientId} onChange={e=>setClientId(e.target.value)} className={field}><option value="">Choose a client</option>{clients.map(client=><option key={client.id} value={client.id}>{client.name} · {client.status}</option>)}</select></label><button onClick={()=>onNewClient({name,clientId,type,status,paymentModel,fee:Number(fee)||0,addOn:Number(addOn)||0,approvalRequired,approver})} className="self-end rounded-xl bg-[#F6CD33] px-4 py-3 text-[10px] font-extrabold text-[#392F0B]"><Plus size={12} className="mr-1 inline"/>New client instead</button></div>
    <label className="mt-3 block text-[11px] font-bold">Project name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Website rebuild, October content" className={field}/></label>
    <div className="mt-4 text-[11px] font-bold">What kind of work?</div><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{(["Marketing","Web development","Operations","SEO","Brand setup","Other"] as ProjectKind[]).map(option=><button key={option} onClick={()=>setType(option)} className={`rounded-xl border px-3 py-3 text-left text-[11px] font-bold ${type===option?"border-[#1557B8] bg-[#E7EFFB] text-[#1557B8]":"border-[#EAE6DF]"}`}>{option}</button>)}</div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-[11px] font-bold">Status<select value={status} onChange={e=>setStatus(e.target.value as ProjectSetup["status"])} className={field}><option>Potential</option><option>Confirmed</option></select></label><label className="text-[11px] font-bold">Revenue model<select value={paymentModel} onChange={e=>setPaymentModel(e.target.value as ProjectSetup["paymentModel"])} className={field}><option>Recurring</option><option>One-time</option><option>Recurring + add-on</option></select></label><label className="text-[11px] font-bold">{paymentModel==="One-time"?"Project fee · USD":"Monthly fee · USD"}<input type="number" min="0" step="0.01" value={fee} onChange={e=>setFee(e.target.value)} placeholder="0" className={field}/></label>{paymentModel==="Recurring + add-on"&&<label className="text-[11px] font-bold">Agreed add-on · USD<input type="number" min="0" step="0.01" value={addOn} onChange={e=>setAddOn(e.target.value)} placeholder="0" className={field}/></label>}<label className="text-[11px] font-bold">Internal post approval<select value={approvalRequired?"Required":"No approval needed"} onChange={e=>setApprovalRequired(e.target.value==="Required")} className={field}><option>Required</option><option>No approval needed</option></select></label>{approvalRequired&&<label className="text-[11px] font-bold">Approver<select value={approver} onChange={e=>setApprover(e.target.value)} className={field}><option>María</option><option>Gareth</option><option>Niamh</option></select></label>}</div>
    <div className="mt-4 rounded-xl bg-[#FFF1C2] p-3 text-[10px] text-[#715617]">{status==="Potential"?"This project will enter CRM as a proposal. It will appear in the left menu once confirmed.":"Confirmed work appears in the client workspace and left menu."}</div>
    <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded-full bg-[#F2F0EB] px-5 py-3 text-[11px] font-bold">Cancel</button><button onClick={()=>{if(!clientId||!name.trim())return;onCreate({name:name.trim(),clientId,type,status,paymentModel,fee:Number(fee)||0,addOn:Number(addOn)||0,approvalRequired,approver:approvalRequired?approver:"No approval needed"})}} className="rounded-full bg-[#1557B8] px-5 py-3 text-[11px] font-bold text-white">Create project <ArrowRight size={13} className="ml-1 inline"/></button></div>
  </section></div>;
}
