import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { COLOR_SCHEMES, DEFAULT_COLOR_SCHEME } from "../config/themeColors";

const ThemeContext = createContext(null);
const THEME_KEY = "ui-theme";
const COLOR_SCHEME_KEY = "ui-color-scheme";

const getSystemTheme = () => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const getInitialTheme = () => {
  if (typeof window === "undefined") return "system";
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark" || saved === "system") {
    return saved;
  }
  return "system";
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState(getSystemTheme);
  const [colorScheme, setColorScheme] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_COLOR_SCHEME;
    const saved = window.localStorage.getItem(COLOR_SCHEME_KEY);
    return COLOR_SCHEMES[saved] ? saved : DEFAULT_COLOR_SCHEME;
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const nextResolved = theme === "system" ? getSystemTheme() : theme;
      setResolvedTheme(nextResolved);
      document.documentElement.classList.toggle("dark", nextResolved === "dark");
    };

    const onSystemChange = () => {
      if (theme === "system") {
        applyTheme();
      }
    };

    applyTheme();
    window.localStorage.setItem(THEME_KEY, theme);

    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, [theme]);

  useEffect(() => {
    const selectedScheme = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES[DEFAULT_COLOR_SCHEME];
    document.documentElement.style.setProperty("--brand", selectedScheme.brand);
    document.documentElement.style.setProperty("--brand-dark", selectedScheme.brandDark);
    window.localStorage.setItem(COLOR_SCHEME_KEY, colorScheme);
  }, [colorScheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      colorScheme,
      setColorScheme,
      colorSchemes: COLOR_SCHEMES
    }),
    [theme, resolvedTheme, colorScheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
