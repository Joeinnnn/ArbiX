"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how" }
  ];

  return (
    <header className="w-full sticky top-0 z-40 backdrop-blur border-b border-black/10 dark:border-white/10 bg-background/60">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">ArbiX</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          {navItems.map((item) => {
            const active = item.href !== "/" && pathname?.includes(item.href.replace("#", ""));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "hover:opacity-100 transition-opacity " + (active ? "opacity-100" : "opacity-80")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="https://discord.gg/U6zH6KRRYb"
            target="_blank"
            className="inline-flex items-center justify-center h-9 px-4 rounded-md border border-white/15 text-sm font-medium hover:bg-white/10 border-neon"
          >
            Join Discord
          </Link>
          <Link
            href="https://t.me/ArbiXSolanabot"
            target="_blank"
            className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-brand text-black text-sm font-medium hover:opacity-90 glow-brand border-neon border-neon-animated border-neon-glow"
          >
            Start on Telegram
          </Link>
        </div>
      </div>
    </header>
  );
}


