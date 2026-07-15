import { supabase } from "@/lib/supabase";
import type {
  FollowUpChannel,
  ServiceTicket,
  TicketStatus,
  TicketUpdate,
  TicketWithBranch,
} from "@/types";

const STUCK_THRESHOLD_DAYS = 3;
export const URGENT_AGE_DAYS = 30;
export const WARNING_AGE_DAYS = 20;
const TICKET_SELECT =
  "*, branch:branches(id, name, code, wa_number), brand:brands(id, name, wa_number)";

export function ticketAgeDays(ticket: Pick<ServiceTicket, "created_at">) {
  const ms = Date.now() - new Date(ticket.created_at).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function isStuck(
  ticket: Pick<ServiceTicket, "status" | "updated_at">
) {
  if (ticket.status === "selesai") return false;
  const ms = Date.now() - new Date(ticket.updated_at).getTime();
  return ms / (1000 * 60 * 60 * 24) > STUCK_THRESHOLD_DAYS;
}

export type AgeLevel = "urgent" | "warning" | "normal";

/** Lama-di-service urgency tier. Tickets already selesai have no tier. */
export function ageLevel(
  ticket: Pick<ServiceTicket, "status" | "created_at">
): AgeLevel | null {
  if (ticket.status === "selesai") return null;
  const days = ticketAgeDays(ticket);
  if (days >= URGENT_AGE_DAYS) return "urgent";
  if (days >= WARNING_AGE_DAYS) return "warning";
  return "normal";
}

export function waLink(rawNumber: string, message: string) {
  const digits = rawNumber.replace(/[^0-9]/g, "");
  const withCountryCode = digits.startsWith("0")
    ? `62${digits.slice(1)}`
    : digits;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}

export function buildFollowUpMessage(
  targetName: string,
  items: Pick<ServiceTicket, "no_service" | "kode_barang" | "serial_number">[],
  note: string
) {
  const list = items
    .map(
      (t, i) => `${i + 1}. ${t.no_service}\n${t.kode_barang}\n${t.serial_number}`
    )
    .join("\n");

  let message = `Halo Tim ${targetName}, mohon dibantu cek untuk unit service berikut\n\n${list}`;
  if (note.trim()) message += `\n\n${note.trim()}`;
  return message;
}

export async function listTickets(): Promise<TicketWithBranch[]> {
  const { data, error } = await supabase
    .from("service_tickets")
    .select(TICKET_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as TicketWithBranch[];
}

export async function getTicket(id: string): Promise<TicketWithBranch> {
  const { data, error } = await supabase
    .from("service_tickets")
    .select(TICKET_SELECT)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as TicketWithBranch;
}

export async function createTicket(input: {
  no_service: string;
  branch_id: string;
  brand_id?: string | null;
  kategori: "stok" | "user";
  kode_barang: string;
  serial_number: string;
  estimasi?: string | null;
  posisi_unit?: string | null;
  keterangan?: string | null;
  tanggal_masuk?: string | null;
  reported_by: string | null;
  reported_by_name: string | null;
}): Promise<ServiceTicket> {
  const { data, error } = await supabase
    .from("service_tickets")
    .insert({
      no_service: input.no_service,
      branch_id: input.branch_id,
      brand_id: input.brand_id || null,
      kategori: input.kategori,
      kode_barang: input.kode_barang,
      serial_number: input.serial_number,
      estimasi: input.estimasi || null,
      posisi_unit: input.posisi_unit || null,
      keterangan: input.keterangan || null,
      tanggal_masuk: input.tanggal_masuk || null,
      reported_by: input.reported_by,
      reported_by_name: input.reported_by_name,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ServiceTicket;
}

export async function updateTicket(
  id: string,
  patch: Partial<
    Pick<
      ServiceTicket,
      | "branch_id"
      | "brand_id"
      | "kategori"
      | "kode_barang"
      | "serial_number"
      | "status"
      | "estimasi"
      | "posisi_unit"
      | "keterangan"
      | "tanggal_masuk"
    >
  >
): Promise<ServiceTicket> {
  const { data, error } = await supabase
    .from("service_tickets")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as ServiceTicket;
}

export async function listTicketUpdates(
  ticketId: string
): Promise<TicketUpdate[]> {
  const { data, error } = await supabase
    .from("ticket_updates")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as TicketUpdate[];
}

export async function addFollowUp(input: {
  ticket_id: string;
  note: string;
  status_from: TicketStatus;
  status_to: TicketStatus;
  channel: FollowUpChannel | null;
  created_by: string | null;
  created_by_name: string | null;
}): Promise<void> {
  const { error: updateError } = await supabase.from("ticket_updates").insert({
    ticket_id: input.ticket_id,
    note: input.note,
    status_from: input.status_from,
    status_to: input.status_to,
    channel: input.channel,
    created_by: input.created_by,
    created_by_name: input.created_by_name,
  });
  if (updateError) throw updateError;

  const patch: Partial<ServiceTicket> = {
    status: input.status_to,
    updated_at: new Date().toISOString(),
  };
  if (input.status_to === "selesai") {
    patch.resolved_at = new Date().toISOString();
  }

  const { error: ticketError } = await supabase
    .from("service_tickets")
    .update(patch)
    .eq("id", input.ticket_id);
  if (ticketError) throw ticketError;
}
