import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-onest)", "sans-serif"],
        onest: ["var(--font-onest)", "sans-serif"],
      },
    },
  },
  plugins: [require("daisyui")],
};

export default config;
