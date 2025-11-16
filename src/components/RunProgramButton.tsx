/**
 * RunProgramButton - Bouton de lancement du programme
 *
 * Bouton placé en bas de l'interface qui permet de lancer le programme
 * en déclenchant tous les nodes Trigger du graphe.
 *
 * - Grisé et désactivé si aucun Trigger n'est placé
 * - Actif et cliquable si au moins un Trigger est présent
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { triggerAll } from '../engine/nodes/TriggerNode';
import { logger } from '../utils/logger';

interface RunProgramButtonProps {
  triggerNodeIds: number[];
  isReady: boolean;
}

const RunProgramButton: React.FC<RunProgramButtonProps> = ({ triggerNodeIds, isReady }) => {
  const hasTriggers = triggerNodeIds.length > 0;
  const isEnabled = isReady && hasTriggers;

  const handlePress = () => {
    if (!isEnabled) return;

  logger.info('🚀 Launching program from', triggerNodeIds.length, 'trigger(s)');
    
    // Déclencher tous les triggers avec un timestamp
    triggerAll({
      timestamp: Date.now(),
      source: 'run-button',
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          !isEnabled && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        disabled={!isEnabled}
        activeOpacity={0.7}
      >
        <Icon
          name="play-circle-filled"
          size={24}
          color={isEnabled ? '#ffffff' : '#9ca3af'}
        />
        <Text style={[styles.buttonText, !isEnabled && styles.buttonTextDisabled]}>
          {hasTriggers
            ? `Run Program (${triggerNodeIds.length} Trigger${triggerNodeIds.length > 1 ? 's' : ''})`
            : 'No Trigger Node'}
        </Text>
      </TouchableOpacity>
      
      {!hasTriggers && (
        <Text style={styles.hint}>
          Add a Trigger node to run your program
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    elevation: 4,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#374151',
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#9ca3af',
  },
  hint: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default RunProgramButton;
