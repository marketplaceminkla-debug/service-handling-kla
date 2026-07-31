"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  ChevronRight,
  MessageCircle,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  deleteFollowUp,
  listFollowUpHistory,
  ticketAgeDays,
  updateFollowUp,
} from "@/lib/tickets";
import { listBranches } from "@/lib/branches";
import { MultiSelectFilter } from "@/components/tickets/MultiSelectFilter";
import { ManualFollowUpForm } from "@/components/tickets/ManualFollowUpForm";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  type Branch,
  type FollowUpChannel,
  type FollowUpHistoryEntry,
  type TicketStatus,
} from "@/types";
import { cn, errorMessage, formatDate, formatRelative } from "@/lib/utils";

const CHANNEL_LABEL: Record<FollowUpChannel, string> = {
  cabang: "WA ke Cabang",
  brand: "WA ke Brand",
  auto: "Otomatis",
};

/** channel null = catatan yang diketik manual, bukan pesan yang dikirim.
 * Di filter, null diwakili kunci semu ini karena null tidak bisa jadi
 * nilai pilihan. */
const MANUAL_CHANNEL = "__manual__";
const MANUAL_LABEL = "Catatan manual";
const MANUAL_STYLE =
  "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300";

function channelLabel(channel: FollowUpChannel | null): string {
  return channel ? CHANNEL_LABEL[channel] : MANUAL_LABEL;
}

function channelStyle(channel: FollowUpChannel | null): string {
  return channel ? CHANNEL_STYLE[channel] : MANUAL_STYLE;
}

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
  const [showManualForm, setShowManualForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([listFollowUpHistory(), listBranches()])
      .then(([h, b]) => {
        setEntries(h);
        setBranches(b);
      })
      .catch((e) => setError(errorMessage(e, "Gagal memuat riwayat")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

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
        // Catatan manual disimpan dengan channel null.
        if (!channelFilter.includes(e.channel ?? MANUAL_CHANNEL)) return false;
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
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            History Follow Up
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Semua follow-up yang pernah dikirim, dikelompokkan per tiket. Klik
            kartunya buat lihat isi tiap pesan — atau catat manual jawaban yang
            masuk lewat telepon/WA pribadi.
          </p>
        </div>
        <button
          onClick={() => setShowManualForm(true)}
          className="flex items-center gap-2 shrink-0 bg-brand text-gray-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:brightness-95"
        >
          <Plus size={16} />
          Catat Manual
        </button>
      </div>

      {showManualForm && (
        <ManualFollowUpForm
          onClose={() => setShowManualForm(false)}
          onSaved={() => {
            setShowManualForm(false);
            load();
          }}
        />
      )}

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
          options={[
            ...(Object.keys(CHANNEL_LABEL) as FollowUpChannel[]).map((c) => ({
              value: c,
              label: CHANNEL_LABEL[c],
            })),
            { value: MANUAL_CHANNEL, label: MANUAL_LABEL },
          ]}
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
              onChanged={load}
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
  onChanged,
}: {
  group: TicketGroup;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const ticket = group.entries[0].ticket!;
  const chases = group.entries.length;
  const age = ticketAgeDays(ticket);
  const [addingNote, setAddingNote] = useState(false);

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
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4">
          <div className="space-y-3">
            {group.entries.map((e) => (
              <EntryRow key={e.id} entry={e} onChanged={onChanged} />
            ))}
          </div>

          <button
            onClick={() => setAddingNote(true)}
            className="flex items-center gap-1.5 mt-4 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <NotebookPen size={13} />
            Catat jawaban buat tiket ini
          </button>
        </div>
      )}

      {addingNote && (
        <ManualFollowUpForm
          presetTicket={ticket}
          onClose={() => setAddingNote(false)}
          onSaved={() => {
            setAddingNote(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function EntryRow({
  entry,
  onChanged,
}: {
  entry: FollowUpHistoryEntry;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(entry.note);
  const [when, setWhen] = useState(() => toLocalInputValue(entry.created_at));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!note.trim()) {
      setError("Keterangan tidak boleh kosong.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateFollowUp(entry.id, {
        note: note.trim(),
        created_at: when ? new Date(when).toISOString() : null,
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(errorMessage(err, "Gagal menyimpan perubahan"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Hapus catatan ini?")) return;
    setBusy(true);
    try {
      await deleteFollowUp(entry.id);
      onChanged();
    } catch (err) {
      setError(errorMessage(err, "Gagal menghapus catatan"));
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-3 group">
      <div className="shrink-0 pt-0.5">
        {entry.channel === "auto" ? (
          <Bot size={14} className="text-gray-400 dark:text-gray-500" />
        ) : entry.channel === null ? (
          <NotebookPen
            size={14}
            className="text-purple-600 dark:text-purple-400"
          />
        ) : (
          <MessageCircle size={14} className="text-brand" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span
            className={cn(
              "text-[11px] font-medium px-1.5 py-0.5 rounded",
              channelStyle(entry.channel)
            )}
          >
            {channelLabel(entry.channel)}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(entry.created_at)}
          </span>
          {entry.created_by_name && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              · {entry.created_by_name}
            </span>
          )}
          {!editing && (
            <span className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
              <button
                onClick={() => setEditing(true)}
                title="Edit catatan"
                className="p-1 rounded text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={remove}
                disabled={busy}
                title="Hapus catatan"
                className="p-1 rounded text-gray-400 hover:text-danger hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Trash2 size={13} />
              </button>
            </span>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="text-xs rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand dark:[color-scheme:dark]"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={busy}
                className="px-3 py-1.5 text-xs font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95 disabled:opacity-60"
              >
                {busy ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setNote(entry.note);
                  setWhen(toLocalInputValue(entry.created_at));
                  setError(null);
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <pre className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 whitespace-pre-wrap font-sans">
            {entry.note}
          </pre>
        )}

        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
    </div>
  );
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
