"use client";

import { useEffect, useState } from "react";
import { resolveInitialTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(resolveInitialTheme(stored, prefersDark));
  }, []);

  useEffect(() => {
    if (theme) document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  if (!theme) {
    return <button className="theme-toggle" aria-label="Toggle color theme" />;
  }

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    setTheme(next);
  }

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle color theme">
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
