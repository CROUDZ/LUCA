/**
 * Helpers de styles pour le thème
 * Fonctions utilitaires pour créer des styles dynamiques
 */

import type { AppTheme, ThemeColors } from './types';
import { hexToRgba } from './utils';

/**
 * Retourne les couleurs de thème pré-calculées pour les styles
 * Évite la duplication du calcul dans chaque fichier de styles
 */
export const getStyleColors = (theme: AppTheme) => ({
  translucentSurface: hexToRgba(theme.colors.surface, theme.mode === 'dark' ? 0.94 : 0.98),
  translucentSecondary: hexToRgba(
    theme.colors.backgroundSecondary,
    theme.mode === 'dark' ? 0.9 : 0.95
  ),
  subtleBorder: hexToRgba(theme.colors.border, theme.mode === 'dark' ? 0.7 : 0.9),
  lightBorder: hexToRgba(theme.colors.border, theme.mode === 'dark' ? 0.5 : 0.7),
});

/**
 * Crée une couleur avec opacité selon le thème
 */
export const withAlpha = (color: string, alpha: number): string => hexToRgba(color, alpha);

/**
 * Couleurs de boutons préparées - Ajustées pour mode clair
 */
export const getButtonColors = (colors: ThemeColors, isDark: boolean) => ({
  primaryBorder: hexToRgba(colors.primary, isDark ? 0.6 : 0.4),
  primaryBg: hexToRgba(colors.primary, isDark ? 0.12 : 0.08),
  successBorder: hexToRgba(colors.success, isDark ? 0.45 : 0.5),
  successBg: hexToRgba(colors.success, isDark ? 0.15 : 0.1),
  dangerBorder: hexToRgba(colors.error, isDark ? 0.45 : 0.5),
  dangerBg: hexToRgba(colors.error, isDark ? 0.15 : 0.1),
  infoBorder: hexToRgba(colors.secondary, isDark ? 0.5 : 0.4),
  infoBg: hexToRgba(colors.secondary, isDark ? 0.15 : 0.1),
  warningBorder: hexToRgba(colors.warning, isDark ? 0.45 : 0.5),
  warningBg: hexToRgba(colors.warning, isDark ? 0.18 : 0.12),
});

/**
 * Ombre selon le mode - Plus visibles en mode clair
 */
export const getShadow = (theme: AppTheme, intensity: 'light' | 'medium' | 'strong' = 'medium') => {
  const opacities = {
    light: theme.mode === 'dark' ? 0.1 : 0.08,
    medium: theme.mode === 'dark' ? 0.2 : 0.15,
    strong: theme.mode === 'dark' ? 0.35 : 0.25,
  };

  return {
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: intensity === 'light' ? 1 : intensity === 'medium' ? 2 : 4 },
    shadowOpacity: opacities[intensity],
    shadowRadius: intensity === 'light' ? 2 : intensity === 'medium' ? 4 : 8,
    elevation: intensity === 'light' ? 2 : intensity === 'medium' ? 4 : 8,
  };
};
