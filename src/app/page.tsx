import Link from "next/link";
import { TiltCard } from "@/components/TiltCard";
import { StatsTicker } from "@/components/StatsTicker";

export default function Home() {
  return (
    <div className="py-16">
      <section className="relative isolate overflow-hidden rounded-2xl border-neon border-neon-animated border-neon-glow border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-10 md:p-16 bg-tech-grid bg-animated">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gradient">
            Trade memecoins from Telegram
          </h1>
          <p className="mt-4 text-base md:text-lg opacity-80">
            ArbiX connects to your wallet and lets you buy, sell, and snipe tokens
            right inside Telegram with blazing speed and safety.
          </p>
          <div className="mt-6 flex items-center gap-3 text-xs uppercase opacity-80">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" /> Powered by Solana
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
              Low fees
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
              Real-time
            </span>
          </div>
          <div className="mt-8 flex items-center gap-3">
            <Link
              href="https://t.me/ArbiXSolanabot"
              target="_blank"
              className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-6 text-black font-medium hover:opacity-90 glow-brand border-neon border-neon-animated border-neon-glow"
            >
              Open Telegram Bot
            </Link>
            <Link
              href="#features"
              className="inline-flex h-11 items-center justify-center rounded-md border border-white/15 px-6 font-medium hover:bg-white/10 border-neon"
            >
              Learn more
            </Link>
          </div>
        </div>
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
        <div className="lines-45" />
        <div className="lines-135" />
        <div className="scan-overlay" />
      </section>

      <section className="mt-10">
        <StatsTicker />
      </section>

      <section id="features" className="mt-12 grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Fast buys & sells",
            desc: "Built for speed with pre-configured gas presets and one-tap trades."
          },
          {
            title: "Rug checks",
            desc: "Automatic safety signals and liquidity checks before you execute."
          },
          {
            title: "Snipe & DCA",
            desc: "Automations like sniping, DCA, TP/SL and trailing stops."
          }
        ].map((f) => (
          <TiltCard key={f.title} className="p-6 border-neon-animated">
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm opacity-80">{f.desc}</p>
          </TiltCard>
        ))}
      </section>

      <section id="how" className="mt-20 card p-8">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ol className="mt-4 list-decimal list-inside space-y-2 opacity-90">
          <li>Start the bot on Telegram and connect your wallet.</li>
          <li>Search a token or paste the address to trade instantly.</li>
          <li>Use automations like snipe, DCA, TP/SL to manage risk.</li>
        </ol>
      </section>

      <section className="mt-20 text-center">
        <h3 className="text-xl font-semibold">Ready to try ArbiX?</h3>
        <p className="mt-2 opacity-80">Launch the bot and start trading from Telegram.</p>
        <div className="mt-6">
          <Link
            href="https://t.me/ArbiXSolanabot"
            target="_blank"
            className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-6 text-background font-medium hover:opacity-90 border-neon border-neon-animated border-neon-glow"
          >
            Start on Telegram
          </Link>
        </div>
      </section>
    </div>
  );
}
