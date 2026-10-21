"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { launchLogos } from "./logos";
import { buildClientChecklist, launchClientDrafts, clients as sampleClients, leads as sampleLeads, freelancerChecklistTemplate, makeChecklist, sampleFreelancerIds, defaultAssets, defaultMonthLine, defaultMonthly, defaultPlaybook, defaultSections, newShare, piecesPerMonth, seedState } from "./seed";
import { canBeAssigned, defaultRates, fromBase, toBase, defaultToolNames, isHired, isPlanAsset, planSlot, monthlyAreas, nameOf, periodName, reviewerFor, todayIso } from "./logic";
import type { CheckItem, Client, FreelancerFee, ClientAsset, ClientSection, ClientShare, Idea, Lead, MonthReport, NewClientDraft, Notice, Post, PostDraft, ReportNumbers, RevisionCategory, Route, SectionStep, State, ReportPeriod, UpdateItem, WeekReport } from "./types";

const KEY = "theworks-os-v5";
/** The report for one week or weeks in a row inside a month report, created when first needed. */
const weekOf = (report: MonthReport, period: ReportPeriod): WeekReport => {
  const weekly = report.weekly ?? (report.weekly = {});
  return weekly[period] ?? (weekly[period] = {});
};
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const stamp = () => new Date().toISOString();

/** Where a new post's art lives: the maker's own Canva and Drive for this client, or the client's Drive folder. */
function makerLinks(d: State, client: Client) {
  const mine = client.team?.find((member) => member.id === d.me) ?? client.team?.find((member) => member.id === client.freelancerId);
  return { designLink: mine?.links?.canva ?? "", driveLink: mine?.links?.drive || client.links.drive || "" };
}

/** Builds a new client and its checklists from what the New client pop-up collects. */
function makeClient(d: State, id: string, draft: NewClientDraft): Client {
  const pkg = d.settings.packages.find((item) => item.id === draft.packageId);
  const sections = d.settings.sections.filter((section) => draft.sectionIds.includes(section.id));
  const marketing = draft.area === "marketing";
  const checklist = buildClientChecklist(sections, id, draft.freelancerId, draft.area);
  const done = (item: CheckItem, note = "") => { item.status = "Received"; item.date = todayIso(); if (note) item.note = note; };
  checklist.forEach((item) => {
    if (item.label === "Client profile created") done(item);
    if (item.label.startsWith("Package")) done(item, pkg?.name ?? "Custom");
    if (item.label.startsWith("Main contact") && draft.mainContact.name.trim() && draft.approver.name.trim()) done(item, `${draft.mainContact.name} · approver ${draft.approver.name}`);
    if (item.label === "Billing contact" && draft.billingContact.trim()) done(item, draft.billingContact);
    if (item.label.startsWith("Approval route")) done(item, draft.approvalMode === "C" ? "Internal" : "Client reviews if they ask");
    if (item.label === "Freelancer assigned" && draft.freelancerId) done(item);
  });
  return {
    id, area: draft.area, areaName: draft.areaName, description: draft.description, setupPosts: draft.setupPosts, monthDone: {}, packNotes: { brand: "", brain: "", templates: "" },
    name: draft.name, color: draft.color, logo: draft.logo, sector: draft.sector, package: pkg?.name ?? "Custom", packageId: pkg?.id, assets: draft.assets,
    sections: sections.map(({ id: sectionId, label, color, blurb }) => ({ id: sectionId, label, color, blurb })),
    share: newShare(id, Date.now() % 1000), stage: "Onboarding", approvalMode: draft.approvalMode, mainContact: draft.mainContact, approver: draft.approver, billingContact: draft.billingContact,
    channel: "Google Chat", expertReviewer: "", ownerId: "maria", opsId: "niamh", freelancerId: draft.freelancerId, team: draft.freelancerId ? [{ id: draft.freelancerId, role: "" }] : [], freelancerFee: 0, fee: draft.fee, addOnFee: draft.addOnFee,
    agreedPosts: marketing ? piecesPerMonth(draft.assets) : 0, platforms: marketing ? (draft.platforms?.length ? draft.platforms : ["LinkedIn"]) : [], currency: draft.currency, startDate: draft.startDate || todayIso(), links: { drive: "", canva: "", publer: "", chat: "", brandKit: "", guide: "", brain: "" }, checklist,
    strategy: { offer: "", services: "", personas: [], pillars: [], tone: "", avoid: "", claims: "", approved: false }, hours: {}, planApproval: {}, access: [], files: [], costs: [],
  };
}

