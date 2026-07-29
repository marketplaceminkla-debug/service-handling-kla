import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    /** Modul lib menginisialisasi klien Supabase saat diimpor, yang
     * menolak URL kosong. Nilai dummy ini cuma supaya impornya jalan —
     * tidak ada test yang benar-benar memanggil jaringan. */
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
});
