"use client";

import Link from "next/link";
import { PointerEvent, ReactNode, useEffect, useMemo, useState } from "react";

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
  const [drawerWidth, setDrawerWidth] = useState<number | null>(null);
  const drawerSizeLabel = size;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedWidth = window.localStorage.getItem("aeroops:context-drawer-width");
      const parsedWidth = storedWidth ? Number.parseInt(storedWidth, 10) : Number.NaN;

      setDrawerWidth(Number.isFinite(parsedWidth) ? parsedWidth : 640);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const widthStyle = useMemo(() => {
    if (!drawerWidth) {
      return undefined;
    }

    return {
      width: `min(calc(100vw - 1rem), ${drawerWidth}px)`,
    };
  }, [drawerWidth]);

  function resizeDrawer(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(pointerId);

    function onPointerMove(moveEvent: globalThis.PointerEvent) {
      const viewportWidth = window.innerWidth;
      const minWidth = Math.min(420, viewportWidth - 16);
      const maxWidth = Math.max(minWidth, viewportWidth - 16);
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, viewportWidth - moveEvent.clientX));

      setDrawerWidth(nextWidth);
      window.localStorage.setItem("aeroops:context-drawer-width", String(Math.round(nextWidth)));
    }

    function onPointerUp() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-zinc-950/35">
      <Link aria-label="Close panel" className="absolute inset-0" href={closeHref} />
      <aside
        className="relative z-10 flex h-full w-[min(100vw,40rem)] min-w-[min(100vw,26rem)] max-w-[calc(100vw-1rem)] flex-col border-l border-zinc-200 bg-white shadow-2xl"
        data-drawer-size={drawerSizeLabel}
        style={widthStyle}
      >
        <div
          aria-label="Resize panel"
          className="absolute inset-y-0 left-0 z-20 w-2 -translate-x-1 cursor-ew-resize touch-none border-l border-transparent hover:border-sky-400"
          onPointerDown={resizeDrawer}
          role="separator"
        />
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
