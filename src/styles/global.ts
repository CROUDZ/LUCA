import { darken, lighten, mixColors } from './colorUtils';

/**
 * Base color palette shared across light/dark themes.
 * The palette is derived from the brand hues requested by the design brief.
 */
export const basePalette = {
  primary: '#5a2af5',
  primarySoft: '#7e5bef',
  primaryMuted: mixColors('#5a2af5', '#7e5bef', 0.35),
  primaryContrast: darken('#5a2af5', 0.25),
  secondary: '#2ed0ff',
  accentBlue: '#1899d6',
  accentPurple: '#7e5bef',
  backgroundDark: '#05030f',
  backgroundDeep: '#0b0d1f',
  backgroundMuted: '#12142b',
  backgroundLight: '#f7f8ff',
  backgroundSoft: '#eef1ff',
  surfaceDark: '#1c1f3a',
  surfaceSemiDark: '#262947',
  surfaceLight: '#ffffff',
  surfaceMutedLight: '#f1f3ff',
  success: '#1fc8a9',
  warning: '#f5a524',
  error: '#ff6b81',
  info: '#57b2ff',
  textOnDark: '#f4f6ff',
  textSecondaryOnDark: '#c5c9ff',
  textOnLight: '#11122b',
  textSecondaryOnLight: '#4b4f7a',
  borderDark: lighten('#1c1f3a', 0.2),
  borderLight: '#dce1ff',
  shadowDark: darken('#05030f', 0.2),
  shadowLight: mixColors('#2ed0ff', '#5a2af5', 0.15),
};

export type BasePalette = typeof basePalette;
