"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { listTickets, buildPosisiUnitDraftMessage } from "@/lib/tickets";
import { STATUS_LABEL, type TicketWithBranch } from "@/types";
import { cn } from "@/lib/utils";

export function FollowUpCabangPanel() {
  const [tickets, setTickets] = useState<TicketWithBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedBranchId, setCopiedBranchId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listTickets()
      .then((t) => setTickets(t.filter((x) => x.status !== "selesai")))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, TicketWithBranch[]>();
    tickets.forEach((t) => {
      const key = t.branch_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.values())
      .filter((items) => items[0]?.branch)
      .sort((a, b) => (a[0].branch?.name ?? "").localeCompare(b[0].branch?.name ?? ""));
  }, [tickets]);

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyDraft = async (branchName: string, items: TicketWithBranch[]) => {
    const selected = items.filter((t) => selectedIds.has(t.id));
    const message = buildPosisiUnitDraftMessage(branchName, selected);
    await navigator.clipboard.writeText(message);
    setCopiedBranchId(items[0].branch_id);
    setTimeout(() => setCopiedBranchId(null), 2000);
  };

  if (loading)
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500">Memuat tiket...</p>
    );
  if (error) return <p className="text-sm text-danger">{error}</p>;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        Follow Up Cabang
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Centang tiket yang mau ditanyain posisi unitnya, lalu salin draft
        teksnya buat dikirim manual ke cabang (WA, email, dll) — gak langsung
        buka WhatsApp.
      </p>

      {groups.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Gak ada tiket yang masih terbuka.
        </p>
      )}

      <div className="space-y-4">
        {groups.map((items) => {
          const branch = items[0].branch!;
          const selectedInBranch = items.filter((t) => selectedIds.has(t.id));
          return (
            <div
              key={branch.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {branch.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {items.length} tiket terbuka · {selectedInBranch.length} dipilih
                  </p>
                </div>
                <button
                  onClick={() => copyDraft(branch.name, items)}
                  disabled={selectedInBranch.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95 disabled:opacity-40"
                >
                  {copiedBranchId === branch.id ? (
                    <>
                      <Check size={15} />
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy size={15} />
                      Copy Draft
                    </>
                  )}
                </button>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700/60">
                {items.map((t) => (
                  <label
                    key={t.id}
                    className={cn(
                      "flex items-center gap-3 px-5 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40",
                      selectedIds.has(t.id) && "bg-yellow-50/60 dark:bg-yellow-900/10"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleOne(t.id)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {t.no_service}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {t.kode_barang} · {t.serial_number}
                    </span>
                    <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                      {STATUS_LABEL[t.status]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
