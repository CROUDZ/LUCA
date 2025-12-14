/**
 * RunProgramButton - Bouton de lancement du programme
 *
 * Bouton placé en bas de l'interface qui permet de lancer le programme
 * en déclenchant le trigger unique du graphe.
 *
 * - Grisé et désactivé si aucun Trigger n'est placé
 * - Actif et cliquable si un Trigger est présent
 * - Change d'apparence quand le programme est en cours (signal continu actif)
 * - Connecté au bouton play/stop de la notification
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, View } from 'react-native';
import { useAppTheme } from '../styles/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { hexToRgba } from '../styles/colorUtils';
import { getSignalSystem } from '../engine/SignalSystem';
import { backgroundService } from '../utils/backgroundService';

interface RunProgramButtonProps {
  triggerNodeId: number | null;
  isReady: boolean;
  onRunProgram?: () => void | Promise<void>;
}

const RunProgramButton: React.FC<RunProgramButtonProps> = ({
  triggerNodeId,
  isReady,
  onRunProgram,
}) => {
  const hasTrigger = triggerNodeId !== null;
  const isEnabled = isReady && hasTrigger;

  // État pour savoir si un signal continu est actif
  const [isRunning, setIsRunning] = useState(false);

  // Animation pour le pulse quand le programme est en cours
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Écouter les événements du SignalSystem et du BackgroundService
  useEffect(() => {
    const ss = getSignalSystem();
    if (!ss) return;

    // Vérifier l'état initial
    const checkActiveSignals = () => {
      const stats = ss.getStats();
      const running = stats.activeContinuousSignals > 0;
      setIsRunning(running);
      backgroundService.updateTriggerState(running);
    };

    checkActiveSignals();

    // S'abonner aux événements du SignalSystem
    const unsubStart = ss.subscribeToEvent('signal.continuous.started', 0, () => {
      setIsRunning(true);
      backgroundService.updateTriggerState(true);
    });

    const unsubStop = ss.subscribeToEvent('signal.continuous.stopped', 0, () => {
      // Vérifier s'il reste des signaux actifs
      const stats = ss.getStats();
      if (stats.activeContinuousSignals === 0) {
        setIsRunning(false);
        backgroundService.updateTriggerState(false);
      }
    });

    // Écouter les événements du bouton notification
    const unsubNotif = backgroundService.onTriggerToggle((shouldRun) => {
      if (shouldRun && !isRunning) {
        onRunProgram?.();
      } else if (!shouldRun && isRunning) {
        onRunProgram?.();
      }
    });

    return () => {
      unsubStart();
      unsubStop();
      unsubNotif();
    };
  }, [isReady, isRunning, onRunProgram]);

  // Animation pulse quand le programme est en cours
  useEffect(() => {
    if (isRunning) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
      return undefined;
    }
  }, [isRunning, pulseAnim]);

  // theme-aware styles
  const { theme } = useAppTheme();
  const stylesFromTheme = useMemo(() => {
    const resolvedTheme = theme;
    return {
      iconColor: resolvedTheme.colors.text,
      containerBg: hexToRgba(resolvedTheme.colors.surface, 0.96),
      borderTop: hexToRgba(resolvedTheme.colors.border, 0.7),
      buttonBg: resolvedTheme.colors.primary,
      buttonBgRunning: '#4CAF50', // Vert quand en cours
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
        buttonRunning: {
          backgroundColor: stylesFromTheme.buttonBgRunning,
          shadowColor: stylesFromTheme.buttonBgRunning,
        },
        pulseRing: {
          position: 'absolute',
          width: 70,
          height: 70,
          borderRadius: 35,
          borderWidth: 3,
          borderColor: stylesFromTheme.buttonBgRunning,
          opacity: 0.4,
        },
      }),
    [stylesFromTheme]
  );

  const handlePress = () => {
    if (!isEnabled) return;
    onRunProgram?.();
  };

  if (isEnabled) {
    const buttonStyle = [styles.button, isRunning && styles.buttonRunning];

    const iconName = isRunning ? 'stop' : 'play-arrow';

    return (
      <View
        style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: [{ translateX: -28 }],
          zIndex: 10,
        }}
      >
        {isRunning && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim }],
                borderColor: stylesFromTheme.buttonBgRunning,
              },
            ]}
          />
        )}
        <TouchableOpacity
          style={buttonStyle}
          onPress={handlePress}
          disabled={!isEnabled}
          activeOpacity={0.7}
        >
          <Icon name={iconName} size={48} color={stylesFromTheme.iconColor} />
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

export default RunProgramButton;
