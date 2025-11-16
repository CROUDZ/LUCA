/**
 * SignalControls - Composant de contrôle du système de signaux
 *
 * Permet de :
 * - Activer/désactiver la flashlight
 * - Déclencher des signaux manuellement
 * - Voir le statut du système
 */

import React from 'react';
import { logger } from '../utils/logger';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Alert } from 'react-native';
import { setFlashlightState, getFlashlightState } from '../engine/nodes/FlashLightConditionNode';
import { getPingCount } from '../engine/nodes/PingNode';

interface SignalControlsProps {
  visible: boolean;
  triggerNodeIds: number[];
}

const SignalControls: React.FC<SignalControlsProps> = ({ visible, triggerNodeIds }) => {
  const [flashlightOn, setFlashlightOn] = React.useState(false);
  const [pingCount, setPingCount] = React.useState(0);

  // Rafraîchir le compteur de pings périodiquement
  React.useEffect(() => {
    const interval = setInterval(() => {
      setPingCount(getPingCount());
      setFlashlightOn(getFlashlightState());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const toggleFlashlight = () => {
    const newState = !flashlightOn;
    setFlashlightState(newState).catch((err: any) => {
      // Afficher une alerte si la permission est refusée
      try {
        Alert.alert('Permission requise', err?.message || 'Impossible de changer la lampe torche');
      } catch {
        /* ignore */
      }
    });
    setFlashlightOn(newState);
    logger.info('🔦 Flashlight:', newState ? 'ON' : 'OFF');
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="settings-input-component" size={16} color="#8b5cf6" />
        <Text style={styles.headerText}>Signal Controls</Text>
      </View>

      <View style={styles.controls}>
        {/* Flashlight Toggle */}
        <TouchableOpacity
          style={[styles.controlButton, flashlightOn ? styles.flashlightOn : styles.flashlightOff]}
          onPress={toggleFlashlight}
          activeOpacity={0.7}
        >
          <Icon
            name={flashlightOn ? 'flashlight-on' : 'flashlight-off'}
            size={20}
            color="#ffffff"
          />
          <Text style={styles.controlButtonText}>Flashlight {flashlightOn ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Icon name="notifications" size={14} color="#9ca3af" />
          <Text style={styles.statText}>Pings: {pingCount}</Text>
        </View>
        {triggerNodeIds.length > 0 && (
          <View style={styles.statItem}>
            <Icon name="settings-input-component" size={14} color="#9ca3af" />
            <Text style={styles.statText}>Triggers: {triggerNodeIds.length}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f9fafb',
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  flashlightOn: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  flashlightOff: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    borderColor: 'rgba(107, 114, 128, 0.4)',
  },
  triggerButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f9fafb',
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.2)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: '#9ca3af',
  },
});

export default SignalControls;
