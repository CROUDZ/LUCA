/**
 * RunProgramButton - Bouton de lancement du programme
 *
 * Bouton placé en bas de l'interface qui permet de lancer le programme
 * en déclenchant tous les nodes Trigger du graphe.
 *
 * - Grisé et désactivé si aucun Trigger n'est placé
 * - Actif et cliquable si au moins un Trigger est présent
 */

import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme } from '../styles/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { hexToRgba } from '../styles/colorUtils';

interface RunProgramButtonProps {
  triggerNodeIds: number[];
  isReady: boolean;
  onRunProgram?: () => void | Promise<void>;
}

const RunProgramButton: React.FC<RunProgramButtonProps> = ({
  triggerNodeIds,
  isReady,
  onRunProgram,
}) => {
  const hasTriggers = triggerNodeIds.length > 0;
  const isEnabled = isReady && hasTriggers;

  // theme-aware styles
  const { theme } = useAppTheme();
  const stylesFromTheme = useMemo(() => {
    const resolvedTheme = theme;
    return {
      iconColor: resolvedTheme.colors.text,
      containerBg: hexToRgba(resolvedTheme.colors.surface, 0.96),
      borderTop: hexToRgba(resolvedTheme.colors.border, 0.7),
      buttonBg: resolvedTheme.colors.primary,
      buttonShadow: resolvedTheme.colors.primarySoft,
      textColor: resolvedTheme.colors.text,
      hintColor: resolvedTheme.colors.textMuted,
    };
  }, [theme]);

  // build component styles using theme values so they are available at render
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: [{ translateX: -28 }],
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: stylesFromTheme.buttonBg,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: stylesFromTheme.buttonShadow,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 6, // Android shadow
          zIndex: 10,
        },
      }),
    [stylesFromTheme]
  );

  const handlePress = () => {
    if (!isEnabled) return;
    onRunProgram?.();
  };

  if (isEnabled) {
    return (
      <TouchableOpacity
        style={[styles.button]}
        onPress={handlePress}
        disabled={!isEnabled}
        activeOpacity={0.7}
      >
        <Icon name="play-arrow" size={48} color={stylesFromTheme.iconColor} />
      </TouchableOpacity>
    );
  }

  return null;
};

export default RunProgramButton;
