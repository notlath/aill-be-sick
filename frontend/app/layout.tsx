import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI'll Be Sick - Chat Assistant",
  description: "AI-powered chat assistant for health consultations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="aill-be-sick">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Onest:wght@100;200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-onest">{children}</body>
    </html>
  );
}
