import { Theme, colors, type Colors, semanticColors, getSemanticColor } from './colors';

export { colors, semanticColors, getSemanticColor };
export type { Theme, Colors };
export * from './styles';

export const themeNames: Record<Theme, string> = {
  dark: 'Dark',
  light: 'Light',
};

export const toggleTheme = (current: Theme): Theme => {
  return current === 'dark' ? 'light' : 'dark';
};
