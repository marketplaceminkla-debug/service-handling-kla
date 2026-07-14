export type Role = "super_admin" | "admin" | "staff";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  branch_scope: string[];
  is_active: boolean;
  created_at: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  wa_number: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  wa_number: string | null;
  is_active: boolean;
  created_at: string;
}

export type TicketKategori = "stok" | "user";
export type TicketStatus = "baru" | "diproses" | "tunggu_sparepart" | "selesai";
export type FollowUpChannel = "cabang" | "brand";

export interface ServiceTicket {
  id: string;
  no_service: string;
  branch_id: string;
  brand_id: string | null;
  kategori: TicketKategori;
  kode_barang: string;
  serial_number: string;
  status: TicketStatus;
  estimasi: string | null;
  posisi_unit: string | null;
  keterangan: string | null;
  reported_by: string | null;
  reported_by_name: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface TicketWithBranch extends ServiceTicket {
  branch: Pick<Branch, "id" | "name" | "code" | "wa_number"> | null;
  brand: Pick<Brand, "id" | "name" | "wa_number"> | null;
}

export interface TicketUpdate {
  id: string;
  ticket_id: string;
  note: string;
  status_from: string | null;
  status_to: string | null;
  channel: FollowUpChannel | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export const STATUS_LABEL: Record<TicketStatus, string> = {
  baru: "Baru",
  diproses: "Diproses",
  tunggu_sparepart: "Tunggu Sparepart",
  selesai: "Selesai",
};

export const KATEGORI_LABEL: Record<TicketKategori, string> = {
  stok: "Stok",
  user: "User",
};
