import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-black/10 dark:border-white/10 mt-16">
      <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm opacity-80">
        <p>
          © {new Date().getFullYear()} ArbiX. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link href="https://t.me/YOUR_BOT_USERNAME" target="_blank" className="hover:underline">
            Telegram
          </Link>
          <Link href="https://github.com/" target="_blank" className="hover:underline">
            GitHub
          </Link>
          <Link href="#privacy" className="hover:underline">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}


