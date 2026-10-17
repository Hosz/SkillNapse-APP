import React, { useState, useEffect } from 'react';
import { ThemeContext, type Theme } from './theme-context-def';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('skillnapse_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('skillnapse_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.remove('theme-dark');
      root.classList.add('light');
      root.classList.add('theme-light');
    } else {
      root.classList.add('dark');
      root.classList.add('theme-dark');
      root.classList.remove('light');
      root.classList.remove('theme-light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
