"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type ObscuredElementState = {
  ariaHidden: string | null;
  element: HTMLElement;
  inert: boolean;
};

export function MaintenanceLogbookDialogShell({
  children,
  closeHref,
  focusKey,
  labelledBy,
}: {
  children: ReactNode;
  closeHref: string;
  focusKey: string;
  labelledBy: string;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    const obscured: ObscuredElementState[] = [];
    let branch: HTMLElement = dialog;
    let parent = branch.parentElement;

    while (parent) {
      for (const sibling of Array.from(parent.children)) {
        if (sibling === branch || !(sibling instanceof HTMLElement)) {
          continue;
        }

        obscured.push({
          ariaHidden: sibling.getAttribute("aria-hidden"),
          element: sibling,
          inert: sibling.inert,
        });
        sibling.inert = true;
        sibling.setAttribute("aria-hidden", "true");
      }

      branch = parent;
      parent = parent.parentElement;
    }

    const closeControl = dialog.querySelector<HTMLElement>("[data-logbook-dialog-close]");
    document.body.style.overflow = "hidden";
    let recoveryFrame: number | null = null;

    function focusDialogEntry() {
      (closeControl ?? dialog!).focus();
    }

    function recoverDialogFocus() {
      if (recoveryFrame !== null) {
        window.cancelAnimationFrame(recoveryFrame);
      }

      recoveryFrame = window.requestAnimationFrame(() => {
        recoveryFrame = null;

        if (dialog!.isConnected && !dialog!.contains(document.activeElement)) {
          focusDialogEntry();
        }
      });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        router.push(closeHref);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = Array.from(
        dialog!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hidden && element.getClientRects().length > 0);

      if (focusable.length === 0) {
        event.preventDefault();
        dialog!.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!dialog!.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function onFocusIn(event: FocusEvent) {
      if (!(event.target instanceof Node) || !dialog!.contains(event.target)) {
        focusDialogEntry();
      }
    }

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    const dialogObserver = new MutationObserver(recoverDialogFocus);
    dialogObserver.observe(dialog, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    focusDialogEntry();
    const focusFrame = window.requestAnimationFrame(focusDialogEntry);
    const focusTimer = window.setTimeout(focusDialogEntry, 0);

    return () => {
      dialogObserver.disconnect();
      if (recoveryFrame !== null) {
        window.cancelAnimationFrame(recoveryFrame);
      }
      window.cancelAnimationFrame(focusFrame);
      window.clearTimeout(focusTimer);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);

      for (const state of obscured) {
        state.element.inert = state.inert;

        if (state.ariaHidden === null) {
          state.element.removeAttribute("aria-hidden");
        } else {
          state.element.setAttribute("aria-hidden", state.ariaHidden);
        }
      }

      document.body.style.overflow = previousBodyOverflow;

      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [closeHref, router]);

  return (
    <aside
      aria-labelledby={labelledBy}
      aria-modal="true"
      className="fixed inset-y-0 right-0 z-30 flex w-full flex-col border-l border-zinc-200 bg-white shadow-2xl md:w-[80vw] md:max-w-6xl"
      data-logbook-dialog-focus-key={focusKey}
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      {children}
    </aside>
  );
}
