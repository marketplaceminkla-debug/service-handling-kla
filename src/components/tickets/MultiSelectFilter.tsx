"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggleValue = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  const buttonText =
    selected.length === 0
      ? label
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? label)
        : `${selected.length} dipilih`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center justify-between gap-2 text-sm rounded-lg border px-3 py-2 min-w-[9.5rem] focus:outline-none focus:ring-2 focus:ring-brand",
          selected.length > 0
            ? "border-brand bg-yellow-50 dark:bg-yellow-900/20 text-gray-900 dark:text-gray-100"
            : "border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-700 dark:text-gray-100"
        )}
      >
        <span className="truncate">{buttonText}</span>
        <ChevronDown size={14} className="shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-60 max-h-72 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => onChange(options.map((o) => o.value))}
              className="text-xs font-medium text-brand hover:underline"
            >
              Pilih Semua
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:underline"
            >
              Reset
            </button>
          </div>
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggleValue(opt.value)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              {opt.label}
            </label>
          ))}
          {options.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
              Tidak ada pilihan.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
