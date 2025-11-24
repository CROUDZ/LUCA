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
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../styles/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { hexToRgba } from '../styles/colorUtils';
import { triggerAll } from '../engine/nodes/TriggerNode';
import { Alert } from 'react-native';
import { logger } from '../utils/logger';

interface RunProgramButtonProps {
  triggerNodeIds: number[];
  isReady: boolean;
  hasFlashAction?: boolean;
}

const RunProgramButton: React.FC<RunProgramButtonProps> = ({ triggerNodeIds, isReady, hasFlashAction }) => {
  const hasTriggers = triggerNodeIds.length > 0;
  const isEnabled = isReady && hasTriggers;

  // theme-aware styles
  const { theme } = useAppTheme();
  const stylesFromTheme = useMemo(() => {
    const resolvedTheme = theme;
    const isDark = resolvedTheme.mode === 'dark';
    return {
      iconColor: isEnabled ? resolvedTheme.colors.text : resolvedTheme.colors.textMuted,
      containerBg: hexToRgba(resolvedTheme.colors.surface, isDark ? 0.96 : 0.92),
      borderTop: hexToRgba(resolvedTheme.colors.border, 0.7),
      buttonBg: isEnabled
        ? resolvedTheme.colors.primary
        : hexToRgba(resolvedTheme.colors.backgroundSecondary, 0.85),
      buttonShadow: isEnabled ? resolvedTheme.colors.primarySoft : resolvedTheme.colors.shadow,
      textColor: isEnabled ? resolvedTheme.colors.text : resolvedTheme.colors.textSecondary,
      hintColor: resolvedTheme.colors.textMuted,
    };
  }, [isEnabled, theme]);

  const handlePress = () => {
    if (!isEnabled) return;

  logger.info('🚀 Launching program from', triggerNodeIds.length, 'trigger(s)');
    
    // Si graph contient une FlashLight action, vérifier les permissions
  (async () => {
      if (hasFlashAction) {
        try {
          const { ensureCameraPermission } = require('../engine/nodes/FlashLightConditionNode');
          logger.info('[RunProgramButton] Flash action in graph - requesting camera permission if needed');
          const allowed = await ensureCameraPermission();
          if (!allowed) {
            // Permission was not granted; let the action emit the specific failure event and/or
            // show the UI banner. We don't block here because the FlashLightAction will
            // prompt on its own; however we return to let the user grant permission.
            Alert.alert('Permission requise', 'La permission Caméra est nécessaire pour exécuter votre programme');
            return;
          }
        } catch (e) {
          logger.warn('[RunProgramButton] Permission request failed', e);
          return;
        }
  }

      // Déclencher tous les triggers avec un timestamp
      triggerAll({
      timestamp: Date.now(),
      source: 'run-button',
    });
    })();
  };

  return (
    <View style={[styles.container, { backgroundColor: stylesFromTheme.containerBg, borderTopColor: stylesFromTheme.borderTop }]}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: stylesFromTheme.buttonBg, shadowColor: stylesFromTheme.buttonShadow },
          !isEnabled && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        disabled={!isEnabled}
        activeOpacity={0.7}
      >
        <Icon name="play-circle-filled" size={24} color={stylesFromTheme.iconColor} />
        <Text style={[styles.buttonText, !isEnabled && styles.buttonTextDisabled, { color: stylesFromTheme.textColor }] }>
          {hasTriggers
            ? `Run Program (${triggerNodeIds.length} Trigger${triggerNodeIds.length > 1 ? 's' : ''})`
            : 'No Trigger Node'}
        </Text>
      </TouchableOpacity>
      
      {!hasTriggers && <Text style={[styles.hint, { color: stylesFromTheme.hintColor }]}>Add a Trigger node to run your program</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
    opacity: 0.65,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    opacity: 0.75,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default RunProgramButton;
