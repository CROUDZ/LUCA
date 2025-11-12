/**
 * Exemple de composant React utilisant le système de signaux
 *
 * Ce composant démontre comment intégrer le système de signaux
 * dans une application React Native.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSignalSystem, useFlashlight, usePingCount } from '../hooks/useSignalSystem';
import type { DrawflowExport } from '../types';

// Graphe d'exemple: Trigger -> FlashLight -> Ping
const exampleGraph: DrawflowExport = {
  drawflow: {
    Home: {
      data: {
        '1': {
          id: 1,
          name: 'Trigger',
          data: { type: 'input.trigger' },
          class: 'trigger-node',
          html: '',
          typenode: false,
          inputs: {},
          outputs: {
            output_1: {
              connections: [{ node: '2', output: 'input_1' }],
            },
          },
          pos_x: 100,
          pos_y: 100,
        },
        '2': {
          id: 2,
          name: 'FlashLight',
          data: { type: 'condition.flashlight' },
          class: 'condition-node',
          html: '',
          typenode: false,
          inputs: {
            input_1: {
              connections: [{ node: '1', input: 'output_1' }],
            },
          },
          outputs: {
            output_1: {
              connections: [{ node: '3', output: 'input_1' }],
            },
          },
          pos_x: 300,
          pos_y: 100,
        },
        '3': {
          id: 3,
          name: 'Ping',
          data: { type: 'action.ping' },
          class: 'action-node',
          html: '',
          typenode: false,
          inputs: {
            input_1: {
              connections: [{ node: '2', input: 'output_1' }],
            },
          },
          outputs: {},
          pos_x: 500,
          pos_y: 100,
        },
      },
    },
  },
};

export default function SignalSystemDemo() {
  const { isInitialized, initSystem, resetSystem, triggerSignal, resetPings, systemStats } =
    useSignalSystem();

  const { isOn: flashlightOn, toggle: toggleFlashlight } = useFlashlight();
  const pingCount = usePingCount();

  // Initialiser le système au montage
  React.useEffect(() => {
    if (!isInitialized) {
      initSystem(exampleGraph);
    }
  }, [isInitialized, initSystem]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Signal System Demo</Text>
        <Text style={styles.subtitle}>Test the signal propagation system</Text>
      </View>

      {/* Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Status</Text>
        <View style={styles.statusContainer}>
          <StatusItem
            label="System"
            value={isInitialized ? 'Initialized' : 'Not initialized'}
            color={isInitialized ? '#4CAF50' : '#F44336'}
          />
          <StatusItem
            label="Flashlight"
            value={flashlightOn ? 'ON' : 'OFF'}
            color={flashlightOn ? '#FFC107' : '#9E9E9E'}
          />
          <StatusItem label="Ping Count" value={pingCount.toString()} color="#2196F3" />
        </View>
      </View>

      {/* System Stats */}
      {systemStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 System Stats</Text>
          <View style={styles.statsContainer}>
            <Text style={styles.statText}>Handlers: {systemStats.registeredHandlers}</Text>
            <Text style={styles.statText}>Queued: {systemStats.queuedSignals}</Text>
            <Text style={styles.statText}>
              Processing: {systemStats.isProcessing ? 'Yes' : 'No'}
            </Text>
          </View>
        </View>
      )}

      {/* Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎮 Controls</Text>

        <ActionButton
          title="💡 Toggle Flashlight"
          subtitle={`Currently: ${flashlightOn ? 'ON' : 'OFF'}`}
          onPress={toggleFlashlight}
          color={flashlightOn ? '#FFC107' : '#757575'}
        />

        <ActionButton
          title="🚀 Trigger Signal"
          subtitle="Send a signal through the graph"
          onPress={() => triggerSignal(1, { demo: true })}
          color="#2196F3"
          disabled={!isInitialized}
        />

        <ActionButton
          title="🔄 Reset Ping Count"
          subtitle={`Current count: ${pingCount}`}
          onPress={resetPings}
          color="#FF9800"
        />

        <ActionButton
          title="🔧 Reset System"
          subtitle="Reinitialize the signal system"
          onPress={() => {
            resetSystem();
            setTimeout(() => initSystem(exampleGraph), 100);
          }}
          color="#F44336"
        />
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ How it works</Text>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionText}>1. Toggle the flashlight ON or OFF</Text>
          <Text style={styles.instructionText}>2. Trigger a signal</Text>
          <Text style={styles.instructionText}>3. If flashlight is ON, signal reaches Ping</Text>
          <Text style={styles.instructionText}>4. If flashlight is OFF, signal is blocked</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Composant pour afficher un item de status
function StatusItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statusItem}>
      <Text style={styles.statusLabel}>{label}</Text>
      <View style={[styles.statusBadge, { backgroundColor: color }]}>
        <Text style={styles.statusValue}>{value}</Text>
      </View>
    </View>
  );
}

// Composant pour un bouton d'action
function ActionButton({
  title,
  subtitle,
  onPress,
  color,
  disabled = false,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        { backgroundColor: color },
        disabled && styles.actionButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={styles.actionButtonTitle}>{title}</Text>
      <Text style={styles.actionButtonSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statusContainer: {
    gap: 10,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  actionButton: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  actionButtonSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  instructionsContainer: {
    gap: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
