"use client";
import { App, Button, ConfigProvider } from "antd";
import { Moon, Sun } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createAppTheme, themeStyles, type ThemeMode } from "./config";
const ThemeContext = createContext<{
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
} | null>(null);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  useEffect(() => {
    const root = document.documentElement;
    setMode(root.classList.contains("dark") ? "dark" : "light");
    const observer = new MutationObserver(() =>
      setMode(root.classList.contains("dark") ? "dark" : "light"),
    );
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  const context = useMemo(
    () => ({
      mode,
      setMode(next: ThemeMode) {
        document.documentElement.classList.toggle("dark", next === "dark");
        try {
          localStorage.setItem("complyvault-theme", next);
        } catch {
          /* Storage may be unavailable. */
        }
        setMode(next);
      },
    }),
    [mode],
  );
  return (
    <ThemeContext.Provider value={context}>
      <style>{themeStyles}</style>
      <ConfigProvider theme={createAppTheme(mode)}>
        <App>{children}</App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useAppTheme requires ThemeProvider");
  return value;
}
export function ThemeToggle() {
  const { mode, setMode } = useAppTheme();
  const label = `Switch to ${mode === "light" ? "dark" : "light"} theme`;
  return (
    <Button
      type="text"
      shape="circle"
      aria-label={label}
      title={label}
      icon={mode === "light" ? <Moon size={17} /> : <Sun size={17} />}
      onClick={() => setMode(mode === "light" ? "dark" : "light")}
    />
  );
}
