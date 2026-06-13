import Link from "next/link";
import { ReactNode } from "react";

type ContextDrawerProps = {
  actionSlot?: ReactNode;
  backHref?: string;
  children: ReactNode;
  closeHref: string;
  contractHref?: string;
  eyebrow?: string;
  expandHref?: string;
  size?: "expanded" | "standard" | "wide";
  title: string;
};

export function ContextDrawer({
  actionSlot,
  backHref,
  children,
  closeHref,
  contractHref,
  eyebrow = "Quick review",
  expandHref,
  size = "standard",
  title,
}: ContextDrawerProps) {
  const drawerSizeClasses =
    size === "expanded"
      ? "h-full w-[min(100vw,72rem)] border-l border-zinc-200 bg-white shadow-2xl"
      : size === "wide"
        ? "h-full w-[min(100vw,56rem)] border-l border-zinc-200 bg-white shadow-2xl"
        : "h-full w-full max-w-xl border-l border-zinc-200 bg-white shadow-2xl";

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-zinc-950/35">
      <Link aria-label="Close panel" className="absolute inset-0" href={closeHref} />
      <aside className={`relative z-10 flex flex-col ${drawerSizeClasses}`}>
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-950">{title}</h2>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {actionSlot}
            {backHref ? (
              <Link
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                href={backHref}
              >
                Back
              </Link>
            ) : null}
            {size === "expanded" && contractHref ? (
              <Link
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                href={contractHref}
              >
                Contract
              </Link>
            ) : null}
            {size === "standard" && expandHref ? (
              <Link
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                href={expandHref}
              >
                Expand
              </Link>
            ) : null}
            <Link
              className="rounded-full border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              href={closeHref}
            >
              Close
            </Link>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}
