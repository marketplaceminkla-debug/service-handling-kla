"use client";

import { useState } from "react";
import { BranchesPanel } from "@/components/master/Branches";
import { BrandsPanel } from "@/components/master/Brands";
import { ProductCatalogPanel } from "@/components/master/ProductCatalog";
import { cn } from "@/lib/utils";

type Tab = "cabang" | "brand" | "merk";

export function MasterDataPanel() {
  const [tab, setTab] = useState<Tab>("cabang");

  return (
    <div>
      <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6">
        {(
          [
            ["cabang", "Cabang"],
            ["brand", "Brand"],
            ["merk", "Database Merk"],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition",
              tab === value
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "cabang" && <BranchesPanel />}
      {tab === "brand" && <BrandsPanel />}
      {tab === "merk" && <ProductCatalogPanel />}
    </div>
  );
}
