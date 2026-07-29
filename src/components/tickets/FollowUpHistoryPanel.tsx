"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, ChevronRight, MessageCircle, Search } from "lucide-react";
import { listFollowUpHistory, ticketAgeDays } from "@/lib/tickets";
import { listBranches } from "@/lib/branches";
import { MultiSelectFilter } from "@/components/tickets/MultiSelectFilter";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  type Branch,
  type FollowUpChannel,
  type FollowUpHistoryEntry,
  type TicketStatus,
} from "@/types";
import { cn, formatDate, formatRelative } from "@/lib/utils";

const CHANNEL_LABEL: Record<FollowUpChannel, string> = {
  cabang: "WA ke Cabang",
  brand: "WA ke Brand",
  auto: "Otomatis",
};

/** Kejaran otomatis sengaja diwarnai abu — ini pengingat internal, bukan
 * pesan yang benar-benar dikirim ke cabang. */
const CHANNEL_STYLE: Record<FollowUpChannel, string> = {
  cabang: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  brand: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  auto: "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
};

const STATUS_STYLE: Record<string, string> = {
  baru: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  dalam_pengerjaan:
    "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  menunggu_part:
    "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  siap_diambil: "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
  selesai: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
};

const RANGES = [
  { key: "today", label: "Hari ini", days: 0 },
  { key: "7", label: "7 hari", days: 7 },
  { key: "30", label: "30 hari", days: 30 },
  { key: "all", label: "Semua", days: Infinity },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

/** Sudah dikejar sebanyak ini dianggap "berulang tapi belum beres" —
 * ditandai supaya gampang kelihatan tanpa menghitung manual. */
const REPEAT_CHASE_THRESHOLD = 3;

interface TicketGroup {
  ticketId: string;
  entries: FollowUpHistoryEntry[];
  lastAt: string;
}

function startOfRange(range: RangeKey): number {
  if (range === "all") return 0;
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  const days = range === "7" ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export function FollowUpHistoryPanel() {
  const [entries, setEntries] = useState<FollowUpHistoryEntry[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [range, setRange] = useState<RangeKey>("7");
  const [branchFilter, setBranchFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [channelFilter, setChannelFilter] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const since = startOfRange(range);
    return entries.filter((e) => {
      if (new Date(e.created_at).getTime() < since) return false;
      if (!e.ticket) return false;
      if (
        branchFilter.length > 0 &&
        (!e.ticket.branch || !branchFilter.includes(e.ticket.branch.id))
      )
        return false;
      if (statusFilter.length > 0 && !statusFilter.includes(e.ticket.status))
        return false;
      if (channelFilter.length > 0) {
        if (!e.channel || !channelFilter.includes(e.channel)) return false;
      }
      if (
        q &&
        !`${e.ticket.no_service} ${e.ticket.kode_barang} ${e.ticket.serial_number} ${e.note}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [entries, search, range, branchFilter, statusFilter, channelFilter]);

  const groups = useMemo<TicketGroup[]>(() => {
    const map = new Map<string, FollowUpHistoryEntry[]>();
    filtered.forEach((e) => {
      const id = e.ticket!.id;
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(e);
    });
    return Array.from(map.entries())
      .map(([ticketId, items]) => {
        const sorted = [...items].sort((a, b) =>
          a.created_at < b.created_at ? 1 : -1
        );
        return { ticketId, entries: sorted, lastAt: sorted[0].created_at };
      })
      .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  }, [filtered]);

  const stats = useMemo(() => {
    const startToday = startOfRange("today");
    return {
      today: entries.filter(
        (e) => new Date(e.created_at).getTime() >= startToday
      ).length,
      tickets: groups.length,
      repeat: groups.filter((g) => g.entries.length >= REPEAT_CHASE_THRESHOLD)
        .length,
    };
  }, [entries, groups]);

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
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Semua follow-up yang pernah dikirim, dikelompokkan per tiket. Klik
        kartunya buat lihat isi tiap pesan.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatTile label="Follow-up hari ini" value={stats.today} />
        <StatTile label="Tiket tersentuh" value={stats.tickets} />
        <StatTile
          label={`Dikejar ${REPEAT_CHASE_THRESHOLD}× atau lebih`}
          value={stats.repeat}
          highlight={stats.repeat > 0}
        />
      </div>

      <div className="flex flex-wrap gap-3 mb-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. service, unit, atau isi pesan..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
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
          options={(Object.keys(CHANNEL_LABEL) as FollowUpChannel[]).map(
            (c) => ({ value: c, label: CHANNEL_LABEL[c] })
          )}
          selected={channelFilter}
          onChange={setChannelFilter}
        />
      </div>

      <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-5">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition",
              range === r.key
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        {filtered.length} follow-up · {groups.length} tiket
      </p>

      {groups.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Tidak ada follow-up pada rentang ini.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <TicketCard
              key={group.ticketId}
              group={group}
              expanded={expandedId === group.ticketId}
              onToggle={() =>
                setExpandedId(
                  expandedId === group.ticketId ? null : group.ticketId
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4">
      <p
        className={cn(
          "text-2xl font-bold",
          highlight ? "text-danger" : "text-gray-900 dark:text-gray-100"
        )}
      >
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">
        {label}
      </p>
    </div>
  );
}

function TicketCard({
  group,
  expanded,
  onToggle,
}: {
  group: TicketGroup;
  expanded: boolean;
  onToggle: () => void;
}) {
  const ticket = group.entries[0].ticket!;
  const chases = group.entries.length;
  const age = ticketAgeDays(ticket);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
      >
        <div
          className={cn(
            "flex flex-col items-center justify-center w-12 h-12 rounded-lg shrink-0",
            chases >= REPEAT_CHASE_THRESHOLD
              ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
          )}
        >
          <span className="text-lg font-bold leading-none">{chases}</span>
          <span className="text-[10px] uppercase tracking-wide">kejar</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {ticket.no_service}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {ticket.kode_barang} · {ticket.serial_number}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {ticket.branch && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                {ticket.branch.name}
              </span>
            )}
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded",
                STATUS_STYLE[ticket.status as TicketStatus]
              )}
            >
              {STATUS_LABEL[ticket.status as TicketStatus]}
            </span>
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">
              {age} hari di servis
            </span>
            {ticket.reported_by_name && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {ticket.reported_by_name}
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {formatRelative(group.lastAt)}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
            FU terakhir
          </p>
        </div>

        <ChevronRight
          size={18}
          className={cn(
            "text-gray-400 dark:text-gray-500 shrink-0 transition-transform",
            expanded && "rotate-90"
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 space-y-3">
          {group.entries.map((e) => (
            <div key={e.id} className="flex gap-3">
              <div className="shrink-0 pt-0.5">
                {e.channel === "auto" ? (
                  <Bot size={14} className="text-gray-400 dark:text-gray-500" />
                ) : (
                  <MessageCircle size={14} className="text-brand" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {e.channel && (
                    <span
                      className={cn(
                        "text-[11px] font-medium px-1.5 py-0.5 rounded",
                        CHANNEL_STYLE[e.channel]
                      )}
                    >
                      {CHANNEL_LABEL[e.channel]}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(e.created_at)}
                  </span>
                  {e.created_by_name && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      · {e.created_by_name}
                    </span>
                  )}
                </div>
                <pre className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 whitespace-pre-wrap font-sans">
                  {e.note}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
