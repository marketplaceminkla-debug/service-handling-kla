"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, Wrench } from "lucide-react";
import {
  listDigestBatches,
  wibDateKey,
  type FollowUpBatch,
} from "@/lib/agingDigest";
import { cn, formatDateOnly } from "@/lib/utils";

const LEVEL_LABEL: Record<FollowUpBatch["level"], string> = {
  warn: "Perlu ditindak",
  escalate: "Lewat batas",
};

const LEVEL_STYLE: Record<FollowUpBatch["level"], string> = {
  warn: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  escalate: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};

export function AgingDigestPanel() {
  const [batches, setBatches] = useState<FollowUpBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listDigestBatches()
      .then(setBatches)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, FollowUpBatch[]>();
    batches.forEach((b) => {
      const key = wibDateKey(b.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    // Escalate ditaruh di atas dalam tiap hari — itu yang paling mendesak.
    map.forEach((items) =>
      items.sort((a, b) => {
        if (a.level !== b.level) return a.level === "escalate" ? -1 : 1;
        return (a.branch_name ?? "").localeCompare(b.branch_name ?? "");
      })
    );
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [batches]);

  const copy = async (batch: FollowUpBatch) => {
    await navigator.clipboard.writeText(batch.message);
    setCopiedId(batch.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (loading)
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500">Memuat digest...</p>
    );
  if (error) return <p className="text-sm text-danger">{error}</p>;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        Digest Harian
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Tiket yang mengendap, dirangkum otomatis tiap pagi. Tiket yang sudah
        masuk digest tidak muncul lagi selama beberapa hari, jadi daftar ini
        tetap ringkas.
      </p>

      {byDate.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Belum ada digest. Rangkuman pertama muncul setelah jadwal harian
          jalan — atau tidak ada sama sekali kalau memang tidak ada tiket yang
          mengendap.
        </p>
      ) : (
        <div className="space-y-8">
          {byDate.map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                {formatDateOnly(date)}
              </h3>
              <div className="space-y-3">
                {items.map((batch) => (
                  <div
                    key={batch.id}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {batch.level === "escalate" ? (
                          <AlertTriangle size={16} className="text-danger" />
                        ) : (
                          <Wrench size={16} className="text-brand" />
                        )}
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {batch.branch_name ?? "Lintas cabang"}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {batch.ticket_count} tiket
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-1 rounded",
                            LEVEL_STYLE[batch.level]
                          )}
                        >
                          {LEVEL_LABEL[batch.level]}
                        </span>
                        <button
                          onClick={() => copy(batch)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95"
                        >
                          {copiedId === batch.id ? (
                            <>
                              <Check size={13} />
                              Tersalin!
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              Salin
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {batch.error && (
                      <p className="text-xs text-danger mb-2">{batch.error}</p>
                    )}

                    <pre className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 whitespace-pre-wrap font-sans">
                      {batch.message}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
