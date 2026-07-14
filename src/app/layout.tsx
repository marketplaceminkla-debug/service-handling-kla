import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Service Handling KLA Computer",
  description: "Monitoring progres servis unit multi-cabang — KLA Computer",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (!theme && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="bg-main-bg text-[#1a1a1a] dark:bg-gray-950 dark:text-gray-100">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
