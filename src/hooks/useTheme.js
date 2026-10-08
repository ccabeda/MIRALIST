import { useEffect, useState } from 'react';
import { storageKeys, writeStorage } from '../services/storage.js';

export default function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#101012' : '#faf8f5');
    writeStorage(storageKeys.theme, theme);
  }, [theme]);
  return [theme, setTheme];
}
