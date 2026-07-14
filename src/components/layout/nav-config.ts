import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Ticket,
  Building2,
  Users,
  Tags,
  UploadCloud,
} from "lucide-react";
import type { Role } from "@/types";

export type PanelKey =
  | "dashboard"
  | "tickets"
  | "upload"
  | "master-cabang"
  | "master-brand"
  | "akun";

export interface NavItem {
  key: PanelKey;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "admin", "staff"],
  },
  {
    key: "tickets",
    label: "Tiket Servis",
    icon: Ticket,
    roles: ["super_admin", "admin", "staff"],
  },
  {
    key: "upload",
    label: "Upload Servis",
    icon: UploadCloud,
    roles: ["super_admin", "admin", "staff"],
  },
  {
    key: "master-cabang",
    label: "Master Cabang",
    icon: Building2,
    roles: ["super_admin"],
  },
  {
    key: "master-brand",
    label: "Master Brand",
    icon: Tags,
    roles: ["super_admin"],
  },
  {
    key: "akun",
    label: "Kelola Akun",
    icon: Users,
    roles: ["super_admin"],
  },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
