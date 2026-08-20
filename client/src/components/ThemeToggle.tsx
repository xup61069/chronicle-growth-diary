import { Moon, Sun } from "lucide-react";
import React, { useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => typeof document !== "undefined" && !document.documentElement.classList.contains("dark") ? "light" : "dark");
  const nextTheme = theme === "dark" ? "明亮模式" : "深色模式";

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
  };

  return <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`切換至${nextTheme}`} title={`切換至${nextTheme}`}>
    {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
    <span>{theme === "dark" ? "明亮" : "深色"}</span>
  </button>;
}
