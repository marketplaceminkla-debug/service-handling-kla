"use client";

import { useState } from "react";
import { BranchesPanel } from "@/components/master/Branches";
import { BrandsPanel } from "@/components/master/Brands";
import { cn } from "@/lib/utils";

type Tab = "cabang" | "brand";

export function MasterDataPanel() {
  const [tab, setTab] = useState<Tab>("cabang");

  return (
    <div>
      <div className="inline-flex bg-gray-100 rounded-lg p-1 mb-6">
        {(
          [
            ["cabang", "Cabang"],
            ["brand", "Brand"],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition",
              tab === value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "cabang" ? <BranchesPanel /> : <BrandsPanel />}
    </div>
  );
}
