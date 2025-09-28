import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ArbiX – Telegram Memecoin Trading Bot",
  description: "Trade memecoins from Telegram with speed, safety, and automation.",
  metadataBase: new URL("https://arbi-x-lake.vercel.app/"),
  openGraph: {
    title: "ArbiX – Telegram Memecoin Trading Bot",
    description: "Trade memecoins from Telegram with speed, safety, and automation.",
    url: "https://arbi-x-lake.vercel.app/",
    siteName: "ArbiX",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "ArbiX – Telegram Memecoin Trading Bot",
    description: "Trade memecoins from Telegram with speed, safety, and automation."
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <Header />
        <main className="mx-auto max-w-6xl px-4">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
