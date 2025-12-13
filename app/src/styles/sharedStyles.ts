/**
 * SharedStyles - Styles partagés entre composants
 * Centralise les styles communs pour éviter la duplication
 */

import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { AppTheme } from './theme';
import { hexToRgba, getThemeColors } from './colorUtils';

/**
 * Crée les styles de boutons communs
 */
export const createButtonStyles = (theme: AppTheme) => {
  const { translucentSurface, subtleBorder } = getThemeColors(theme);

  return StyleSheet.create({
    // Bouton de base
    baseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: translucentSurface,
      borderWidth: 1,
      borderColor: subtleBorder,
      gap: 6,
      elevation: 4,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    } as ViewStyle,

    // Variantes
    primaryButton: {
      borderColor: hexToRgba(theme.colors.primary, 0.6),
      backgroundColor: hexToRgba(theme.colors.primary, 0.12),
    } as ViewStyle,

    successButton: {
      borderColor: hexToRgba(theme.colors.success, 0.45),
      backgroundColor: hexToRgba(theme.colors.success, 0.15),
    } as ViewStyle,

    dangerButton: {
      borderColor: hexToRgba(theme.colors.error, 0.45),
      backgroundColor: hexToRgba(theme.colors.error, 0.15),
    } as ViewStyle,

    secondaryButton: {
      borderColor: subtleBorder,
      backgroundColor: hexToRgba(theme.colors.backgroundSecondary, 0.5),
    } as ViewStyle,

    disabledButton: {
      opacity: 0.5,
    } as ViewStyle,

    // Texte de bouton
    buttonText: {
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '600',
    } as TextStyle,

    buttonTextPrimary: {
      color: theme.colors.primary,
    } as TextStyle,

    buttonTextSuccess: {
      color: theme.colors.success,
    } as TextStyle,

    buttonTextDanger: {
      color: theme.colors.error,
    } as TextStyle,
  });
};

/**
 * Crée les styles de container communs
 */
export const createContainerStyles = (theme: AppTheme) => {
  const { translucentSurface, subtleBorder } = getThemeColors(theme);

  return StyleSheet.create({
    // Card basique
    card: {
      backgroundColor: translucentSurface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: subtleBorder,
      padding: 16,
      elevation: 4,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    } as ViewStyle,

    // Modal overlay
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    } as ViewStyle,

    // Modal content
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: subtleBorder,
    } as ViewStyle,
  });
};

export type ButtonStyles = ReturnType<typeof createButtonStyles>;
export type ContainerStyles = ReturnType<typeof createContainerStyles>;
