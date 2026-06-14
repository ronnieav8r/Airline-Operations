"use client";

import { useEffect, useRef, useState } from "react";

type ThemeMode = "dark" | "light";

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("aeroops-theme", theme);
}

export function ThemeToggle() {
  const themeLoaded = useRef(false);
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const loadTheme = window.setTimeout(() => {
      const storedTheme = localStorage.getItem("aeroops-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const nextTheme =
        storedTheme === "dark" || storedTheme === "light" ? storedTheme : prefersDark ? "dark" : "light";

      themeLoaded.current = true;
      setTheme(nextTheme);
      applyTheme(nextTheme);
    }, 0);

    return () => window.clearTimeout(loadTheme);
  }, []);

  useEffect(() => {
    if (!themeLoaded.current) {
      return;
    }

    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    themeLoaded.current = true;
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
