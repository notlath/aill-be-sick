import type { Metadata } from "next";
import { Onest } from "next/font/google";
import "./globals.css";

const onest = Onest({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-onest",
});

export const metadata: Metadata = {
  title: "AI'll Be Sick",
  description: "AI-powered chat assistant for health consultations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="aill-be-sick">
      <body
        className={`antialiased ${onest.className}`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
