import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAGSIGNAL | AI Visibility Intelligence",
  description: "Internal RAG Signal AI visibility workspace.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
