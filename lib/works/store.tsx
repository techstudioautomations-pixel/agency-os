"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { clientChecklistTemplate, makeChecklist, seedState } from "./seed";
import { canBeAssigned, nameOf, reviewerFor, todayIso } from "./logic";
import type { CheckItem, Client, Idea, Lead, MonthReport, Notice, Post, ReportNumbers, RevisionCategory, Route, State } from "./types";

const KEY = "theworks-os-v1";
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const stamp = () => new Date().toISOString();

// ─── Hash routing, so the back button works ───
export function routeToHash(route: Route) {
  const parts: string[] = [route.view];
  if (route.view === "client") parts.push(route.clientId, route.tab ?? "", route.sub ?? "", route.postId ?? "");
  if (route.view === "leads" && route.leadId) parts.push(route.leadId);
  if (route.view === "freelancers" && route.freelancerId) parts.push(route.freelancerId);
  return `#/${parts.join("/").replace(/\/+$/, "")}`;
}
export function hashToRoute(hash: string): Route {
  const [view, a, b, c, d] = hash.replace(/^#\/?/, "").split("/");
  switch (view) {
    case "client":
      return a ? { view, clientId: a, tab: b || undefined, sub: c || undefined, postId: d || undefined } : { view: "clients" };
    case "leads":
      return { view, leadId: a || undefined };
    case "freelancers":
      return { view, freelancerId: a || undefined };
    case "clients":
    case "content":
    case "reports":
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
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load once on the client.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as State;
        if (parsed.version === 1) setState(parsed);
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
        const clean: State = { ...state, posts: state.posts.map((post) => ({ ...post, files: post.files.filter((file) => !file.src.startsWith("blob:")) })) };
        window.localStorage.setItem(KEY, JSON.stringify(clean));
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
    const postRoute = (post: Post): Route => ({ view: "client", clientId: post.clientId, tab: "marketing", sub: "content", postId: post.id });

    return {
      setMe: (id: string) => update((d) => { d.me = id; }),
      setMonth: (month: string) => update((d) => { d.month = month; }),
      reset: () => { window.localStorage.removeItem(KEY); setState(seedState()); go({ view: "today" }); ping("Sample data restored"); },

      // Clients
      addClient: (name: string) => {
        let id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || uid("client");
        if (stateRef.current.clients.some((client) => client.id === id)) id = `${id}-${Date.now().toString(36)}`;
        update((d) => {
          const checklist = makeChecklist(clientChecklistTemplate, id, 0);
          checklist.forEach((item) => { if (item.label === "Client profile created") { item.status = "Received"; item.date = todayIso(); } });
          d.clients.push({
            id, name, color: "#5A6B7D", sector: "Construction", package: "Essential", addOns: [], stage: "Onboarding", approvalMode: d.settings.defaultApprovalMode,
            mainContact: { name: "", email: "", phone: "" }, approver: { name: "", email: "" }, billingContact: "", channel: "Email", expertReviewer: "", ownerId: "maria", opsId: "niamh",
            freelancerFee: 0, fee: 0, addOnFee: 0, agreedPosts: 8, platforms: ["LinkedIn"], startDate: todayIso(), links: { drive: "", canva: "", publer: "", chat: "", brandKit: "" }, checklist,
            strategy: { offer: "", services: "", personas: [], pillars: [], tone: "", avoid: "", claims: "", approved: false }, hours: {}, planApproval: {},
          });
          notify(d, "niamh", `New client to set up: ${name}`, { view: "client", clientId: id, tab: "checklist" });
        });
        ping(`${name} created with the onboarding checklist`);
        return id;
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
      assignFreelancer: (clientId: string, freelancerId: string) => {
        const candidate = stateRef.current.freelancers.find((item) => item.id === freelancerId);
        const blocked = Boolean(freelancerId && candidate && !canBeAssigned(candidate));
        if (!blocked) update((d) => {
          const client = d.clients.find((item) => item.id === clientId)!;
          client.freelancerId = freelancerId || undefined;
          const item = client.checklist.find((entry) => entry.label === "Freelancer assigned");
          if (item) { item.status = freelancerId ? "Received" : "Not asked"; item.date = freelancerId ? todayIso() : ""; }
          if (freelancerId) notify(d, freelancerId, `You have been assigned to ${client.name}`, { view: "client", clientId, tab: "marketing" });
        });
        ping(blocked ? "Blocked: NDA and contract must be signed first" : freelancerId ? "Freelancer assigned and notified" : "Freelancer removed");
      },

      // Ideas
      addIdeas: (clientId: string, items: Pick<Idea, "title" | "notes" | "format">[], source: string) => {
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          d.ideas.unshift(...items.map((item) => ({ ...item, id: uid("idea"), clientId, decision: "New" as const, comment: "", createdBy: d.me, createdAt: todayIso(), source })));
          notify(d, reviewerFor(d, client), `${items.length} new idea${items.length === 1 ? "" : "s"} for ${client.name} to decide`, { view: "client", clientId, tab: "marketing", sub: "ideas" }, ["In app", "Email", "Slack"]);
        });
        ping(`${items.length} idea card${items.length === 1 ? "" : "s"} added`);
      },
      updateIdea: (id: string, patch: Partial<Idea>) => update((d) => { Object.assign(d.ideas.find((item) => item.id === id)!, patch); }),
      ideaToPost: (ideaId: string) => {
        update((d) => {
          const idea = d.ideas.find((item) => item.id === ideaId)!;
          const client = d.clients.find((item) => item.id === idea.clientId)!;
          const post: Post = {
            id: uid("post"), clientId: client.id, ideaId, title: idea.title, format: idea.format, pillarId: idea.pillarId, platforms: [client.platforms[0] ?? "LinkedIn"],
            date: `${d.month}-${String(d.settings.dates.schedule).padStart(2, "0")}`, status: "Copy in progress", copy: "", captions: {}, files: [], art: idea.title, designLink: "", driveLink: "",
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
      addPost: (clientId: string, title: string) => {
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          d.posts.push({ id: uid("post"), clientId, title, format: "Single image", platforms: [client.platforms[0] ?? "LinkedIn"], date: `${d.month}-${String(d.settings.dates.schedule).padStart(2, "0")}`, status: "Copy in progress", copy: "", captions: {}, files: [], art: title, designLink: "", driveLink: "", version: 1, comments: [], history: [{ at: stamp(), by: d.me, text: "Post created" }], needsExpert: false, expertOk: false, waitingSince: todayIso() });
        });
        ping("Post added");
      },
      updatePost: (id: string, patch: Partial<Post>) => update((d) => { Object.assign(d.posts.find((item) => item.id === id)!, patch); }),
      submitPost: (id: string) => {
        update((d) => {
          const { post, client } = withPost(d, id);
          const stage = post.status.startsWith("Copy") ? "copy" : "design";
          post.status = stage === "copy" ? "Copy review" : "Design review";
          post.waitingSince = todayIso();
          if (post.comments.some((comment) => comment.kind === "change")) post.version += 1;
          log(d, post, `Submitted ${stage} for review (v${post.version})`);
          notify(d, reviewerFor(d, client), `${client.name}: ${stage} ready to review · ${post.title}`, postRoute(post), ["In app", "Email", "Slack"]);
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
          const mentioned = [...d.people, ...d.freelancers].filter((person) => body.includes(`@${person.name.split(" ")[0]}`)).map((person) => person.id);
          const recipients = new Set([...mentioned, d.me === client.freelancerId ? reviewerFor(d, client) : client.freelancerId ?? ""]);
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
      saveNumbers: (clientId: string, month: string, numbers: ReportNumbers) => {
        update((d) => {
          const client = d.clients.find((c) => c.id === clientId)!;
          let report = d.reports.find((item) => item.clientId === clientId && item.month === month);
          if (!report) { report = { id: `${clientId}-${month}`, clientId, month, checked: false, summary: "", recommendations: "", approved: false, sentAt: "", reportLink: "" }; d.reports.push(report); }
          report.numbers = numbers;
          report.numbersBy = d.me;
          report.numbersAt = todayIso();
          notify(d, client.opsId, `${client.name}: month-end numbers are in`, { view: "client", clientId, tab: "reporting" });
        });
        ping("Numbers saved. Operations has been notified.");
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
      winLead: (id: string) => {
        const company = stateRef.current.leads.find((item) => item.id === id)!.company;
        let clientId = company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || uid("client");
        if (stateRef.current.clients.some((client) => client.id === clientId)) clientId = `${clientId}-${Date.now().toString(36)}`;
        update((d) => {
          const lead = d.leads.find((item) => item.id === id)!;
          const checklist = makeChecklist(clientChecklistTemplate, clientId, 0);
          checklist.forEach((item) => {
            if (item.label.startsWith("Package") && lead.package !== "Not sure") { item.status = "Received"; item.date = todayIso(); item.note = lead.package; }
            if (item.label === "Client profile created") { item.status = "Received"; item.date = todayIso(); }
          });
          d.clients.push({
            id: clientId, name: lead.company, color: "#5A6B7D", sector: lead.sector || "Construction", package: lead.package === "Growth" ? "Growth" : "Essential", addOns: [], stage: "Onboarding",
            approvalMode: d.settings.defaultApprovalMode, mainContact: { name: lead.contact, email: lead.email, phone: "" }, approver: { name: "", email: "" }, billingContact: "", channel: "Email", expertReviewer: "",
            ownerId: "maria", opsId: "niamh", freelancerFee: 0, fee: lead.value, addOnFee: 0, agreedPosts: lead.package === "Growth" ? 12 : 8, platforms: ["LinkedIn"], startDate: todayIso(),
            links: { drive: "", canva: "", publer: "", chat: "", brandKit: "" }, checklist,
            strategy: { offer: "", services: "", personas: [], pillars: [], tone: "", avoid: "", claims: "", approved: false }, hours: {}, planApproval: {},
          });
          d.invoices.push({ clientId, month: d.month, status: "Not sent", date: "" });
          lead.stage = "Won";
          lead.clientId = clientId;
          notify(d, "maria", `${lead.company} is won. Over to you for onboarding.`, { view: "client", clientId, tab: "checklist" });
          notify(d, "niamh", `New client to set up: ${lead.company}`, { view: "client", clientId, tab: "checklist" });
        });
        ping("Client created. María and operations have been notified.");
        return clientId;
      },

      // Freelancers
      updateFreelancer: (id: string, patch: Partial<State["freelancers"][number]>) => update((d) => { Object.assign(d.freelancers.find((item) => item.id === id)!, patch); }),
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
      payFreelancer: (clientId: string) => update((d) => { d.payouts.push({ clientId, month: d.month, status: "Paid", date: todayIso() }); }),
      setFixedCosts: (costs: State["fixedCosts"]) => update((d) => { d.fixedCosts = costs; }),
      updateSettings: (patch: Partial<State["settings"]>) => update((d) => { Object.assign(d.settings, patch); }),

      // Notifications
      readNotice: (id: string) => update((d) => { const notice = d.notices.find((item) => item.id === id); if (notice) notice.read = true; }),
      readAll: () => update((d) => { d.notices.forEach((notice) => { if (notice.to === d.me) notice.read = true; }); }),
    };
  }, [update, go, ping]);

  return { state, ready, route, go, toast, ping, ...actions };
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

