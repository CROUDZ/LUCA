/**
 * @deprecated Importer depuis '../theme' à la place
 *
 * Ce fichier est conservé pour la rétrocompatibilité.
 * Il réexporte tout depuis le nouveau module src/theme/
 */

export type {
  ThemePreference,
  ThemeMode,
  ThemeColors,
  AppTheme,
  ThemeContextValue,
} from '../theme';

export {
  ThemeProvider,
  AppThemeProvider,
  useTheme,
  useAppTheme,
  useIsDark,
  useColors,
  palette,
  darkColors,
  lightColors,
  getColors,
  hexToRgba,
  lighten,
  darken,
  mixColors,
  getStyleColors,
  withAlpha,
  getButtonColors,
  getShadow,
} from '../theme';
