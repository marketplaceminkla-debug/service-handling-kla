"use client";

import { useAuth } from "@/lib/auth";
import { LogoWordmark } from "@/components/layout/Logo";

export function PendingScreen() {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="bg-primary -mx-8 -mt-8 mb-6 px-8 py-6 rounded-t-xl flex justify-center">
          <LogoWordmark />
        </div>
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
