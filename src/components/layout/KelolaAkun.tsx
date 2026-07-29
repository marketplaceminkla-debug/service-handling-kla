"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { listBranches } from "@/lib/branches";
import type { Branch, Profile, Role } from "@/types";
import { cn, errorMessage } from "@/lib/utils";

export function KelolaAkun() {
  const { session } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }),
      listBranches(),
    ])
      .then(([p, b]) => {
        if (p.error) throw p.error;
        setProfiles(p.data as Profile[]);
        setBranches(b);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleActive = async (p: Profile) => {
    setError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    if (error) setError(error.message);
    else load();
  };

  const changeRole = async (p: Profile, role: Role) => {
    setError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", p.id);
    if (error) setError(error.message);
    else load();
  };

  const toggleBranch = async (p: Profile, branchId: string) => {
    setError(null);
    const scope = p.branch_scope.includes(branchId)
      ? p.branch_scope.filter((id) => id !== branchId)
      : [...p.branch_scope, branchId];
    const { error } = await supabase
      .from("profiles")
      .update({ branch_scope: scope })
      .eq("id", p.id);
    if (error) setError(error.message);
    else load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Kelola Akun
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {profiles.length} akun
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-brand text-gray-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:brightness-95"
        >
          <Plus size={16} />
          Bikin Akun
        </button>
      </div>

      {showForm && (
        <CreateUserForm
          accessToken={session?.access_token ?? ""}
          branches={branches}
          onDone={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Memuat...</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 font-medium">Nama / Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Cabang</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-50 dark:border-gray-700/60 last:border-0 align-top"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {p.full_name || "-"}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      {p.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.role}
                      onChange={(e) => changeRole(p, e.target.value as Role)}
                      className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {branches.map((b) => {
                        const active = p.branch_scope.includes(b.id);
                        return (
                          <button
                            key={b.id}
                            onClick={() => toggleBranch(p, b.id)}
                            className={cn(
                              "text-xs px-2 py-1 rounded border",
                              active
                                ? "bg-yellow-50 dark:bg-yellow-900/30 border-brand text-gray-900 dark:text-gray-100"
                                : "border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500"
                            )}
                          >
                            {b.code}
                          </button>
                        );
                      })}
                      {branches.length === 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          -
                        </span>
                      )}
                    </div>
                    {p.branch_scope.length === 0 && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                        Kosong = semua cabang
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(p)}
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded",
                        p.is_active
                          ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {p.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-gray-400 dark:text-gray-500"
                  >
                    Belum ada akun.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreateUserForm({
  accessToken,
  branches,
  onDone,
}: {
  accessToken: string;
  branches: Branch[];
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [scope, setScope] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role,
          branch_scope: scope,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat akun");
      onDone();
    } catch (err) {
      setError(errorMessage(err, "Gagal membuat akun"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6 space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nama Lengkap
          </span>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password Awal
          </span>
          <input
            required
            type="text"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Role
          </span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </label>
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Cabang (kosong = semua cabang)
        </span>
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => {
            const active = scope.includes(b.id);
            return (
              <button
                type="button"
                key={b.id}
                onClick={() =>
                  setScope((s) =>
                    active ? s.filter((id) => id !== b.id) : [...s, b.id]
                  )
                }
                className={cn(
                  "text-xs px-2.5 py-1.5 rounded border",
                  active
                    ? "bg-yellow-50 dark:bg-yellow-900/30 border-brand text-gray-900 dark:text-gray-100"
                    : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                )}
              >
                {b.name}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 text-sm font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95 disabled:opacity-60"
        >
          Buat Akun
        </button>
      </div>
    </form>
  );
}
