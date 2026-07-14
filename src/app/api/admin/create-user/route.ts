import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Role } from "@/types";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: userData, error: userError } = await authClient.auth.getUser(
    token
  );
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: callerProfile } = await adminClient
    .from("profiles")
    .select("role, is_active")
    .eq("id", userData.user.id)
    .single();

  if (
    !callerProfile ||
    callerProfile.role !== "super_admin" ||
    !callerProfile.is_active
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { email, password, full_name, role, branch_scope } = body as {
    email: string;
    password: string;
    full_name: string;
    role: Role;
    branch_scope: string[];
  };

  if (!email || !password || !role) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name ?? "" },
    });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Gagal membuat user" },
      { status: 400 }
    );
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      full_name: full_name ?? "",
      role,
      branch_scope: branch_scope ?? [],
      is_active: true,
    })
    .eq("id", created.user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
