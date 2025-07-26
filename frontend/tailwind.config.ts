import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  // Note: In Tailwind CSS v4, most config is moved to CSS
  // Keep minimal config here, move theme customization to globals.css
};

export default config;
