/**
 * Shared shell for public marketing / trust pages.
 */

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

export function MarketingShell({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}): React.ReactElement {
  return (
    <div className="min-h-screen bg-surface-strong text-white">
      <header className="border-b border-surface-card/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium">
            <span className="relative h-7 w-7">
              <Image
                src="/logo-white.svg"
                alt=""
                fill
                className="object-contain"
              />
            </span>
            ComplyVault
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            <Link href="/trust" className="hover:text-white">
              Trust
            </Link>
            <Link href="/security/complyvault-security-overview.txt" className="hover:text-white">
              Security overview
            </Link>
            <Link href="/auth/signin" className="hover:text-white">
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {title ? (
          <h1 className="mb-8 text-3xl font-semibold tracking-tight text-white">
            {title}
          </h1>
        ) : null}
        {children}
      </main>
      <footer className="border-t border-surface-card/10 py-8">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-4 px-4 text-sm text-white/50 sm:px-6">
          <Link href="/trust" className="hover:text-white/80">
            Trust
          </Link>
          <Link href="/privacy" className="hover:text-white/80">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-white/80">
            Terms
          </Link>
          <span>© {new Date().getUTCFullYear()} ComplyVault</span>
        </div>
      </footer>
    </div>
  );
}
