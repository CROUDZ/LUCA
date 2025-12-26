/**
 * Types pour le système de thème LUCA
 */

/** Préférence de thème choisie par l'utilisateur */
export type ThemePreference = 'system' | 'dark' | 'light';

/** Mode de thème effectif (résolu) */
export type ThemeMode = 'dark' | 'light';

/** Palette de couleurs complète */
export interface ThemeColors {
  // Couleurs primaires
  primary: string;
  primarySoft: string;
  primaryMuted: string;
  primaryContrast: string;

  // Couleurs secondaires
  secondary: string;
  secondarySoft: string;

  // Arrière-plans
  background: string;
  backgroundSecondary: string;

  // Surfaces
  surface: string;
  surfaceElevated: string;
  overlay: string;

  // Texte
  text: string;
  textSecondary: string;
  textMuted: string;

  // Bordures
  border: string;
  borderStrong: string;

  // États
  success: string;
  warning: string;
  error: string;
  info: string;

  // Utilitaires
  shadow: string;
  focus: string;
  chip: string;
  chipDisabled: string;
  inputBackground: string;
}

/** Structure complète du thème */
export interface AppTheme {
  name: 'LUCA';
  mode: ThemeMode;
  colors: ThemeColors;
}

/** Valeur exposée par le contexte de thème */
export interface ThemeContextValue {
  /** Thème actuel avec toutes les couleurs */
  theme: AppTheme;
  /** Préférence utilisateur ('system' | 'dark' | 'light') */
  preference: ThemePreference;
  /** Changer la préférence de thème */
  setPreference: (p: ThemePreference) => Promise<void>;
  /** Basculer entre dark et light */
  toggle: () => Promise<void>;
  /** Raccourci: true si mode sombre */
  isDark: boolean;
}
