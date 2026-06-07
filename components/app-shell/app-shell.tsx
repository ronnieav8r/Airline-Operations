"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { label: "Dashboard", href: "/" },
  { label: "Operations Control", href: "/operations-control" },
  { label: "Flights", href: "/flights" },
  { label: "Aircraft", href: "/aircraft" },
  { label: "Crew", href: "/crew" },
  { label: "Scheduling", href: "/scheduling" },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link className="group min-w-0" href="/">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                AeroOps Center
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]" />
                <span className="truncate text-base font-semibold tracking-tight text-zinc-950 group-hover:text-zinc-700">
                  Operations Console
                </span>
              </div>
            </Link>
            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
              FlightLeg write v1
            </div>
          </div>

          <nav aria-label="Primary navigation" className="-mx-1 overflow-x-auto">
            <div className="flex min-w-max gap-1 px-1">
              {navigationItems.map((item) => {
                const active = isActiveRoute(pathname, item.href);

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-zinc-950 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </header>
      <div>{children}</div>
    </div>
  );
}
