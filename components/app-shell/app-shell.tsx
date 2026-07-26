"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { use } from "react";
import type { UserRole } from "@prisma/client";

import { logoutAction } from "@/app/login/actions";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import type { CurrentUser } from "@/lib/auth/session";

const maintenanceNavRoles: UserRole[] = ["ADMIN", "MAINTENANCE"];

const navigationItems = [
  { label: "Crew App", href: "/crew/me", activePath: "/crew/me", crewOnly: true },
  { label: "Dashboard", href: "/" },
  { label: "Operations Control", href: "/operations-control" },
  { label: "Flights", href: "/flights" },
  { label: "Customers", href: "/customers" },
  { label: "Aircraft", href: "/aircraft" },
  { label: "Maintenance", href: "/maintenance", roles: maintenanceNavRoles },
  { label: "Crew", href: "/crew", exact: true },
  { label: "Scheduling", href: "/crew/scheduling?view=four-week&tab=coverage", activePath: "/crew/scheduling" },
  { label: "Admin", href: "/admin/settings" },
];

function isActiveRoute(pathname: string, item: (typeof navigationItems)[number]) {
  const href = item.activePath ?? item.href.split("?")[0];

  if (href === "/") {
    return pathname === href;
  }
  if (item.exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  currentUserPromise,
}: Readonly<{
  children: React.ReactNode;
  currentUserPromise: Promise<CurrentUser | null>;
}>) {
  const pathname = usePathname();
  const currentUser = use(currentUserPromise);
  const isCrewPortalPath = pathname === "/crew/me" || pathname.startsWith("/crew/me/");
  const showCrewShell = currentUser?.role === "CREW" || isCrewPortalPath;
  const visibleNavigationItems =
    showCrewShell
      ? navigationItems.filter((item) => item.crewOnly)
      : navigationItems.filter((item) => !item.crewOnly && (!item.roles || (currentUser && item.roles.includes(currentUser.role))));
  const homeHref = showCrewShell ? "/crew/me" : "/";
  const productLabel = showCrewShell ? "Crew App" : "AeroOps Center";
  const workspaceLabel = showCrewShell ? "Crew Workspace" : "Operations Console";

  return (
    <div className="min-h-screen bg-zinc-100">
      <header
        className={`app-shell-header sticky top-0 z-20 border-b backdrop-blur ${
          showCrewShell
            ? "crew-shell-header"
            : "border-zinc-200 bg-white/95 shadow-sm"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-2 px-4 py-2 sm:px-6 lg:px-8">
          <div className={`flex flex-wrap items-center gap-2 ${showCrewShell ? "justify-end" : "justify-between"}`}>
            {showCrewShell ? null : (
              <Link className="group min-w-0" href={homeHref}>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  {productLabel}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]" />
                  <span className="truncate text-sm font-semibold tracking-tight text-zinc-950 group-hover:text-zinc-700">
                    {workspaceLabel}
                  </span>
                </div>
              </Link>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <ThemeToggle />
              {currentUser?.role === "CREW" ? (
                <form action={logoutAction} className="flex items-center gap-2">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                    {currentUser.name} | {currentUser.role}
                  </span>
                  <button
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950"
                    type="submit"
                  >
                    Sign out
                  </button>
                </form>
              ) : showCrewShell ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                  Crew portal | local
                </span>
              ) : currentUser ? (
                <form action={logoutAction} className="flex items-center gap-2">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                    {currentUser.name} | {currentUser.role}
                  </span>
                  <button
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950"
                    type="submit"
                  >
                    Sign out
                  </button>
                </form>
              ) : (
                <Link
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950"
                  href="/login"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>

          {showCrewShell ? null : (
            <nav aria-label="Primary navigation" className="-mx-1 overflow-x-auto">
              <div className="flex min-w-max gap-1 px-1">
                {visibleNavigationItems.map((item) => {
                  const active = isActiveRoute(pathname, item);

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
          )}
        </div>
      </header>
      <div>{children}</div>
    </div>
  );
}
