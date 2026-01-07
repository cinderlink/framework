/**
 * OpenTUI Style Utilities
 * 
 * Helpers for working with OpenTUI's styling system.
 */

import { colors, type Theme } from './colors';

/**
 * Get theme colors for the current theme
 */
export function getThemeColors(theme: Theme) {
  return colors[theme];
}

/**
 * Get computed styles for a theme
 */
export function getStyles(theme: Theme) {
  const c = colors[theme];
  
  return {
    // Panel styles
    panel: {
      border: true,
      borderColor: c.border,
      backgroundColor: c.panelBackground,
      padding: 1,
    },
    // Card styles
    card: {
      border: true,
      borderColor: c.border,
      backgroundColor: c.panelBackground,
      padding: 1,
      marginBottom: 1,
    },
    // Text styles
    text: {
      primary: { fg: c.textPrimary },
      secondary: { fg: c.textSecondary },
      success: { fg: c.accentGreen },
      error: { fg: c.accentRed },
      warning: { fg: c.accentYellow },
      info: { fg: c.accentBlue },
    },
    // Layout helpers
    row: {
      flexDirection: 'row' as const,
    },
    column: {
      flexDirection: 'column' as const,
    },
    centered: {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    spaceBetween: {
      justifyContent: 'space-between' as const,
    },
  };
}

/**
 * Common box styles
 */
export const boxStyles = {
  panel: {
    border: true,
    padding: 1,
  },
  card: {
    border: true,
    padding: 1,
    marginBottom: 1,
  },
  row: {
    flexDirection: 'row' as const,
  },
  column: {
    flexDirection: 'column' as const,
  },
  centered: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
} as const;

/**
 * Status color mapping
 */
export function getStatusColor(status: 'success' | 'error' | 'warning' | 'info', theme: Theme): string {
  const themeColors = colors[theme];
  switch (status) {
    case 'success':
      return themeColors.accentGreen;
    case 'error':
      return themeColors.accentRed;
    case 'warning':
      return themeColors.accentYellow;
    case 'info':
      return themeColors.accentBlue;
  }
}
