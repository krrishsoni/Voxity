"use client";

import { useEffect, useState } from "react";
import { MoonStar, Sun } from "lucide-react";

const STORAGE_KEY = "campus-pulse-theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const dark = stored === "dark";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    setReady(true);
  }, []);

  function toggleTheme() {
    const nextDark = !isDark;
    setIsDark(nextDark);
    localStorage.setItem(STORAGE_KEY, nextDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", nextDark);
  }

  return (
    <button className="btn-secondary" onClick={toggleTheme} type="button" disabled={!ready} aria-label="Toggle theme">
      {isDark ? <Sun className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
