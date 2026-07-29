import type { TicketStatus } from "@/types";

export type AgingLevel = "warn" | "escalate";

export interface AgingTicket {
  id: string;
  ticket_no: string;
  device: string;
  serial_number: string;
  branch: string;
  status: TicketStatus;
  days_since_intake: number;
  days_in_status: number;
  /** Isi kolom `estimasi` apa adanya — di sistem ini bentuknya teks bebas
   * ("minggu depan", "30/7"), bukan tanggal, jadi tidak diformat ulang. */
  part_eta: string | null;
  pic: string | null;
}

export interface AgingStatusGroup {
  status: TicketStatus;
  label: string;
  tickets: AgingTicket[];
}

export interface AgingGroup {
  batch_key: string;
  branch: string | null;
  branch_id: string | null;
  telegram_chat_id: string | null;
  ticket_count: number;
  ticket_ids: string[];
  by_status: AgingStatusGroup[];
}

export interface AgingScanResponse {
  generated_at: string;
  level: AgingLevel;
  groups: AgingGroup[];
}
