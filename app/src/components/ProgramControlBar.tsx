/**
 * ProgramControlBar - Barre de contrôle du programme
 * 
 * Affichage TRÈS VISIBLE de l'état du programme
 * Utilise programState qui persiste même quand le graphe est modifié
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { programState } from '../engine/ProgramState';
import { backgroundService } from '../utils/backgroundService';

interface ProgramControlBarProps {
  triggerNodeId: number | null;
  isReady: boolean;
  onRunProgram: () => void | Promise<void>;
}

const ProgramControlBar: React.FC<ProgramControlBarProps> = ({
  triggerNodeId,
  isReady,
  onRunProgram,
}) => {
  const hasTrigger = triggerNodeId !== null;
  const isEnabled = isReady && hasTrigger;
  
  const [isRunning, setIsRunning] = useState(programState.isRunning);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bgColorAnim = useRef(new Animated.Value(0)).current;
  const borderPulse = useRef(new Animated.Value(0)).current;

  // S'abonner à programState (persiste même quand le graphe change)
  useEffect(() => {
    // S'abonner aux changements d'état du programme
    const unsubscribe = programState.subscribe((running) => {
      console.log(`[ProgramControlBar] programState changed: ${running}`);
      setIsRunning(running);
      backgroundService.updateTriggerState(running);
    });

    // Écouter le bouton de la notification
    const unsubNotif = backgroundService.onTriggerToggle(() => {
      onRunProgram();
    });

    return () => {
      unsubscribe();
      unsubNotif?.();
    };
  }, [onRunProgram]);

  // Animation quand le programme tourne
  useEffect(() => {
    if (isRunning) {
      // Animer la couleur de fond
      Animated.timing(bgColorAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();

      // Pulse continu sur le bouton
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );

      // Pulse de la bordure
      const border = Animated.loop(
        Animated.sequence([
          Animated.timing(borderPulse, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(borderPulse, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      );

      pulse.start();
      border.start();

      return () => {
        pulse.stop();
        border.stop();
      };
    } else {
      Animated.timing(bgColorAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
      pulseAnim.setValue(1);
      borderPulse.setValue(0);
      return undefined;
    }
  }, [isRunning, bgColorAnim, pulseAnim, borderPulse]);

  if (!isReady) return null;

  // Couleurs interpolées
  const backgroundColor = bgColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(30, 30, 40, 0.95)', 'rgba(76, 175, 80, 0.25)'],
  });

  const borderColor = borderPulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(76, 175, 80, 0.5)', 'rgba(76, 175, 80, 1)'],
  });

  return (
    <View style={styles.container}>
      {/* Bandeau TRÈS VISIBLE quand le programme tourne */}
      {isRunning && (
        <Animated.View 
          style={[
            styles.runningBanner,
            { opacity: borderPulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1],
            })}
          ]}
        >
          <Icon name="fiber-manual-record" size={16} color="#FFFFFF" />
          <Text style={styles.runningBannerText}>
            PROGRAMME ACTIF - EN ÉCOUTE
          </Text>
          <Icon name="fiber-manual-record" size={16} color="#FFFFFF" />
        </Animated.View>
      )}

      {/* Barre principale */}
      <Animated.View 
        style={[
          styles.bar,
          { 
            backgroundColor,
            borderColor: isRunning ? borderColor : (hasTrigger ? '#2196F3' : '#666'),
          },
        ]}
      >
        {/* Indicateur de statut */}
        <View style={styles.statusSection}>
          {/* Point lumineux animé */}
          <View style={styles.indicatorWrapper}>
            {isRunning && (
              <Animated.View 
                style={[
                  styles.indicatorGlow,
                  { transform: [{ scale: pulseAnim }] }
                ]} 
              />
            )}
            <View 
              style={[
                styles.indicator,
                isRunning ? styles.indicatorRunning : 
                hasTrigger ? styles.indicatorReady : styles.indicatorDisabled
              ]} 
            />
          </View>

          {/* Texte de statut */}
          <View style={styles.textSection}>
            <Text style={[
              styles.statusText,
              isRunning ? styles.statusTextRunning : 
              hasTrigger ? styles.statusTextReady : styles.statusTextDisabled
            ]}>
              {!hasTrigger 
                ? '⚠️ AUCUN TRIGGER'
                : isRunning 
                  ? '● PROGRAMME EN COURS' 
                  : '○ Programme arrêté'}
            </Text>
            <Text style={styles.helpText}>
              {!hasTrigger 
                ? 'Ajoutez un nœud Trigger'
                : isRunning 
                  ? 'Appuyez pour ARRÊTER'
                  : 'Appuyez pour DÉMARRER'}
            </Text>
          </View>
        </View>

        {/* Gros bouton PLAY/STOP */}
        <TouchableOpacity
          onPress={onRunProgram}
          disabled={!isEnabled}
          activeOpacity={0.7}
          style={styles.buttonTouchable}
        >
          <Animated.View 
            style={[
              styles.playButton,
              isRunning ? styles.playButtonRunning : 
              hasTrigger ? styles.playButtonReady : styles.playButtonDisabled,
              { transform: [{ scale: isRunning ? pulseAnim : 1 }] }
            ]}
          >
            <Icon
              name={isRunning ? 'stop' : 'play-arrow'}
              size={40}
              color="#FFFFFF"
            />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  runningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  runningBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  indicatorWrapper: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  indicatorGlow: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
  },
  indicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  indicatorRunning: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  indicatorReady: {
    backgroundColor: '#2196F3',
  },
  indicatorDisabled: {
    backgroundColor: '#666',
  },
  textSection: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextRunning: {
    color: '#4CAF50',
  },
  statusTextReady: {
    color: '#FFFFFF',
  },
  statusTextDisabled: {
    color: '#999',
  },
  helpText: {
    fontSize: 12,
    color: '#AAA',
    marginTop: 2,
  },
  buttonTouchable: {
    marginLeft: 12,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonRunning: {
    backgroundColor: '#F44336',
    shadowColor: '#F44336',
  },
  playButtonReady: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  playButtonDisabled: {
    backgroundColor: '#555',
    shadowColor: '#000',
  },
});

export default ProgramControlBar;
