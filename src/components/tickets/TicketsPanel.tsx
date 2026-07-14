"use client";

import { useState } from "react";
import { TicketList } from "@/components/tickets/TicketList";
import { NewTicketForm } from "@/components/tickets/NewTicketForm";
import { TicketDetail } from "@/components/tickets/TicketDetail";

type View = { mode: "list" } | { mode: "new" } | { mode: "detail"; id: string };

export function TicketsPanel() {
  const [view, setView] = useState<View>({ mode: "list" });
  const [refreshKey, setRefreshKey] = useState(0);

  if (view.mode === "new") {
    return (
      <NewTicketForm
        onCancel={() => setView({ mode: "list" })}
        onCreated={() => {
          setRefreshKey((k) => k + 1);
          setView({ mode: "list" });
        }}
      />
    );
  }

  if (view.mode === "detail") {
    return (
      <TicketDetail
        ticketId={view.id}
        onBack={() => {
          setRefreshKey((k) => k + 1);
          setView({ mode: "list" });
        }}
      />
    );
  }

  return (
    <TicketList
      key={refreshKey}
      onNew={() => setView({ mode: "new" })}
      onSelect={(id) => setView({ mode: "detail", id })}
    />
  );
}
