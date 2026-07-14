"use client";

import { LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { navForRole, type PanelKey } from "@/components/layout/nav-config";
import { LogoWordmark } from "@/components/layout/Logo";

export function Sidebar({
  active,
  onSelect,
}: {
  active: PanelKey;
  onSelect: (key: PanelKey) => void;
}) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  if (!profile) return null;

  const items = navForRole(profile.role);

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-primary flex flex-col">
      <div className="px-5 py-5 border-b border-white/10">
        <LogoWordmark />
        <p className="text-xs text-purple-200/70 mt-3">
          {profile.full_name || profile.email}
        </p>
        <span className="inline-block mt-1 text-[11px] font-medium uppercase tracking-wide text-primary bg-brand px-2 py-0.5 rounded">
          {profile.role.replace("_", " ")}
        </span>
      </div>

      <nav className="flex-1 py-3">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={cn(
                "w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-white/10 text-brand border-r-2 border-brand"
                  : "text-purple-100/80 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <button
        onClick={toggleTheme}
        className="flex items-center gap-3 px-5 py-4 text-sm font-medium text-purple-100/80 border-t border-white/10 hover:bg-white/5 hover:text-white"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
      </button>

      <button
        onClick={() => signOut()}
        className="flex items-center gap-3 px-5 py-4 text-sm font-medium text-purple-200/70 border-t border-white/10 hover:text-danger"
      >
        <LogOut size={18} />
        Keluar
      </button>
    </aside>
  );
}
