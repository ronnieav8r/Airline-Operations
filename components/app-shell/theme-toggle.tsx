"use client";

import { useSyncExternalStore } from "react";

type ThemeMode = "dark" | "light";
const THEME_CHANGE_EVENT = "aeroops-theme-change";

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("aeroops-theme", theme);
}

function getResolvedTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const documentTheme = document.documentElement.dataset.theme;
  const storedTheme = localStorage.getItem("aeroops-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (documentTheme === "dark" || documentTheme === "light") {
    return documentTheme;
  }
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return prefersDark ? "dark" : "light";
}

function subscribeToTheme(callback: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getResolvedTheme, () => "light");

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <button
      aria-pressed={theme === "dark"}
      className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950"
      onClick={toggleTheme}
      type="button"
    >
      {theme === "dark" ? "Light view" : "Dark view"}
    </button>
  );
}
