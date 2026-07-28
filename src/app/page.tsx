"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { PendingScreen } from "@/components/auth/PendingScreen";
import { Sidebar } from "@/components/layout/Sidebar";
import { navForRole, type PanelKey } from "@/components/layout/nav-config";
import { Overview } from "@/components/dashboard/Overview";
import { TicketsPanel } from "@/components/tickets/TicketsPanel";
import { UploadExcel } from "@/components/tickets/UploadExcel";
import { FollowUpCabangPanel } from "@/components/tickets/FollowUpCabangPanel";
import { MasterDataPanel } from "@/components/master/MasterDataPanel";
import { KelolaAkun } from "@/components/layout/KelolaAkun";

export default function Home() {
  const { session, profile, loading } = useAuth();
  const [active, setActive] = useState<PanelKey>("dashboard");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-main-bg dark:bg-gray-950 text-gray-400 dark:text-gray-500 text-sm">
        Memuat...
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  if (!profile || !profile.is_active) return <PendingScreen />;

  const allowedKeys = navForRole(profile.role).map((i) => i.key);
  const panel = allowedKeys.includes(active) ? active : "dashboard";

  return (
    <div className="flex min-h-screen bg-main-bg dark:bg-gray-950">
      <Sidebar active={panel} onSelect={setActive} />
      <main className="flex-1 p-8">
        {panel === "dashboard" && <Overview />}
        {panel === "tickets" && <TicketsPanel />}
        {panel === "upload" && <UploadExcel />}
        {panel === "followup" && <FollowUpCabangPanel />}
        {panel === "master" && <MasterDataPanel />}
        {panel === "akun" && <KelolaAkun />}
      </main>
    </div>
  );
}