/** Fills in anything a saved copy from an earlier version does not have yet. */
function migrate(saved: State): State {
  const defaults = defaultSections();
  const sections = saved.settings.sections.map((section) => {
    const fresh = defaults.find((item) => item.id === section.id);
    if (!fresh) return section;
    const steps: SectionStep[] = section.steps.map((step) => ({ ...step, areas: step.areas ?? fresh.steps.find((entry) => entry.label === step.label)?.areas }));
    for (const step of fresh.steps) if (step.areas && !steps.some((entry) => entry.label === step.label)) steps.push(step);
    return { ...section, areas: section.areas ?? fresh.areas, steps };
  });
  for (const section of defaults) if (!sections.some((item) => item.id === section.id)) sections.push(section);
  // The directory: where each freelancer came from, how to reach them, and the work they did for us. The sample freelancers are cleared once.
  const freelancers = (saved.freelancersCleared ? saved.freelancers : saved.freelancers.filter((person) => !sampleFreelancerIds.includes(person.id))).map((person) => ({ ...person, platform: person.platform ?? "", profileUrl: person.profileUrl ?? "", driveUrl: person.driveUrl ?? "", files: person.files ?? [], specialities: person.specialities ?? (person.speciality ? [person.speciality] : []), availability: person.availability ?? { mode: "hours" as const, amount: 0 }, fees: person.fees ?? [], tools: person.tools ?? defaultToolNames.map((name) => ({ id: `tool-${name}`, name, done: false, login: "", link: "", kept: "" })), trialDone: person.trialDone ?? false, ndaDate: person.ndaDate ?? "", contractDate: person.contractDate ?? "", phone: person.phone ?? "", notes: person.notes ?? "", jobs: person.jobs ?? [] }));
  // Once: clear away the sample clients and everything that belongs to them, and keep anything the team added themselves.
  const sampleIds = new Set(sampleClients.map((client) => client.id));
  const sampleLeadIds = new Set(sampleLeads.map((lead) => lead.id));
  const fresh = !saved.cleaned;
  const nameOfSample = (id?: string) => saved.clients.find((client) => client.id === id)?.name;
  const keep = <T extends { clientId: string }>(list: T[]) => (fresh ? list.filter((item) => !sampleIds.has(item.clientId)) : list);
  const next: State = {
    ...saved,
    cleaned: true,
    people: saved.people.map((person) => (person.id === "niamh" && person.name === "Coordinator" ? { ...person, name: "Nahomi", title: "Coordinator · Operations" } : person)),
    freelancersCleared: true,
    // Open on the current month each time. The arrows still move to any other.
    month: todayIso().slice(0, 7),
    me: freelancers.some((person) => person.id === saved.me) || saved.people.some((person) => person.id === saved.me) ? saved.me : "maria",
    freelancers: fresh ? freelancers.map((person) => ({ ...person, jobs: person.jobs.map((job) => (job.clientId && sampleIds.has(job.clientId) ? { ...job, clientId: undefined, client: nameOfSample(job.clientId) ?? job.client } : job)) })) : freelancers,
    ideas: keep(saved.ideas),
    reports: keep(saved.reports),
    invoices: keep(saved.invoices),
    payouts: keep(saved.payouts),
    leads: fresh ? saved.leads.filter((lead) => !sampleLeadIds.has(lead.id)) : saved.leads,
    notices: fresh ? [] : saved.notices,
    playbook: saved.playbook ?? defaultPlaybook(),
    updates: saved.updates ?? [],
    posts: keep(saved.posts),
    settings: { ...saved.settings, assets: [...saved.settings.assets, ...defaultAssets.filter((asset) => !saved.settings.assets.some((item) => item.id === asset.id))], sections, monthly: (saved.settings.monthly ?? defaultMonthly()).filter((step) => step.id !== "f4"), monthLine: saved.settings.monthLine ?? defaultMonthLine(saved.settings.dates), rates: { ...defaultRates, ...saved.settings.rates } },
    clients: (fresh ? saved.clients.filter((client) => !sampleIds.has(client.id)) : saved.clients).map((client) => ({ ...client, team: client.team ?? (client.freelancerId ? [{ id: client.freelancerId, role: "" }] : []), area: client.area ?? "marketing", setupPosts: client.setupPosts ?? 2, monthDone: client.monthDone ?? {}, packNotes: client.packNotes ?? { brand: "", brain: "", templates: "" } })),
  };
  // The first four clients are added once. Clients added by hand are kept, and ones deleted later do not come back.
  if (!saved.launchClientsAdded) {
    next.launchClientsAdded = true;
    for (const { id, draft } of launchClientDrafts(next.settings)) {
      if (next.clients.some((client) => client.id === id)) continue;
      next.clients.push(makeClient(next, id, draft));
      next.invoices.push({ clientId: id, month: next.month, status: "Not sent", date: "" });
    }
  }
  // The first clients get the logos we were given. A logo someone has already set is left alone.
  if (!saved.logosAdded) {
    next.logosAdded = true;
    for (const client of next.clients) {
      if (!client.logo && launchLogos[client.id]) client.logo = launchLogos[client.id];
      if (client.id === "firereg" && client.color === "#D6457A") client.color = "#5E7F3A";
      if (client.id === "firereg" && client.name === "Firereg") client.name = "Firereg.ai";
      if (client.id === "marker-group" && client.color === "#1D9E5A") client.color = "#070808";
    }
  }
  return next;
}

