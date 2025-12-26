/**
 * Palette de couleurs pour le thème LUCA
 * Définit les couleurs de base et les variantes light/dark
 */

import { darken, lighten, mixColors, hexToRgba } from './utils';
import type { ThemeColors } from './types';

/**
 * Palette de base partagée entre les thèmes
 */
export const palette = {
  // Couleurs de marque
  primary: '#5a2af5',
  primarySoft: '#9069cd',
  primaryMuted: mixColors('#5a2af5', '#7e5bef', 0.35),
  primaryContrast: darken('#5a2af5', 0.25),
  secondary: '#2ed0ff',
  secondarySoft: '#1899d6',
  accentPurple: '#7e5bef',

  // Variantes claires des couleurs de marque - Plus saturées pour meilleur contraste
  primaryLight: '#6b35f5',
  primarySoftLight: '#8b5cf6',
  secondaryLight: '#06b6d4',
  secondarySoftLight: '#0891b2',

  // États
  success: '#1fc8a9',
  warning: '#f5a524',
  error: '#ff6b81',
  info: '#57b2ff',

  // États version claire (plus saturés pour contraste)
  successLight: '#0fa890',
  warningLight: '#e09000',
  errorLight: '#e05468',
  infoLight: '#3a9de6',

  // Arrière-plans sombres
  backgroundDark: '#05030f',
  backgroundDeep: '#0b0d1f',
  backgroundMuted: '#12142b',

  // Arrière-plans clairs - Fond légèrement teinté pour meilleur contraste
  backgroundLight: '#f5f7ff',
  backgroundSoft: '#eef0fc',

  // Surfaces sombres
  surfaceDark: '#1c1f3a',
  surfaceSemiDark: '#262947',

  // Surfaces claires - Plus de contraste
  surfaceLight: '#ffffff',
  surfaceMutedLight: '#f5f7ff',
  surfaceElevatedLight: '#ffffff',

  // Texte sur fond sombre
  textOnDark: '#f4f6ff',
  textSecondaryOnDark: '#c5c9ff',

  // Texte sur fond clair - Plus de contraste
  textOnLight: '#1a1b3d',
  textSecondaryOnLight: '#5c6080',

  // Bordures
  borderDark: lighten('#1c1f3a', 0.2),
  borderLight: '#c8cee8',
  borderLightStrong: '#a0a8d0',

  // Ombres
  shadowDark: darken('#05030f', 0.2),
  shadowLight: '#8890b8',
} as const;

/**
 * Couleurs partagées entre light et dark (mode sombre)
 */
const darkSharedColors = {
  primary: palette.primary,
  primarySoft: palette.primarySoft,
  primaryMuted: palette.primaryMuted,
  primaryContrast: palette.primaryContrast,
  secondary: palette.secondary,
  secondarySoft: palette.secondarySoft,
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  info: palette.info,
};

/**
 * Couleurs partagées pour le mode clair (ajustées pour meilleur contraste)
 */
const lightSharedColors = {
  primary: palette.primaryLight,
  primarySoft: palette.primarySoftLight,
  primaryMuted: mixColors(palette.primaryLight, palette.accentPurple, 0.35),
  primaryContrast: darken(palette.primaryLight, 0.15),
  secondary: palette.secondaryLight,
  secondarySoft: palette.secondarySoftLight,
  success: palette.successLight,
  warning: palette.warningLight,
  error: palette.errorLight,
  info: palette.infoLight,
};

/**
 * Couleurs du thème sombre
 */
export const darkColors: ThemeColors = {
  ...darkSharedColors,
  background: palette.backgroundDark,
  backgroundSecondary: palette.backgroundMuted,
  surface: palette.surfaceDark,
  surfaceElevated: palette.surfaceSemiDark,
  overlay: hexToRgba('#000000', 0.5),
  text: palette.textOnDark,
  textSecondary: palette.textSecondaryOnDark,
  textMuted: hexToRgba(palette.textSecondaryOnDark, 0.65),
  border: palette.borderDark,
  borderStrong: mixColors(palette.borderDark, palette.primary, 0.4),
  shadow: palette.shadowDark,
  focus: hexToRgba(palette.secondary, 0.35),
  chip: hexToRgba(palette.primarySoft, 0.18),
  chipDisabled: hexToRgba(palette.textSecondaryOnDark, 0.25),
  inputBackground: palette.surfaceDark,
};

/**
 * Couleurs du thème clair - Amélioré pour meilleur contraste
 */
export const lightColors: ThemeColors = {
  ...lightSharedColors,
  background: palette.backgroundLight,
  backgroundSecondary: palette.backgroundSoft,
  surface: palette.surfaceLight,
  surfaceElevated: palette.surfaceElevatedLight,
  overlay: hexToRgba('#1a1b3d', 0.4),
  text: palette.textOnLight,
  textSecondary: palette.textSecondaryOnLight,
  textMuted: hexToRgba(palette.textSecondaryOnLight, 0.7),
  border: palette.borderLight,
  borderStrong: palette.borderLightStrong,
  shadow: palette.shadowLight,
  focus: hexToRgba(palette.secondaryLight, 0.25),
  chip: hexToRgba(palette.primaryLight, 0.12),
  chipDisabled: hexToRgba(palette.textSecondaryOnLight, 0.15),
  inputBackground: palette.surfaceMutedLight,
};

/**
 * Récupère les couleurs selon le mode
 */
export const getColors = (mode: 'dark' | 'light'): ThemeColors =>
  mode === 'dark' ? darkColors : lightColors;
