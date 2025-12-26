/**
 * Système de thème LUCA
 *
 * Point d'entrée unique pour tout ce qui concerne le thème.
 *
 * Usage:
 *   import { useTheme, AppTheme, hexToRgba } from '../theme';
 */

// Types
export type { ThemePreference, ThemeMode, ThemeColors, AppTheme, ThemeContextValue } from './types';

// Provider et hooks
export {
  ThemeProvider,
  AppThemeProvider, // Alias pour rétrocompatibilité
  useTheme,
  useAppTheme, // Alias pour rétrocompatibilité
  useIsDark,
  useColors,
} from './context';

// Couleurs
export { palette, darkColors, lightColors, getColors } from './colors';

// Utilitaires
export { hexToRgba, lighten, darken, mixColors } from './utils';

// Helpers de styles
export { getStyleColors, withAlpha, getButtonColors, getShadow } from './styleHelpers';
