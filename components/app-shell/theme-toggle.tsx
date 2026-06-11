"use client";

import { useEffect, useState } from "react";

type ThemeMode = "dark" | "light";

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("aeroops-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const storedTheme = localStorage.getItem("aeroops-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return storedTheme === "dark" || storedTheme === "light" ? storedTheme : prefersDark ? "dark" : "light";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
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
