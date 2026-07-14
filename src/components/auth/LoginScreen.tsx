"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { LogoWordmark } from "@/components/layout/Logo";

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        setError(error);
      } else {
        setInfo(
          "Akun berhasil dibuat. Tunggu aktivasi dari Super Admin sebelum bisa login."
        );
        setMode("login");
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8">
        <div className="bg-primary -mx-8 -mt-8 mb-6 px-8 py-6 rounded-t-xl">
          <LogoWordmark />
        </div>
        <p className="text-sm text-gray-500 -mt-2 mb-6">
          Monitoring progres servis unit multi-cabang
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {error && (
            <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "w-full rounded-lg bg-brand text-primary font-semibold py-2.5 text-sm transition hover:brightness-95",
              submitting && "opacity-60"
            )}
          >
            {mode === "login" ? "Masuk" : "Daftar"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
            setInfo(null);
          }}
          className="w-full text-center text-sm text-gray-500 mt-4 hover:text-primary"
        >
          {mode === "login"
            ? "Belum punya akun? Daftar"
            : "Sudah punya akun? Masuk"}
        </button>
      </div>
    </div>
  );
}
