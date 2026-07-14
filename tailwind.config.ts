import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: "#F5C200",
        "main-bg": "#F4F5F7",
        danger: "#E5484D",
      },
    },
  },
  plugins: [],
};
export default config;
