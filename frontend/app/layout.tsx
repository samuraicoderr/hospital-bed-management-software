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
  title: "Bedflow — Financial Planning Workspace",
  description:
    "Bedflow is a financial planning workspace for founders. Add a budget line and watch your income statement, runway, and investor deck update in real time.",
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
