/**
 * TopControlsBar - Barre de contrôles supérieure pour l'éditeur de nœuds
 * Gère les boutons Saves, Save, Clear et l'affichage du statut
 * Version responsive avec adaptation automatique aux différentes tailles d'écran
 */

import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppTheme, type AppTheme } from '../styles/theme';
import { hexToRgba } from '../styles/colorUtils';

// Seuils de largeur d'écran pour le mode compact
const COMPACT_THRESHOLD = 360;
const MEDIUM_THRESHOLD = 400;

interface TopControlsBarProps {
  /** Indique si la WebView est prête */
  isReady: boolean;
  /** ID de la sauvegarde actuelle */
  currentSaveId: string | null;
  /** Nom de la sauvegarde actuelle */
  currentSaveName: string;
  /** Callback pour ouvrir le menu de sauvegarde */
  onOpenSaveMenu: () => void;
  /** Callback pour sauvegarder manuellement */
  onManualSave: () => void;
  /** Callback pour effacer le graphe */
  onClearGraph: () => void;
}

const TopControlsBar: React.FC<TopControlsBarProps> = ({
  isReady,
  currentSaveId,
  currentSaveName,
  onOpenSaveMenu,
  onManualSave,
  onClearGraph,
}) => {
  const { theme: appTheme } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  
  // Déterminer le mode d'affichage selon la largeur d'écran
  const isCompact = screenWidth < COMPACT_THRESHOLD;
  const isMedium = screenWidth >= COMPACT_THRESHOLD && screenWidth < MEDIUM_THRESHOLD;
  
  const styles = useMemo(
    () => createStyles(appTheme, isCompact, isMedium),
    [appTheme, isCompact, isMedium]
  );

  return (
    <View style={styles.container}>
      {/* Section gauche: Statut */}
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <Icon
            name={isReady ? 'check-circle' : 'sync'}
            size={isCompact ? 12 : 14}
            color={isReady ? appTheme.colors.success : appTheme.colors.textSecondary}
          />
          <Text style={[styles.statusText, isReady && styles.statusReady]}>
            {isReady ? 'Ready' : 'Loading...'}
          </Text>
        </View>
        {currentSaveId && (
          <View style={styles.statusRow}>
            <Icon name="folder" size={isCompact ? 10 : 12} color={appTheme.colors.text} />
            <Text style={styles.currentSaveText} numberOfLines={1} ellipsizeMode="tail">
              {currentSaveName}
            </Text>
          </View>
        )}
      </View>

      {/* Section droite: Boutons de contrôle */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, !isReady && styles.buttonDisabled]}
          onPress={onOpenSaveMenu}
          disabled={!isReady}
          activeOpacity={0.7}
        >
          <Icon
            name="save"
            size={isCompact ? 14 : 16}
            color={appTheme.colors.primary}
            style={styles.buttonIcon}
          />
          {!isCompact && <Text style={styles.buttonText}>Saves</Text>}
        </TouchableOpacity>

        {currentSaveId && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSuccess, !isReady && styles.buttonDisabled]}
            onPress={onManualSave}
            disabled={!isReady}
            activeOpacity={0.7}
          >
            <Icon
              name="check"
              size={isCompact ? 14 : 16}
              color={appTheme.colors.success}
              style={styles.buttonIcon}
            />
            {!isCompact && <Text style={styles.buttonText}>Save</Text>}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger, !isReady && styles.buttonDisabled]}
          onPress={onClearGraph}
          disabled={!isReady}
          activeOpacity={0.7}
        >
          <Icon
            name="delete-outline"
            size={isCompact ? 14 : 16}
            color={appTheme.colors.error}
            style={styles.buttonIcon}
          />
          {!isCompact && <Text style={styles.buttonText}>Clear</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme, isCompact: boolean, isMedium: boolean) => {
  const translucentSurface = hexToRgba(theme.colors.surface, theme.mode === 'dark' ? 0.94 : 0.9);
  const subtleBorder = hexToRgba(theme.colors.border, 0.7);

  // Tailles adaptatives
  const buttonPaddingH = isCompact ? 10 : isMedium ? 12 : 14;
  const buttonPaddingV = isCompact ? 6 : 8;
  const statusPaddingH = isCompact ? 8 : 12;
  const statusPaddingV = isCompact ? 6 : 8;
  const buttonGap = isCompact ? 4 : 8;
  const containerGap = isCompact ? 6 : 10;

  return StyleSheet.create({
    container: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      zIndex: 1000,
      gap: containerGap,
    },
    statusContainer: {
      backgroundColor: translucentSurface,
      paddingHorizontal: statusPaddingH,
      paddingVertical: statusPaddingV,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: subtleBorder,
      gap: 4,
      flexShrink: 1,
      minWidth: 0,
      maxWidth: isCompact ? '35%' : '45%',
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isCompact ? 4 : 6,
    },
    statusText: {
      fontSize: isCompact ? 10 : 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    statusReady: {
      color: theme.colors.success,
    },
    currentSaveText: {
      fontSize: isCompact ? 9 : 11,
      color: theme.colors.text,
      fontWeight: '500',
      flexShrink: 1,
    },
    controlsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: buttonGap,
      flexShrink: 0,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: buttonPaddingH,
      paddingVertical: buttonPaddingV,
      borderRadius: isCompact ? 10 : 12,
      backgroundColor: translucentSurface,
      borderWidth: 1,
      borderColor: subtleBorder,
      gap: isCompact ? 0 : 6,
      elevation: 4,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      minWidth: isCompact ? 36 : undefined,
      minHeight: isCompact ? 36 : undefined,
    },
    buttonPrimary: {
      borderColor: hexToRgba(theme.colors.primary, 0.6),
      backgroundColor: hexToRgba(theme.colors.primary, 0.12),
    },
    buttonSuccess: {
      borderColor: hexToRgba(theme.colors.success, 0.45),
      backgroundColor: hexToRgba(theme.colors.success, 0.15),
    },
    buttonDanger: {
      borderColor: hexToRgba(theme.colors.error, 0.45),
      backgroundColor: hexToRgba(theme.colors.error, 0.15),
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonIcon: {
      marginRight: isCompact ? 0 : 2,
    },
    buttonText: {
      color: theme.colors.text,
      fontSize: isMedium ? 12 : 13,
      fontWeight: '600',
    },
  });
};

export default TopControlsBar;
