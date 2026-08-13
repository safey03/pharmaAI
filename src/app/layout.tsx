import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PharmaAI | Smart Pharmacy Assistant",
  description:
    "PharmaAI is an intelligent pharmacy and health information assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}