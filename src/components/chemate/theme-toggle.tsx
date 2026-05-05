"use client";

import { useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("chemate-theme", theme);
}

export function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") {
      return "dark";
    }

    return (
      (document.documentElement.dataset.theme as Theme | undefined) ??
      ((window.localStorage.getItem("chemate-theme") as Theme | null) ?? "dark")
    );
  });

  return (
    <button
      type="button"
      className="button-secondary group"
      aria-label="Toggle theme"
      onClick={() => {
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        applyTheme(nextTheme);
        setCurrentTheme(nextTheme);
      }}
    >
      {currentTheme === "dark" ? (
        <>
          <SunMedium className="h-4 w-4 text-lime-300 transition group-hover:rotate-12" />
          Light mode
        </>
      ) : (
        <>
          <MoonStar className="h-4 w-4 text-sky-500 transition group-hover:-rotate-12" />
          Dark mode
        </>
      )}
    </button>
  );
}
