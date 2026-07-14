import { supabase } from "@/lib/supabase";
import type {
  ServiceTicket,
  TicketStatus,
  TicketUpdate,
  TicketWithBranch,
} from "@/types";

const STUCK_THRESHOLD_DAYS = 3;

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

export async function listTickets(): Promise<TicketWithBranch[]> {
  const { data, error } = await supabase
    .from("service_tickets")
    .select("*, branch:branches(id, name, code)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as TicketWithBranch[];
}

export async function getTicket(id: string): Promise<TicketWithBranch> {
  const { data, error } = await supabase
    .from("service_tickets")
    .select("*, branch:branches(id, name, code)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as TicketWithBranch;
}

export async function createTicket(input: {
  no_service: string;
  branch_id: string;
  kategori: "stok" | "user";
  kode_barang: string;
  serial_number: string;
  estimasi?: string | null;
  posisi_unit?: string | null;
  keterangan?: string | null;
  reported_by: string | null;
  reported_by_name: string | null;
}): Promise<ServiceTicket> {
  const { data, error } = await supabase
    .from("service_tickets")
    .insert({
      no_service: input.no_service,
      branch_id: input.branch_id,
      kategori: input.kategori,
      kode_barang: input.kode_barang,
      serial_number: input.serial_number,
      estimasi: input.estimasi || null,
      posisi_unit: input.posisi_unit || null,
      keterangan: input.keterangan || null,
      reported_by: input.reported_by,
      reported_by_name: input.reported_by_name,
    })
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
  created_by: string | null;
  created_by_name: string | null;
}): Promise<void> {
  const { error: updateError } = await supabase.from("ticket_updates").insert({
    ticket_id: input.ticket_id,
    note: input.note,
    status_from: input.status_from,
    status_to: input.status_to,
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
