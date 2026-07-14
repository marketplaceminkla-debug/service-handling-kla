"use client";

import { POSISI_UNIT_OPTIONS } from "@/types";
import { cn } from "@/lib/utils";

export function PosisiUnitSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const isKnown = (POSISI_UNIT_OPTIONS as readonly string[]).includes(value);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand",
        className
      )}
    >
      <option value="">- Belum diisi -</option>
      {POSISI_UNIT_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
      {value && !isKnown && <option value={value}>{value}</option>}
    </select>
  );
}