// ─── Hash routing, so the back button works ───
export function routeToHash(route: Route) {
  const parts: string[] = [route.view];
  if (route.view === "client") parts.push(route.clientId, route.tab ?? "", route.sub ?? "", route.postId ?? "");
  if (route.view === "marketing") parts.push(route.clientId ?? "all", route.tab ?? "", route.postId ?? "", route.filter ?? "");
  if (route.view === "settings" && route.tab) parts.push(route.tab);
  if (route.view === "view") parts.push(route.token);
  if (route.view === "leads" && route.leadId) parts.push(route.leadId);
  if (route.view === "freelancers" && route.freelancerId) parts.push(route.freelancerId);
  if (route.view === "reports" && (route.clientId || route.month)) parts.push(route.clientId ?? "all", route.month ?? "");
  return `#/${parts.join("/").replace(/\/+$/, "")}`;
}
export function hashToRoute(hash: string): Route {
  const [view, a, b, c, d, e] = hash.replace(/^#\/?/, "").split("/");
  switch (view) {
    case "client":
      return a ? { view, clientId: a, tab: b || undefined, sub: c || undefined, postId: d || undefined } : { view: "clients" };
    case "marketing":
      return { view, clientId: a || undefined, tab: b || undefined, postId: c || undefined, filter: e || undefined };
    case "settings":
      return { view, tab: a || undefined };
    case "view":
      return a ? { view, token: a } : { view: "today" };
    case "leads":
      return { view, leadId: a || undefined };
    case "freelancers":
      return { view, freelancerId: a || undefined };
    case "reports":
      return { view, clientId: a && a !== "all" ? a : undefined, month: b || undefined };
    case "clients":
    case "finance":
    case "how":
      return { view };
    default:
      return { view: "today" };
  }
}

type Draft = State;
type Ctx = ReturnType<typeof useStoreValue>;
const StoreContext = createContext<Ctx | null>(null);

function notify(d: Draft, to: string | undefined, text: string, link: Route, channels: Notice["channels"] = ["In app", "Email"]) {
  if (!to || to === d.me || to === "client" || to === "unassigned") return;
  d.notices.unshift({ id: uid("n"), to, text, at: stamp(), read: false, channels, link });
}

function useStoreValue() {
  const [state, setState] = useState<State>(seedState);
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<Route>({ view: "today" });
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const [wizard, setWizard] = useState<{ open: boolean; leadId?: string }>({ open: false });
  const [updateWizard, setUpdateWizard] = useState<{ open: boolean; clientId?: string }>({ open: false });
  const [postWizard, setPostWizard] = useState<{ open: boolean; clientId?: string; ideaId?: string; assetId?: string; date?: string }>({ open: false });
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load once on the client.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as State;
        if (parsed.version === 5) setState(migrate(parsed));
      } else {
        setState((current) => migrate(current));
      }
    } catch {
      /* private mode or corrupt data: start from the sample */
    }
    setRoute(hashToRoute(window.location.hash));
    setReady(true);
    const onHash = () => setRoute(hashToRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Save on every change. Files held only in this tab (blob:) are not saved.
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      try {
        const clean: State = {
          ...state,
          posts: state.posts.map((post) => ({ ...post, files: post.files.filter((file) => !file.src.startsWith("blob:")) })),
          clients: state.clients.map((client) => (client.packFiles ? { ...client, packFiles: Object.fromEntries(Object.entries(client.packFiles).filter(([, file]) => file && !file.url.startsWith("blob:"))) } : client)),
        };
        try {
          window.localStorage.setItem(KEY, JSON.stringify(clean));
        } catch {
          // Too big for the browser. Keep the text and the real files; leave out the drawn PDF pages, which can be redrawn.
          const lean: State = { ...clean, posts: clean.posts.map((post) => ({ ...post, files: post.files.filter((file) => !file.pageOf) })) };
          window.localStorage.setItem(KEY, JSON.stringify(lean));
        }
      } catch {
        /* storage full: keep working in memory */
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [state, ready]);

  const ping = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  }, []);

  const update = useCallback((fn: (d: Draft) => void) => {
    setState((current) => {
      const d = structuredClone(current);
      fn(d);
      return d;
    });
  }, []);

  const go = useCallback((next: Route) => {
    const hash = routeToHash(next);
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    setRoute(next);
    window.scrollTo({ top: 0 });
  }, []);

  const actions = useMemo(() => {
    const withPost = (d: Draft, id: string) => {
      const post = d.posts.find((item) => item.id === id)!;
      const client = d.clients.find((item) => item.id === post.clientId)!;
      return { post, client };
    };
    const log = (d: Draft, post: Post, text: string) => post.history.unshift({ at: stamp(), by: d.me, text });
    const postRoute = (post: Post): Route => ({ view: "marketing", clientId: post.clientId, postId: post.id });

    return {
      setMe: (id: string) => update((d) => { d.me = id; }),
      setMonth: (month: string) => update((d) => { d.month = month; }),
      reset: () => { window.localStorage.removeItem(KEY); setState({ ...seedState(), launchClientsAdded: true, logosAdded: true }); go({ view: "today" }); ping("Data emptied"); },

      // Access, files and costs on a client
      addAccess: (clientId: string, item: Omit<State["clients"][number]["access"][number], "id">) => update((d) => { d.clients.find((c) => c.id === clientId)!.access.push({ ...item, id: uid("acc") }); }),
      updateAccess: (clientId: string, id: string, patch: Partial<State["clients"][number]["access"][number]>) => update((d) => { Object.assign(d.clients.find((c) => c.id === clientId)!.access.find((item) => item.id === id)!, patch); }),
      removeAccess: (clientId: string, id: string) => update((d) => { const client = d.clients.find((c) => c.id === clientId)!; client.access = client.access.filter((item) => item.id !== id); }),
      addFile: (clientId: string, file: { name: string; url: string; category: State["clients"][number]["files"][number]["category"] }) => {
        update((d) => { d.clients.find((c) => c.id === clientId)!.files.unshift({ ...file, id: uid("file"), addedAt: todayIso(), addedBy: d.me }); });
        ping("Added");
      },
      removeFile: (clientId: string, id: string) => update((d) => { const client = d.clients.find((c) => c.id === clientId)!; client.files = client.files.filter((item) => item.id !== id); }),
      addCost: (clientId: string, cost: { label: string; amount: number; recurring: boolean }) => {
        update((d) => { d.clients.find((c) => c.id === clientId)!.costs.push({ ...cost, id: uid("cost"), month: d.month }); });
        ping("Cost added. It also shows in Finance.");
      },
      removeCost: (clientId: string, id: string) => update((d) => { const client = d.clients.find((c) => c.id === clientId)!; client.costs = client.costs.filter((item) => item.id !== id); }),
      addCheck: (clientId: string, areaId: string, title: string) => {
        update((d) => {
          d.clients.find((c) => c.id === clientId)!.checklist.push({ id: uid("custom"), group: "Added for this client", area: areaId, label: title, owner: "maria", status: "Not asked", date: "", note: "" });
        });
        ping("Step added for this client");
      },
      removeCheck: (clientId: string, itemId: string) => update((d) => { const client = d.clients.find((c) => c.id === clientId)!; client.checklist = client.checklist.filter((item) => item.id !== itemId); }),
      toggleQa: (postId: string, itemId: string) =>
        update((d) => {
          const post = d.posts.find((item) => item.id === postId)!;
          const list = post.qa ?? [];
          post.qa = list.includes(itemId) ? list.filter((id) => id !== itemId) : [...list, itemId];
        }),
      toggleCheck: (clientId: string, itemId: string) =>
        update((d) => {
          const item = d.clients.find((c) => c.id === clientId)!.checklist.find((entry) => entry.id === itemId)!;
          item.status = item.status === "Received" ? "Not asked" : "Received";
          item.date = item.status === "Received" ? todayIso() : "";
        }),
      toggleFreelancerCheck: (freelancerId: string, itemId: string) =>
        update((d) => {
          const item = d.freelancers.find((f) => f.id === freelancerId)!.checklist.find((entry) => entry.id === itemId)!;
          item.status = item.status === "Received" ? "Not asked" : "Received";
          item.date = item.status === "Received" ? todayIso() : "";
        }),
      attachReport: (clientId: string, month: string, slot: "freelancerReport" | "clientReport" | "financeReport", file: { name: string; url: string } | undefined, period: ReportPeriod = "month") => {
        update((d) => {
          let report = d.reports.find((item) => item.clientId === clientId && item.month === month);
          if (!report) { report = { id: `${clientId}-${month}`, clientId, month, checked: false, summary: "", recommendations: "", approved: false, sentAt: "", reportLink: "" }; d.reports.push(report); }
          const client = d.clients.find((c) => c.id === clientId)!;
          if (period !== "month") {
            const week = weekOf(report, period);
            week.freelancerReport = file ? { ...file, addedAt: todayIso(), addedBy: d.me } : undefined;
            return;
          }
          report[slot] = file ? { ...file, addedAt: todayIso(), addedBy: d.me } : undefined;
          if (slot === "freelancerReport" && file) notify(d, client.opsId, `${client.name}: the freelancer's monthly report is in`, { view: "client", clientId, tab: "reporting" });
        });
        if (file) ping("Report attached");
      },
      /** Adds one more file to the freelancer's reports for a month. There can be as many as needed. */
      addFreelancerReportFile: (clientId: string, month: string, file: { name: string; url: string }) => {
        update((d) => {
          let report = d.reports.find((item) => item.clientId === clientId && item.month === month);
          if (!report) { report = { id: `${clientId}-${month}`, clientId, month, checked: false, summary: "", recommendations: "", approved: false, sentAt: "", reportLink: "" }; d.reports.push(report); }
          (report.freelancerReports ?? (report.freelancerReports = [])).push({ ...file, addedAt: todayIso(), addedBy: d.me });
          const client = d.clients.find((c) => c.id === clientId)!;
          notify(d, client.opsId, `${client.name}: a file was added to the freelancer's report`, { view: "client", clientId, tab: "reporting" });
        });
        ping("Added to the reports");
      },
      removeFreelancerReportFile: (clientId: string, month: string, index: number) =>
        update((d) => {
          const report = d.reports.find((item) => item.clientId === clientId && item.month === month);
          if (report?.freelancerReports) report.freelancerReports.splice(index, 1);
        }),
      movePost: (id: string, date: string) => {
        update((d) => {
          const post = d.posts.find((item) => item.id === id)!;
          post.date = date;
          post.history.unshift({ at: stamp(), by: d.me, text: `Moved to ${date}` });
        });
        ping("Date changed");
      },

      // Clients
      createClient: (draft: NewClientDraft) => {
        let id = draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || uid("client");
        if (stateRef.current.clients.some((client) => client.id === id)) id = `${id}-${Date.now().toString(36)}`;
        update((d) => {
          d.clients.push(makeClient(d, id, draft));
          d.invoices.push({ clientId: id, month: d.month, status: "Not sent", date: "" });
          if (draft.leadId) {
            const lead = d.leads.find((item) => item.id === draft.leadId);
            if (lead) { lead.stage = "Won"; lead.clientId = id; lead.followUp = ""; }
          }
          notify(d, "niamh", `New client to set up: ${draft.name}`, { view: "client", clientId: id, tab: "checklists" });
          if (draft.freelancerId) notify(d, draft.freelancerId, `You have been assigned to ${draft.name}`, { view: "marketing", clientId: id });
        });
        ping(`${draft.name} created with its checklists`);
        return id;
      },
      /** Ticks or unticks a manual step on a client's monthly checklist. When the freelancer finishes theirs, operations is told. */
      toggleMonthStep: (clientId: string, month: string, stepId: string) => {
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          const done = client.monthDone[month] ?? (client.monthDone[month] = {});
          if (done[stepId]) delete done[stepId];
          else done[stepId] = todayIso();
          const mine = monthlyAreas(d, client, month).find((area) => area.id === "freelancer");
          const step = d.settings.monthly.find((item) => item.id === stepId);
          if (step?.role === "freelancer" && done[stepId] && mine && mine.steps.every((item) => item.done)) {
            notify(d, client.opsId, `${client.name}: the freelancer finished their ${month} checklist`, { view: "client", clientId: client.id, tab: "checklists", sub: "freelancer" });
          }
        });
      },
      /** Changes one asset on one client, such as giving extra work to a freelancer. The freelancer is told when it is first assigned. */
      updateClientAsset: (clientId: string, assetId: string, patch: Partial<ClientAsset>) => {
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          const asset = client.assets.find((item) => item.id === assetId);
          if (!asset) return;
          const before = asset.assignedTo;
          Object.assign(asset, patch);
          if (patch.assignedTo && patch.assignedTo !== before) notify(d, patch.assignedTo, `New extra work for ${client.name}: ${asset.name}${asset.due ? ` · due ${asset.due}` : ""}`, { view: "marketing", clientId, tab: "posts" });
        });
        if (patch.assignedTo) ping("Assigned. The freelancer can see it now.");
      },
      setClientAssets: (clientId: string, assets: ClientAsset[]) =>
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          client.assets = assets;
          client.agreedPosts = piecesPerMonth(assets);
        }),
      /** Adds an asset to one client and the checklist sections it needs. Defaults in Settings are not touched. */
      addClientAsset: (clientId: string, asset: ClientAsset) => {
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          client.assets.push(asset);
          client.agreedPosts = piecesPerMonth(client.assets);
          const needed = d.settings.assets.find((item) => item.id === asset.assetId)?.sections ?? [];
          for (const sectionId of needed) {
            const def = d.settings.sections.find((section) => section.id === sectionId);
            if (!def || client.sections.some((section) => section.id === sectionId)) continue;
            client.sections.push({ id: def.id, label: def.label, color: def.color, blurb: def.blurb });
            client.checklist.push(...buildClientChecklist([def], client.id, client.freelancerId, client.area));
          }
        });
        ping(`${asset.name} added for this client`);
      },
      addClientSection: (clientId: string, opts: { fromId?: string; label?: string }) => {
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          const def = opts.fromId ? d.settings.sections.find((section) => section.id === opts.fromId) : undefined;
          const palette = ["#2F6FDB", "#1D9E5A", "#7C5CD6", "#D6457A", "#E08A1E", "#0F8F8F"];
          const section: ClientSection = def ? { id: def.id, label: def.label, color: def.color, blurb: def.blurb } : { id: uid("sec"), label: opts.label?.trim() || "New section", color: palette[client.sections.length % palette.length], blurb: "Added for this client." };
          if (client.sections.some((item) => item.id === section.id)) return;
          client.sections.push(section);
          if (def) client.checklist.push(...buildClientChecklist([def], client.id, client.freelancerId, client.area));
        });
        ping("Section added for this client");
      },
      removeClientSection: (clientId: string, sectionId: string) =>
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          client.sections = client.sections.filter((section) => section.id !== sectionId);
          client.checklist = client.checklist.filter((item) => item.area !== sectionId);
        }),
      renameClientSection: (clientId: string, sectionId: string, label: string) => update((d) => { const section = d.clients.find((c) => c.id === clientId)!.sections.find((item) => item.id === sectionId); if (section) section.label = label; }),
      updateShare: (clientId: string, patch: Partial<ClientShare>) => update((d) => { Object.assign(d.clients.find((c) => c.id === clientId)!.share, patch); }),
      /** The client's answer, when they have asked to review something. */
      clientDecide: (postId: string, decision: "Approved" | "Changes requested", note: string) => {
        update((d) => {
          const { post, client } = withPost(d, postId);
          post.clientDecision = { status: decision, via: "Client view", date: todayIso(), note };
          if (decision === "Approved") { post.status = "Ready to schedule"; log(d, post, "Client approved"); }
          else { post.comments.push({ id: uid("c"), by: "client", body: note || "The client asked for changes.", at: stamp(), kind: "change", category: "Copy" }); post.status = "Design in progress"; log(d, post, "Client requested changes"); }
          notify(d, client.freelancerId, `${client.name}: client ${decision === "Approved" ? "approved" : "asked for changes on"} ${post.title}`, postRoute(post));
          notify(d, client.opsId, `${client.name}: client ${decision === "Approved" ? "approved" : "asked for changes on"} ${post.title}`, postRoute(post));
        });
      },
      updateClient: (id: string, patch: Partial<Client>) => update((d) => { Object.assign(d.clients.find((item) => item.id === id)!, patch); }),
      updateCheck: (clientId: string, itemId: string, patch: Partial<CheckItem>) =>
        update((d) => {
          const item = d.clients.find((c) => c.id === clientId)!.checklist.find((entry) => entry.id === itemId)!;
          if (patch.status && patch.status !== item.status) item.date = patch.status === "Not asked" ? "" : todayIso();
          Object.assign(item, patch);
        }),
      setHours: (clientId: string, month: string, role: "owner" | "ops" | "freelancer", value: number) =>
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          client.hours[month] = { ...(client.hours[month] ?? { owner: 0, ops: 0, freelancer: 0 }), [role]: value };
        }),
      /** Adds a freelancer to a client. A client can have several, each with what they do. The first is the lead. */
      assignFreelancer: (clientId: string, freelancerId: string, role = "") => {
        if (!freelancerId) return;
        const candidate = stateRef.current.freelancers.find((item) => item.id === freelancerId);
        const missingPaperwork = Boolean(candidate && !canBeAssigned(stateRef.current, candidate));
        update((d) => {
          const client = d.clients.find((item) => item.id === clientId)!;
          const team = client.team ?? (client.team = client.freelancerId ? [{ id: client.freelancerId, role: "" }] : []);
          if (!team.some((member) => member.id === freelancerId)) team.push({ id: freelancerId, role });
          client.freelancerId = team[0]?.id;
          const item = client.checklist.find((entry) => entry.label === "Freelancer assigned");
          if (item) { item.status = "Received"; item.date = todayIso(); }
          notify(d, freelancerId, `You have been assigned to ${client.name}${role ? ` for ${role}` : ""}`, { view: "marketing", clientId });
        });
        ping(missingPaperwork ? "Assigned and notified. Their NDA or contract is not signed yet." : "Freelancer assigned and notified");
      },
      unassignFreelancer: (clientId: string, freelancerId: string) => {
        update((d) => {
          const client = d.clients.find((item) => item.id === clientId)!;
          client.team = (client.team ?? []).filter((member) => member.id !== freelancerId);
          if (client.freelancerId === freelancerId) client.freelancerId = client.team[0]?.id;
          const item = client.checklist.find((entry) => entry.label === "Freelancer assigned");
          if (item && client.team.length === 0) { item.status = "Not asked"; item.date = ""; }
        });
        ping("Freelancer taken off this client");
      },
      /** A freelancer's own Canva and Drive links for one client. */
      setTeamLinks: (clientId: string, freelancerId: string, patch: { canva?: string; drive?: string }) =>
        update((d) => {
          const member = d.clients.find((item) => item.id === clientId)!.team?.find((entry) => entry.id === freelancerId);
          if (member) member.links = { ...member.links, ...patch };
        }),
      setTeamRole: (clientId: string, freelancerId: string, role: string) =>
        update((d) => {
          const member = d.clients.find((item) => item.id === clientId)!.team?.find((entry) => entry.id === freelancerId);
          if (member) member.role = role;
        }),
      /** Marks payments as paid for a month, in the currency they were actually paid in. */
      payOccurrences: (items: { personId: string; feeId: string; month: string }[], currency: string) => {
        update((d) => {
          for (const { personId, feeId, month } of items) {
            const fee = d.freelancers.find((person) => person.id === personId)?.fees.find((entry) => entry.id === feeId);
            if (!fee) continue;
            const inBase = toBase(d, fee.amount, fee.currency);
            const amount = Math.round(fromBase(d, inBase, currency) * 100) / 100;
            (fee.paid ?? (fee.paid = {}))[month] = { date: todayIso(), amount, currency };
          }
        });
        ping("Marked as paid");
      },
      unpayOccurrence: (personId: string, feeId: string, month: string) =>
        update((d) => {
          const fee = d.freelancers.find((person) => person.id === personId)?.fees.find((entry) => entry.id === feeId);
          if (fee?.paid) delete fee.paid[month];
        }),

      // Ideas
      addIdeas: (clientId: string, items: Pick<Idea, "title" | "notes" | "format">[], source: string) => {
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          d.ideas.unshift(...items.map((item) => ({ ...item, id: uid("idea"), clientId, decision: "New" as const, comment: "", createdBy: d.me, createdAt: todayIso(), source, month: d.month })));
          notify(d, reviewerFor(d, client), `${items.length} new idea${items.length === 1 ? "" : "s"} for ${client.name} to decide`, { view: "marketing", clientId, tab: "ideas" }, ["In app", "Email", "Google Chat"]);
        });
        ping(`${items.length} idea card${items.length === 1 ? "" : "s"} added`);
      },
      /** Files what a research document contained: facts into the client's strategy, calls to action into the library, ideas into the deck. */
      importResearch: (clientId: string, data: { facts: { label: string; value: string }[]; ctas: { text: string; group: string }[]; brief: string; ideas: { title: string; topic?: string; notes: string; angle: string; format: string; decision: "New" | "Approved" | "Rejected" | "Done"; group: string }[]; source: string }) => {
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          const strategy = client.strategy;
          if (data.facts.length) {
            const facts = strategy.facts ?? (strategy.facts = []);
            for (const fact of data.facts) {
              const existing = facts.find((item) => item.label.toLowerCase() === fact.label.toLowerCase());
              if (existing) existing.value = fact.value;
              else facts.push({ id: uid("fact"), ...fact });
            }
            const pick = (...names: string[]) => data.facts.find((fact) => names.includes(fact.label.toLowerCase()))?.value;
            if (!strategy.offer.trim()) strategy.offer = pick("offer") ?? strategy.offer;
            if (!strategy.services.trim()) strategy.services = pick("product", "services") ?? strategy.services;
            if (!strategy.claims.trim()) strategy.claims = pick("boundary", "claims") ?? strategy.claims;
            const target = pick("target", "audience", "target audience");
            if (target && !strategy.personas.some((persona) => persona.name.toLowerCase() === target.toLowerCase())) strategy.personas.push({ id: uid("persona"), name: target, cares: pick("purpose") ?? "", pains: "", wants: pick("benefits") ?? "" });
          }
          if (data.ctas.length) {
            const library = strategy.ctas ?? (strategy.ctas = []);
            for (const cta of data.ctas) if (!library.some((item) => item.text.toLowerCase() === cta.text.toLowerCase())) library.push({ id: uid("cta"), ...cta });
          }
          if (data.brief && !strategy.brief?.trim()) strategy.brief = data.brief;
          const have = new Set(d.ideas.filter((idea) => idea.clientId === clientId).map((idea) => idea.title.toLowerCase()));
          const fresh = data.ideas.filter((idea) => !have.has(idea.title.toLowerCase()));
          d.ideas.unshift(...fresh.map((idea) => ({ id: uid("idea"), clientId, title: idea.title, topic: idea.topic || undefined, notes: idea.notes, angle: idea.angle || undefined, group: idea.group || undefined, format: idea.format, decision: idea.decision, comment: "", createdBy: d.me, createdAt: todayIso(), source: data.source, month: d.month })));
          const toDecide = fresh.filter((idea) => idea.decision === "New").length;
          const toWrite = fresh.filter((idea) => idea.decision === "Approved").length;
          if (toDecide) notify(d, reviewerFor(d, client), `${toDecide} new idea${toDecide === 1 ? "" : "s"} for ${client.name} to decide`, { view: "marketing", clientId, tab: "ideas" }, ["In app", "Email", "Google Chat"]);
          if (toWrite) notify(d, client.freelancerId, `${client.name}: ${toWrite} idea${toWrite === 1 ? "" : "s"} ready to turn into posts`, { view: "marketing", clientId, tab: "ideas" });
        });
        ping("Document filed");
      },
      updateIdea: (id: string, patch: Partial<Idea>) =>
        update((d) => {
          const idea = d.ideas.find((item) => item.id === id)!;
          const was = idea.decision;
          Object.assign(idea, patch);
          const client = d.clients.find((item) => item.id === idea.clientId);
          if (patch.decision === "Approved" && was !== "Approved" && client) notify(d, client.freelancerId, `${client.name}: idea approved, create the post · ${idea.title}`, { view: "marketing", clientId: client.id, tab: "ideas" });
        }),
      /** Creates a post from the create-post flow, as a draft or sent straight for review. */
      createPost: (draft: PostDraft) => {
        const id = uid("post");
        update((d) => {
          const client = d.clients.find((item) => item.id === draft.clientId)!;
          const idea = draft.ideaId ? d.ideas.find((item) => item.id === draft.ideaId) : undefined;
          const withArt = draft.files.length > 0;
          const status: Post["status"] = !draft.send ? "Copy in progress" : withArt ? "Design review" : "Copy review";
          const post: Post = {
            id, clientId: client.id, ideaId: idea?.id, extra: draft.extra, extraType: draft.extraType, assetId: draft.assetId, reviewerId: draft.reviewerId, title: draft.title, format: draft.format, platforms: draft.platforms.length ? draft.platforms : [client.platforms[0] ?? "LinkedIn"],
            date: draft.date, status, copy: draft.copy, captions: draft.captions, files: draft.files, art: draft.title, ...makerLinks(d, client), version: 1,
            comments: idea?.notes ? [{ id: uid("c"), by: idea.createdBy, body: `From the idea: ${idea.notes}`, at: stamp(), kind: "system" }] : [],
            history: [{ at: stamp(), by: d.me, text: idea ? "Created from an idea" : "Post created" }],
            needsExpert: /regulation|part [a-z]|span|load|fire|compliance|certif/i.test(`${draft.title} ${idea?.notes ?? ""}`), expertOk: false, waitingSince: todayIso(),
          };
          if (draft.send) post.history.unshift({ at: stamp(), by: d.me, text: withArt ? "Sent copy and artwork for review (v1)" : "Sent copy for review (v1)" });
          d.posts.push(post);
          if (idea) { idea.postId = id; idea.decision = "Approved"; }
          if (draft.send) notify(d, reviewerFor(d, client, post), `${client.name}: ${withArt ? "post" : "copy"} ready to review · ${post.title}`, postRoute(post), ["In app", "Email", "Google Chat"]);
        });
        ping(draft.send ? "Sent for review. The reviewer has been notified." : "Saved as a draft. Find it in Posts, under Needs me, and on the calendar.");
        return id;
      },
      /**
       * Sends an update: a message and the posts that come with it. Each post is a draft that stays with the freelancer, or goes for review.
       * Nobody is told about drafts. The reviewer gets one notice for everything sent for review.
       */
      createUpdate: (input: { clientId: string; date: string; message: string; reviewerId?: string; items: UpdateItem[] }) => {
        const id = uid("upd");
        let sent = 0;
        update((d) => {
          const client = d.clients.find((item) => item.id === input.clientId)!;
          const postIds: string[] = [];
          for (const item of input.items) {
            const postId = uid("post");
            const withArt = item.files.length > 0;
            const month = item.date.slice(0, 7);
            const slot = planSlot(client, d.posts, month, item.format);
            const notInPlan = client.assets.some(isPlanAsset) && !slot;
            const post: Post = {
              id: postId, updateId: id, clientId: client.id, extra: notInPlan || undefined, extraType: notInPlan ? item.format : undefined, assetId: slot?.asset.id, reviewerId: input.reviewerId || undefined,
              title: item.title, format: item.format, platforms: item.platforms.length ? item.platforms : [client.platforms[0] ?? "LinkedIn"], date: item.date,
              status: !item.send ? "Copy in progress" : withArt ? "Design review" : "Copy review", copy: item.copy, captions: {}, files: item.files, art: item.title, ...makerLinks(d, client), version: 1,
              comments: [], history: [{ at: stamp(), by: d.me, text: "Added in an update" }], needsExpert: /regulation|part [a-z]|span|load|fire|compliance|certif/i.test(item.title), expertOk: false, waitingSince: todayIso(),
            };
            if (item.send) { post.history.unshift({ at: stamp(), by: d.me, text: withArt ? "Sent copy and artwork for review (v1)" : "Sent copy for review (v1)" }); sent += 1; }
            d.posts.push(post);
            postIds.push(postId);
          }
          d.updates.unshift({ id, clientId: client.id, by: d.me, date: input.date, at: stamp(), message: input.message, reviewerId: input.reviewerId || undefined, postIds });
          const first = d.posts.find((post) => post.id === postIds[0]);
          if (sent > 0 && first) notify(d, reviewerFor(d, client, first), `${nameOf(d, d.me)} sent an update for ${client.name}: ${sent} post${sent === 1 ? "" : "s"} to review`, { view: "marketing", clientId: client.id, tab: "updates" }, ["In app", "Email", "Google Chat"]);
        });
        ping(sent ? `Update sent. The reviewer has been told about ${sent} post${sent === 1 ? "" : "s"}.` : "Update saved. Everything in it is still a draft, so nobody has been told.");
        return id;
      },
      ideaToPost: (ideaId: string) => {
        update((d) => {
          const idea = d.ideas.find((item) => item.id === ideaId)!;
          const client = d.clients.find((item) => item.id === idea.clientId)!;
          const post: Post = {
            id: uid("post"), clientId: client.id, ideaId, title: idea.title, format: idea.format, pillarId: idea.pillarId, platforms: [client.platforms[0] ?? "LinkedIn"],
            date: `${d.month}-${String(d.settings.dates.schedule).padStart(2, "0")}`, status: "Copy in progress", copy: "", captions: {}, files: [], art: idea.title, ...makerLinks(d, client),
            version: 1, comments: idea.notes ? [{ id: uid("c"), by: idea.createdBy, body: `From the idea: ${idea.notes}`, at: stamp(), kind: "system" }] : [], history: [{ at: stamp(), by: d.me, text: "Created from an approved idea" }],
            needsExpert: /regulation|part [a-z]|span|load|fire|compliance|certif/i.test(`${idea.title} ${idea.notes}`), expertOk: false, waitingSince: todayIso(),
          };
          d.posts.push(post);
          idea.postId = post.id;
          idea.decision = "Approved";
          notify(d, client.freelancerId, `New post to write for ${client.name}: ${post.title}`, postRoute(post));
        });
        ping("Post created. The freelancer can start the copy.");
      },
      setPlan: (clientId: string, status: "Not sent" | "Sent" | "Approved", via = "Email") =>
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          client.planApproval[d.month] = { status, date: todayIso(), via };
        }),

      // Posts
      addPost: (clientId: string, title: string, date?: string) => {
        const id = uid("post");
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          d.posts.push({ id, clientId, title, format: "Single image", platforms: [client.platforms[0] ?? "LinkedIn"], date: date ?? `${d.month}-${String(d.settings.dates.schedule).padStart(2, "0")}`, status: "Copy in progress", copy: "", captions: {}, files: [], art: title, ...makerLinks(d, client), version: 1, comments: [], history: [{ at: stamp(), by: d.me, text: "Post created" }], needsExpert: false, expertOk: false, waitingSince: todayIso() });
        });
        ping("Post added");
        return id;
      },
      /** The maker finished editing a post that is already with the reviewer or approved. Tell the reviewer and keep a record. */
      postEdited: (id: string) =>
        update((d) => {
          const { post, client } = withPost(d, id);
          if (d.me !== client.freelancerId) return;
          if (post.status === "Copy review" || post.status === "Design review") {
            log(d, post, "Edited while waiting for review");
            notify(d, reviewerFor(d, client, post), `${client.name}: updated while waiting for your review · ${post.title}`, postRoute(post));
          } else if (post.status === "Ready to schedule" || post.status === "Scheduled") log(d, post, "Edited after approval");
        }),
      updatePost: (id: string, patch: Partial<Post>) => update((d) => { Object.assign(d.posts.find((item) => item.id === id)!, patch); }),
      submitPost: (id: string) => {
        update((d) => {
          const { post, client } = withPost(d, id);
          const stage = post.status.startsWith("Copy") ? "copy" : "design";
          post.status = stage === "copy" ? "Copy review" : "Design review";
          post.waitingSince = todayIso();
          if (post.comments.some((comment) => comment.kind === "change")) post.version += 1;
          log(d, post, `Submitted ${stage} for review (v${post.version})`);
          notify(d, reviewerFor(d, client, post), `${client.name}: ${stage} ready to review · ${post.title}`, postRoute(post), ["In app", "Email", "Google Chat"]);
        });
        ping("Submitted. The reviewer has been notified.");
      },
      approvePost: (id: string) => {
        const current = stateRef.current.posts.find((item) => item.id === id)!;
        const currentClient = stateRef.current.clients.find((item) => item.id === current.clientId)!;
        if (current.status === "Design review" && current.needsExpert && !current.expertOk) { ping("Tick the expert check first"); return; }
        update((d) => {
          const { post, client } = withPost(d, id);
          if (post.status === "Copy review") {
            post.status = "Design in progress";
            log(d, post, "Copy approved");
            notify(d, client.freelancerId, `${client.name}: copy approved, start the design · ${post.title}`, postRoute(post));
          } else if (post.status === "Design review") {
            post.status = client.approvalMode === "A" ? "Client approval" : "Ready to schedule";
            post.waitingSince = todayIso();
            log(d, post, client.approvalMode === "A" ? "Design approved internally · sent for client approval" : "Design approved");
            notify(d, client.freelancerId, `${client.name}: approved · ${post.title}`, postRoute(post));
            if (client.approvalMode === "A") notify(d, client.opsId, `${client.name}: send to client for approval · ${post.title}`, postRoute(post));
          }
          post.comments.forEach((comment) => { if (comment.kind === "change") comment.resolved = true; });
        });
        ping(current.status === "Copy review" ? "Copy approved. Design can start." : currentClient.approvalMode === "A" ? "Approved. Now it goes to the client." : "Approved. Ready to schedule.");
      },
      requestChanges: (id: string, body: string, category: RevisionCategory) => {
        update((d) => {
          const { post, client } = withPost(d, id);
          const fromClient = post.status === "Client approval";
          post.comments.push({ id: uid("c"), by: fromClient ? "client" : d.me, body, at: stamp(), kind: "change", category });
          post.status = post.status === "Copy review" ? "Copy in progress" : "Design in progress";
          if (fromClient) post.clientDecision = { status: "Changes requested", via: "Logged by operations", date: todayIso(), note: body };
          log(d, post, `${fromClient ? "Client requested" : "Requested"} changes (${category})`);
          notify(d, client.freelancerId, `${client.name}: changes requested (${category}) · ${post.title}`, postRoute(post));
        });
        ping("Changes sent to the freelancer");
      },
      logClientApproval: (id: string, via: string, note: string) => {
        update((d) => {
          const { post, client } = withPost(d, id);
          post.clientDecision = { status: "Approved", via, date: todayIso(), note };
          post.status = "Ready to schedule";
          log(d, post, `Client approved (${via})`);
          notify(d, client.freelancerId, `${client.name}: client approved, schedule it · ${post.title}`, postRoute(post));
        });
        ping("Client approval logged");
      },
      schedulePost: (id: string, date: string, via: string) => {
        update((d) => {
          const { post } = withPost(d, id);
          post.status = "Scheduled";
          post.date = date;
          post.scheduledVia = via;
          log(d, post, `Scheduled for ${date} (${via}). Final files in Drive.`);
        });
        ping("Scheduled");
      },
      markLive: (id: string, url: string) => {
        update((d) => {
          const { post } = withPost(d, id);
          post.status = "Published";
          post.liveUrl = url;
          log(d, post, "Published");
        });
        ping("Marked as live");
      },
      comment: (id: string, body: string) =>
        update((d) => {
          const { post, client } = withPost(d, id);
          post.comments.push({ id: uid("c"), by: d.me, body, at: stamp(), kind: "comment" });
          const mentioned = [...d.people, ...d.freelancers.filter(isHired)].filter((person) => body.includes(`@${person.name.split(" ")[0]}`)).map((person) => person.id);
          const recipients = new Set([...mentioned, d.me === client.freelancerId ? reviewerFor(d, client, post) : client.freelancerId ?? ""]);
          recipients.forEach((to) => notify(d, to, `${nameOf(d, d.me)} commented on ${post.title}`, postRoute(post)));
        }),
      resolveChange: (id: string, commentId: string) =>
        update((d) => {
          const comment = d.posts.find((item) => item.id === id)!.comments.find((entry) => entry.id === commentId)!;
          comment.resolved = !comment.resolved;
        }),
      moveBack: (id: string) => {
        update((d) => {
          const { post } = withPost(d, id);
          post.status = "Design in progress";
          log(d, post, "Moved back to design");
        });
        ping("Moved back to design");
      },

      // Reports
      /** Saves the key numbers for one platform. The main platform's numbers also feed the client report. */
      saveNumbers: (clientId: string, month: string, platform: string, numbers: ReportNumbers, period: ReportPeriod = "month") => {
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          let report = d.reports.find((item) => item.clientId === clientId && item.month === month);
          if (!report) { report = { id: `${clientId}-${month}`, clientId, month, checked: false, summary: "", recommendations: "", approved: false, sentAt: "", reportLink: "" }; d.reports.push(report); }
          if (period !== "month") {
            const week = weekOf(report, period);
            const weekBy = week.byPlatform ?? (week.byPlatform = {});
            weekBy[platform] = { ...numbers, savedAt: todayIso(), savedBy: d.me };
            return;
          }
          const by = report.byPlatform ?? (report.byPlatform = {});
          by[platform] = { ...numbers, savedAt: todayIso(), savedBy: d.me };
          const main = [...client.platforms, ...Object.keys(by)].find((name) => by[name]);
          if (main) report.numbers = { ...by[main] };
          report.numbersBy = d.me;
          report.numbersAt = todayIso();
        });
        ping(`${platform} numbers saved`);
      },
      toggleReportCheck: (clientId: string, month: string, stepId: string, period: ReportPeriod = "month") =>
        update((d) => {
          let report = d.reports.find((item) => item.clientId === clientId && item.month === month);
          if (!report) { report = { id: `${clientId}-${month}`, clientId, month, checked: false, summary: "", recommendations: "", approved: false, sentAt: "", reportLink: "" }; d.reports.push(report); }
          const holder = period === "month" ? report : weekOf(report, period);
          const checks = holder.checks ?? (holder.checks = {});
          if (checks[stepId]) delete checks[stepId];
          else checks[stepId] = todayIso();
        }),
      submitReport: (clientId: string, month: string, period: ReportPeriod = "month") => {
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          const report = d.reports.find((item) => item.clientId === clientId && item.month === month);
          if (!report) return;
          const label = period === "month" ? `${periodName(period, month)} report` : `report for ${periodName(period, month)}`;
          if (period === "month") report.submittedAt = todayIso();
          else weekOf(report, period).submittedAt = todayIso();
          notify(d, client.opsId, `${client.name}: the freelancer handed in the ${label}`, { view: "client", clientId, tab: "reporting" });
        });
        ping("Report handed to operations");
      },
      updateReport: (clientId: string, month: string, patch: Partial<MonthReport>) =>
        update((d) => {
          let report = d.reports.find((item) => item.clientId === clientId && item.month === month);
          if (!report) { report = { id: `${clientId}-${month}`, clientId, month, checked: false, summary: "", recommendations: "", approved: false, sentAt: "", reportLink: "" }; d.reports.push(report); }
          Object.assign(report, patch);
          const client = d.clients.find((c) => c.id === clientId)!;
          if (patch.checked) notify(d, "maria", `${client.name}: report ready for your approval`, { view: "client", clientId, tab: "reporting" });
          if (patch.approved) notify(d, client.opsId, `${client.name}: report approved, send it`, { view: "client", clientId, tab: "reporting" });
        }),

      // Leads
      addLead: (company: string) => update((d) => { d.leads.unshift({ id: uid("lead"), company, contact: "", email: "", sector: "", source: "", package: "Not sure", value: 0, stage: "New", followUp: todayIso(), notes: [], ownerId: "gareth" }); }),
      updateLead: (id: string, patch: Partial<Lead>) =>
        update((d) => {
          const lead = d.leads.find((item) => item.id === id)!;
          if (patch.stage && patch.stage !== lead.stage && !["Won", "Lost"].includes(patch.stage)) {
            const next = new Date();
            next.setDate(next.getDate() + d.settings.followUpDays);
            patch.followUp = next.toISOString().slice(0, 10);
          }
          Object.assign(lead, patch);
        }),
      // Freelancers
      updateFreelancer: (id: string, patch: Partial<State["freelancers"][number]>) => update((d) => { Object.assign(d.freelancers.find((item) => item.id === id)!, patch); }),
      /** Adds someone to the directory. They are not hired until a trial starts. */
      addFreelancer: (draft: { name: string; platform: string; profileUrl: string; driveUrl?: string; email: string; specialities: string[]; fee?: Omit<FreelancerFee, "id"> }) => {
        const id = uid("fl");
        update((d) => {
          const palette = ["#8E5CD9", "#E08A1E", "#3D8BD9", "#D94F70", "#1B9C85", "#C2578A", "#4C8B6F"];
          d.freelancers.push({ id, name: draft.name, role: "freelancer", title: draft.specialities.join(", "), email: draft.email, color: palette[d.freelancers.length % palette.length], speciality: draft.specialities.join(", "), specialities: draft.specialities, availability: { mode: "hours", amount: 0 }, fees: draft.fee ? [{ ...draft.fee, id: uid("fee") }] : [], tools: defaultToolNames.map((name) => ({ id: uid("tool"), name, done: false, login: "", link: "", kept: "" })), trialDone: false, ndaDate: "", contractDate: "", platform: draft.platform, profileUrl: draft.profileUrl, driveUrl: draft.driveUrl ?? "", files: [], phone: "", notes: "", jobs: [], rate: "", currency: "USD", paymentMethod: "", capacity: 3, services: "", portfolio: "", status: "Directory", checklist: makeChecklist(freelancerChecklistTemplate, `fl-${id}`, 0) });
        });
        ping(`${draft.name} added to the directory`);
        return id;
      },
      deleteFreelancer: (id: string) => {
        update((d) => { d.freelancers = d.freelancers.filter((item) => item.id !== id); });
        ping("Removed from the directory");
      },
      updateFreelancerCheck: (freelancerId: string, itemId: string, patch: Partial<CheckItem>) =>
        update((d) => {
          const item = d.freelancers.find((f) => f.id === freelancerId)!.checklist.find((entry) => entry.id === itemId)!;
          if (patch.status && patch.status !== item.status) item.date = patch.status === "Not asked" ? "" : todayIso();
          Object.assign(item, patch);
        }),

      // Finance
      setInvoice: (clientId: string, status: "Not sent" | "Sent" | "Paid") =>
        update((d) => {
          const invoice = d.invoices.find((item) => item.clientId === clientId && item.month === d.month);
          if (invoice) { invoice.status = status; invoice.date = todayIso(); } else d.invoices.push({ clientId, month: d.month, status, date: todayIso() });
          const client = d.clients.find((c) => c.id === clientId)!;
          if (status === "Paid" && client.freelancerId) notify(d, "maria", `${client.name} paid. ${nameOf(d, client.freelancerId)} can now be paid.`, { view: "finance" });
        }),
      payFreelancer: (clientId: string, currency?: string, amount?: number) => update((d) => { d.payouts.push({ clientId, month: d.month, status: "Paid", date: todayIso(), amount, currency }); }),
      setFixedCosts: (costs: State["fixedCosts"]) => update((d) => { d.fixedCosts = costs; }),
      /** Edits the playbook in place: stages, slots and what is attached to them. */
      editPlaybook: (change: (playbook: State["playbook"]) => void) => update((d) => { change(d.playbook); }),
      updateSettings: (patch: Partial<State["settings"]>) => update((d) => { Object.assign(d.settings, patch); }),

      // Notifications
      readNotice: (id: string) => update((d) => { const notice = d.notices.find((item) => item.id === id); if (notice) notice.read = true; }),
      readAll: () => update((d) => { d.notices.forEach((notice) => { if (notice.to === d.me) notice.read = true; }); }),
    };
  }, [update, go, ping]);

  return { state, ready, route, go, toast, ping, wizard, openWizard: (leadId?: string) => setWizard({ open: true, leadId }), closeWizard: () => setWizard({ open: false }), postWizard, openPostWizard: (opts: { clientId?: string; ideaId?: string; assetId?: string; date?: string } = {}) => setPostWizard({ open: true, ...opts }), closePostWizard: () => setPostWizard({ open: false }), updateWizard, openUpdate: (clientId?: string) => setUpdateWizard({ open: true, clientId }), closeUpdate: () => setUpdateWizard({ open: false }), ...actions };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}

