export const colors = {
  dark: {
    background: '#0d1117',
    panelBackground: '#161b22',
    border: '#30363d',
    textPrimary: '#c9d1d9',
    textSecondary: '#8b949e',
    accentGreen: '#3fb950',
    accentRed: '#f85149',
    accentYellow: '#d29922',
    accentBlue: '#58a6ff',
    accentPurple: '#a371f7',
    hoverBackground: '#21262d',
    inputBackground: '#0d1117',
    disabledOpacity: 0.5,
  },
  light: {
    background: '#ffffff',
    panelBackground: '#f6f8fa',
    border: '#d0d7de',
    textPrimary: '#24292f',
    textSecondary: '#57606a',
    accentGreen: '#1a7f37',
    accentRed: '#cf222e',
    accentYellow: '#bf8700',
    accentBlue: '#0969da',
    accentPurple: '#8250df',
    hoverBackground: '#f3f4f6',
    inputBackground: '#ffffff',
    disabledOpacity: 0.65,
  },
};

export type Theme = keyof typeof colors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const fontSizes = {
  xxs: 10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
};

// Type for color palette
export type Colors = typeof colors.dark;

// Semantic color aliases for consistent usage
export const semanticColors = {
  // Status colors
  success: 'accentGreen',
  error: 'accentRed',
  warning: 'accentYellow',
  info: 'accentBlue',
  
  // Connection status
  connected: 'accentGreen',
  disconnected: 'textSecondary',
  connecting: 'accentYellow',
  
  // Log levels
  debug: 'textSecondary',
  logInfo: 'accentBlue',
  logWarn: 'accentYellow',
  logError: 'accentRed',
  
  // Peer types
  directConnection: 'accentBlue',
  relayedConnection: 'accentYellow',
} as const;

/**
 * Get semantic color from palette
 */
export function getSemanticColor(
  palette: Colors,
  semantic: keyof typeof semanticColors
): string {
  const colorKey = semanticColors[semantic];
  return palette[colorKey as keyof Colors] as string;
}
