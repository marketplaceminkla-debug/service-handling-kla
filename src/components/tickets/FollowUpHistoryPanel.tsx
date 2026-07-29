"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, MessageCircle } from "lucide-react";
import { listFollowUpHistory } from "@/lib/tickets";
import { listBranches } from "@/lib/branches";
import { MultiSelectFilter } from "@/components/tickets/MultiSelectFilter";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  type Branch,
  type FollowUpChannel,
  type FollowUpHistoryEntry,
} from "@/types";
import { cn, formatDate } from "@/lib/utils";

const CHANNEL_LABEL: Record<FollowUpChannel, string> = {
  cabang: "WA ke Cabang",
  brand: "WA ke Brand",
  auto: "Otomatis",
};

/** Kejaran otomatis sengaja diwarnai abu — ini pengingat internal, bukan
 * pesan yang benar-benar dikirim ke customer. */
const CHANNEL_STYLE: Record<FollowUpChannel, string> = {
  cabang: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  brand: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  auto: "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
};

interface Batch {
  key: string;
  created_at: string;
  created_by_name: string | null;
  branch_name: string;
  branch_id: string | null;
  channel: FollowUpChannel | null;
  note: string;
  entries: FollowUpHistoryEntry[];
}

/** Follow-up yang dikirim buat beberapa tiket sekaligus disimpan sebagai
 * satu baris per tiket dengan timestamp & catatan yang sama — dikelompokin
 * lagi di sini biar kebaca sebagai satu kali follow-up. */
function groupIntoBatches(entries: FollowUpHistoryEntry[]): Batch[] {
  const map = new Map<string, Batch>();
  entries.forEach((e) => {
    const branchId = e.ticket?.branch?.id ?? null;
    const key = `${e.created_at}|${branchId ?? "-"}|${e.channel ?? "-"}|${e.note}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        created_at: e.created_at,
        created_by_name: e.created_by_name,
        branch_name: e.ticket?.branch?.name ?? "-",
        branch_id: branchId,
        channel: e.channel,
        note: e.note,
        entries: [],
      });
    }
    map.get(key)!.entries.push(e);
  });
  return Array.from(map.values()).sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1
  );
}

export function FollowUpHistoryPanel() {
  const [entries, setEntries] = useState<FollowUpHistoryEntry[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [channelFilter, setChannelFilter] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([listFollowUpHistory(), listBranches()])
      .then(([h, b]) => {
        setEntries(h);
        setBranches(b);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const batches = useMemo(() => {
    // Filter status dinilai per tiket: satu batch ikut tampil selama masih
    // ada tiket di dalamnya yang statusnya cocok.
    const filteredEntries = entries.filter((e) => {
      if (
        statusFilter.length > 0 &&
        (!e.ticket || !statusFilter.includes(e.ticket.status))
      )
        return false;
      if (channelFilter.length > 0) {
        if (!e.channel || !channelFilter.includes(e.channel)) return false;
      }
      return true;
    });

    const all = groupIntoBatches(filteredEntries);
    if (branchFilter.length === 0) return all;
    return all.filter((b) => b.branch_id && branchFilter.includes(b.branch_id));
  }, [entries, branchFilter, statusFilter, channelFilter]);

  if (loading)
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500">
        Memuat riwayat...
      </p>
    );
  if (error) return <p className="text-sm text-danger">{error}</p>;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        History Follow Up
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Riwayat follow-up yang sudah dikirim — otomatis tercatat tiap kali
        kamu klik Salin Teks atau Send WA di popup follow up.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <MultiSelectFilter
          label="Semua Cabang"
          options={branches.map((b) => ({ value: b.id, label: b.name }))}
          selected={branchFilter}
          onChange={setBranchFilter}
        />
        <MultiSelectFilter
          label="Semua Status"
          options={STATUS_ORDER.map((s) => ({
            value: s,
            label: STATUS_LABEL[s],
          }))}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
        <MultiSelectFilter
          label="Semua Kanal"
          options={(
            Object.keys(CHANNEL_LABEL) as FollowUpChannel[]
          ).map((c) => ({ value: c, label: CHANNEL_LABEL[c] }))}
          selected={channelFilter}
          onChange={setChannelFilter}
        />
      </div>

      {batches.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Belum ada riwayat follow-up.
        </p>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <div
              key={batch.key}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  {batch.channel === "auto" ? (
                    <Bot size={16} className="text-gray-400 dark:text-gray-500" />
                  ) : (
                    <MessageCircle size={16} className="text-brand" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {batch.branch_name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {batch.entries.length} tiket
                      {batch.created_by_name ? ` · ${batch.created_by_name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  {batch.channel && (
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded",
                        CHANNEL_STYLE[batch.channel]
                      )}
                    >
                      {CHANNEL_LABEL[batch.channel]}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(batch.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {batch.entries.map((e) => (
                  <span
                    key={e.id}
                    className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded"
                  >
                    {e.ticket?.no_service ?? "-"}
                  </span>
                ))}
              </div>

              <pre className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 whitespace-pre-wrap font-sans">
                {batch.note}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
