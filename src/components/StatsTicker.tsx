"use client";

import { useEffect, useState } from "react";

type Price = { value: number | null; change24h: number | null };

export function StatsTicker() {
  const [sol, setSol] = useState<Price>({ value: null, change24h: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrice() {
      try {
        // Simple public endpoint; consider proxying in production
        const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true", { cache: "no-store" });
        const j = await r.json();
        const price = j?.solana?.usd ?? null;
        const ch = j?.solana?.usd_24h_change ?? null;
        setSol({ value: price, change24h: ch });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchPrice();
    const timer: ReturnType<typeof setInterval> = setInterval(fetchPrice, 30_000);
    return () => clearInterval(timer);
  }, []);

  const changeClass = sol.change24h == null ? "" : sol.change24h >= 0 ? "text-emerald-400" : "text-rose-400";
  return (
    <div className="mt-6 w-full overflow-hidden rounded-xl border-neon border-neon-animated border-neon-glow border border-white/10 bg-white/5 backdrop-blur">
      <div className="flex items-center gap-4 px-4 py-3 text-sm">
        <div className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
          <span className="opacity-80">SOL/USD</span>
        </div>
        <div className="font-mono">
          {loading ? <span className="opacity-60">Loading…</span> :
            <span className="tabular-nums">${sol.value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>}
        </div>
        <div className={`text-xs ${changeClass}`}>
          {sol.change24h == null ? null :
            <span>({sol.change24h.toFixed(2)}%)</span>
          }
        </div>
      </div>
    </div>
  );
}


