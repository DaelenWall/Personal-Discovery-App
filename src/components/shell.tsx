"use client";

import Link from "./navigation";
import { usePathname } from "./navigation";
import { useApp } from "./app-provider";
import { DeviceStatus } from "./device-status";

const navigation = [
  ["/", "Discover"],
  ["/library", "Library"],
  ["/knowledge", "Knowledge"],
  ["/ingest", "Add a source"],
  ["/settings", "Settings"],
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { error, clearError, store, reload, isPhone } = useApp();
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          if (!isPhone) return;
          event.preventDefault();
          const main = document.getElementById("main");
          main?.focus();
          main?.scrollIntoView();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-symbol" aria-hidden="true">
            ◫
          </span>
          <span>
            Commonplace<span className="brand-caption">PERSONAL DISCOVERY</span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          {navigation.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <span className="local-status">
          <span aria-hidden="true" />
          Local & private
        </span>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={clearError} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      <DeviceStatus />
      <main id="main" tabIndex={-1}>
        {store ? (
          children
        ) : (
          <div className="empty-state">
            <p>Opening your commonplace…</p>
            {error && <button onClick={() => void reload()}>Try again</button>}
          </div>
        )}
      </main>
      <footer className="site-footer">
        <span>A place for ideas. A boundary for your attention.</span>
        <span>Single user. No tracking services.</span>
      </footer>
    </div>
  );
}
