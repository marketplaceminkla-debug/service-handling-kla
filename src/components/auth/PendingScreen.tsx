"use client";

import { useAuth } from "@/lib/auth";

export function PendingScreen() {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-main-bg px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <h1 className="text-lg font-bold text-gray-900">Akun Belum Aktif</h1>
        <p className="text-sm text-gray-500 mt-2">
          Hai{profile?.full_name ? ` ${profile.full_name}` : ""}, akun kamu (
          {profile?.email}) sudah terdaftar tapi belum diaktifkan. Hubungi
          Super Admin untuk aktivasi.
        </p>
        <button
          onClick={() => signOut()}
          className="mt-6 w-full rounded-lg border border-gray-300 text-gray-700 font-medium py-2.5 text-sm hover:bg-gray-50"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
