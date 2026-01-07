import { useState, useCallback } from 'react';
import { Theme, colors as colorPalette } from '../theme/colors';
import { getStyles } from '../theme/styles';
import { settingsService, TuiSettings } from '../services/settingsService';

interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  colors: typeof colorPalette.dark;
  styles: ReturnType<typeof getStyles>;
}

export function useTheme(initialSettings?: TuiSettings): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>((initialSettings?.theme as Theme) || 'dark');
  
  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    
    if (initialSettings) {
      await settingsService.save({ ...initialSettings, theme: newTheme });
    }
  }, [initialSettings]);
  
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);
  
  return {
    theme,
    setTheme,
    toggleTheme,
    colors: colorPalette[theme],
    styles: getStyles(theme),
  };
}