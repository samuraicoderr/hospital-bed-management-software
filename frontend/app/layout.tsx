import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { AuthProviderClient } from "@/lib/api/auth/AuthProviderClient";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bobbleboddy = localFont({
  src: "../public/fonts/Bobbleboddy.ttf",
  variable: "--font-logo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BedFlow — Hospital Bed Management System",
  description:
    "Production-grade hospital bed management software for real-time patient flow, bed allocation, and operational visibility.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bobbleboddy.variable} antialiased`}
      >
        <AuthProviderClient>{children}</AuthProviderClient>
      </body>
    </html>
  );
}
