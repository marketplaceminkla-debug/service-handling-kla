import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: "#F9C227",
        primary: "#3B1856",
        "primary-dark": "#28103C",
        "main-bg": "#F4F5F7",
        danger: "#E5484D",
      },
    },
  },
  plugins: [],
};
export default config;
