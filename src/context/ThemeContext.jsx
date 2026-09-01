import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme || "dark";
  });
  const [glassMode, setGlassMode] = useState(() => {
    const saved = localStorage.getItem("glassMode");
    return saved === "true";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (glassMode) root.classList.add("glass-mode");
    else root.classList.remove("glass-mode");
    localStorage.setItem("glassMode", glassMode);
  }, [glassMode]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const toggleGlass = () => setGlassMode((g) => !g);

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, glassMode, toggleGlass }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
