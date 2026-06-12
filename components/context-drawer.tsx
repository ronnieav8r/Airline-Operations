import Link from "next/link";
import { ReactNode } from "react";

type ContextDrawerProps = {
  children: ReactNode;
  closeHref: string;
  eyebrow?: string;
  title: string;
};

export function ContextDrawer({
  children,
  closeHref,
  eyebrow = "Quick review",
  title,
}: ContextDrawerProps) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-zinc-950/35">
      <Link aria-label="Close panel" className="absolute inset-0" href={closeHref} />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-950">{title}</h2>
          </div>
          <Link
            className="rounded-full border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
            href={closeHref}
          >
            Close
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}
