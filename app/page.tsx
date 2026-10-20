"use client";

import { StoreProvider, useStore } from "@/lib/works/store";
import { Today } from "@/components/works/Today";
import { ClientProfile, ClientsList } from "@/components/works/Clients";
import { MarketingPage } from "@/components/works/Marketing";
import { ReportsPage } from "@/components/works/Reports";
import { Leads } from "@/components/works/Leads";
import { Freelancers } from "@/components/works/Freelancers";
import { Finance } from "@/components/works/Finance";
import { How } from "@/components/works/How";
import { Settings } from "@/components/works/Settings";
import { ShareView } from "@/components/works/ShareView";
import { NewClientWizard } from "@/components/works/NewClient";
import { NewPostWizard } from "@/components/works/NewPost";

function Screen() {
  const { ready, route } = useStore();
  if (!ready) return <div className="grid min-h-screen place-items-center bg-[#F6F5F2] text-[14px] text-[#6B6760]">Loading…</div>;
  switch (route.view) {
    case "clients":
      return <ClientsList />;
    case "client":
      return <ClientProfile clientId={route.clientId} tab={route.tab} sub={route.sub} />;
    case "marketing":
      return <MarketingPage clientId={route.clientId} tab={route.tab} postId={route.postId} filter={route.filter} />;
    case "reports":
      return <ReportsPage />;
    case "leads":
      return <Leads leadId={route.leadId} />;
    case "freelancers":
      return <Freelancers freelancerId={route.freelancerId} />;
    case "finance":
      return <Finance />;
    case "how":
      return <How />;
    case "settings":
      return <Settings tab={route.tab} />;
    case "view":
      return <ShareView token={route.token} />;
    default:
      return <Today />;
  }
}

export default function Page() {
  return (
    <StoreProvider>
      <Screen />
      <NewClientWizard />
      <NewPostWizard />
    </StoreProvider>
  );
}
