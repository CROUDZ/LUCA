/**
 * NodeEditorScreen - Écran d'édition de graphe nodal (VERSION OPTIMISÉE)
 * Utilise les hooks personnalisés pour une meilleure organisation du code
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, TouchableOpacity, Text, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Import des hooks personnalisés
import { useWebViewMessaging } from '../hooks/useWebViewMessaging';
import { useGraphStorage } from '../hooks/useGraphStorage';

// Import des configurations
import { APP_CONFIG } from '../config/constants';
import exampleGraph from '../../exampleGraph.json';
import type { DrawflowExport } from '../types';
import type { RootStackParamList } from '../types/navigation.types';

import styles from './NodeEditorScreenStyles';
import SaveMenu from '../components/SaveMenu';
import SignalControls from '../components/SignalControls';
import { nodeInstanceTracker } from '../engine/NodeInstanceTracker';

// Import du système de signaux
import { parseDrawflowGraph } from '../engine/engine';
import { initializeSignalSystem, resetSignalSystem } from '../engine/SignalSystem';
import { nodeRegistry } from '../engine/NodeRegistry';

type NodeEditorScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NodeEditor'>;

interface NodeEditorScreenProps {
  navigation: NodeEditorScreenNavigationProp;
}

const NodeEditorScreen: React.FC<NodeEditorScreenProps> = ({ navigation }) => {
  // États locaux pour l'UI
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showNewSaveInput, setShowNewSaveInput] = useState(false);
  const [newSaveName, setNewSaveName] = useState('');
  const [currentGraph, setCurrentGraph] = useState<DrawflowExport | null>(null);
  const [triggerNodeIds, setTriggerNodeIds] = useState<number[]>([]);

  // Hook de stockage des graphes
  const {
    saves,
    currentSaveId,
    isLoading,
    createSave,
    deleteSave,
    loadSave,
    autoSave,
    setCurrentSaveId,
  } = useGraphStorage();

  // Hook de communication WebView
  const {
    webRef,
    isReady,
    handleMessage,
    loadGraph,
    addNode,
    requestExport,
    clearGraph: clearWebViewGraph,
  } = useWebViewMessaging({
    onReady: () => {
      console.log('✅ WebView ready');
      // Charger la dernière sauvegarde si disponible
      if (currentSaveId) {
        const save = saves.find((s) => s.id === currentSaveId);
        if (save) {
          loadGraph(save.data);
        }
      }
    },
    onExport: async (data: DrawflowExport) => {
      // Auto-sauvegarde
      await autoSave(data);
      // Mettre à jour le graphe actuel pour le système de signaux
      setCurrentGraph(data);
    },
    onRequestImport: () => {
      // Charger l'exemple
      loadGraph(exampleGraph as DrawflowExport);
    },
  });

  /**
   * Initialiser le système de signaux quand le graphe change
   */
  useEffect(() => {
    if (!currentGraph) return;

    console.log('🔄 Initializing signal system...');

    // Reset le système
    resetSignalSystem();

    // Parser le graphe
    const graph = parseDrawflowGraph(currentGraph);
    console.log(`📊 Parsed graph: ${graph.nodes.size} nodes, ${graph.edges.length} connections`);

    // Initialiser le système avec le graphe
    initializeSignalSystem(graph);

    // Exécuter tous les nœuds pour enregistrer leurs handlers
    let handlersRegistered = 0;
    graph.nodes.forEach((node) => {
      const nodeDef = nodeRegistry.getNode(node.type);
      if (nodeDef) {
        try {
          nodeDef.execute({
            nodeId: node.id,
            inputs: {},
            settings: node.data || {},
          });
          handlersRegistered++;
        } catch (error) {
          console.error(`❌ Error executing node ${node.id} (${node.type}):`, error);
        }
      }
    });

    console.log(`✅ Registered ${handlersRegistered} signal handlers`);

    // Trouver tous les nœuds Trigger
    const triggers = Array.from(graph.nodes.values())
      .filter((n) => n.type === 'input.trigger')
      .map((n) => n.id);
    setTriggerNodeIds(triggers);
    console.log(`🎯 Found ${triggers.length} trigger nodes:`, triggers);
  }, [currentGraph]);

  /**
   * Créer une nouvelle sauvegarde
   */
  const handleCreateSave = useCallback(async () => {
    if (!newSaveName.trim()) {
      Alert.alert('Error', 'Please enter a name for the save');
      return;
    }

    // Demander l'export du graphe actuel
    const success = requestExport();

    if (success) {
      // Attendre un peu pour recevoir les données via onExport
      setTimeout(async () => {
        const save = await createSave(
          newSaveName,
          exampleGraph as DrawflowExport // Sera remplacé par les vraies données
        );

        if (save) {
          setNewSaveName('');
          setShowNewSaveInput(false);
          Alert.alert('Success', `Save "${save.name}" created!`);
        }
      }, 300);
    }
  }, [newSaveName, requestExport, createSave]);

  /**
   * Charger une sauvegarde
   */
  const handleLoadSave = useCallback(
    (saveId: string) => {
      const save = loadSave(saveId);
      if (save) {
        // Reset le tracker avant de charger
        nodeInstanceTracker.reset();
        loadGraph(save.data);
        setShowSaveMenu(false);
        Alert.alert('Loaded', `Loaded "${save.name}"`);
      }
    },
    [loadSave, loadGraph]
  );

  /**
   * Supprimer une sauvegarde
   */
  const handleDeleteSave = useCallback(
    async (saveId: string) => {
      await deleteSave(saveId);
    },
    [deleteSave]
  );

  /**
   * Sauvegarder manuellement
   */
  const handleManualSave = useCallback(() => {
    const success = requestExport();
    if (success) {
      Alert.alert('Saved', 'Graph saved successfully!');
    }
  }, [requestExport]);

  /**
   * Ajouter un nœud
   */
  const handleAddNode = useCallback(
    (nodeType: string) => {
      const x =
        Math.random() * APP_CONFIG.nodes.randomOffsetRange + APP_CONFIG.nodes.defaultPosition.x;
      const y =
        Math.random() * APP_CONFIG.nodes.randomOffsetRange + APP_CONFIG.nodes.defaultPosition.y;

      console.log('➕ Adding node:', nodeType);
      addNode(nodeType, x, y, { type: nodeType });
    },
    [addNode]
  );

  /**
   * Effacer le graphe
   */
  const handleClearGraph = useCallback(() => {
    Alert.alert('Clear Graph', 'Are you sure you want to clear the graph?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearWebViewGraph();
          setCurrentSaveId(null);
          nodeInstanceTracker.reset(); // Reset tous les compteurs
          console.log('🗑️ Graph cleared');
        },
      },
    ]);
  }, [clearWebViewGraph, setCurrentSaveId]);

  /**
   * Nom de la sauvegarde actuelle
   */
  const currentSaveName = useMemo(() => {
    return saves.find((s) => s.id === currentSaveId)?.name || 'Untitled';
  }, [saves, currentSaveId]);

  return (
    <View style={styles.container}>
      {/* WebView avec éditeur nodal */}
      <WebView
        ref={webRef}
        source={{ uri: APP_CONFIG.webview.htmlUri }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        androidLayerType="hardware"
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('❌ WebView error:', nativeEvent);
        }}
        onLoad={() => console.log('📄 WebView loaded')}
      />

      {/* Contrôles du système de signaux */}
      {currentGraph && <SignalControls visible={true} triggerNodeIds={triggerNodeIds} />}

      {/* Contrôles React Native */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, !isReady && styles.buttonDisabled]}
          onPress={() => setShowSaveMenu(true)}
          disabled={!isReady}
        >
          <Icon name="save" size={16} color="#8b5cf6" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Saves</Text>
        </TouchableOpacity>

        {currentSaveId && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSuccess, !isReady && styles.buttonDisabled]}
            onPress={handleManualSave}
            disabled={!isReady}
          >
            <Icon name="check" size={16} color="#10b981" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger, !isReady && styles.buttonDisabled]}
          onPress={handleClearGraph}
          disabled={!isReady}
        >
          <Icon name="delete-outline" size={16} color="#ef4444" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Indicateur de statut */}
      <View style={styles.status}>
        <View style={styles.statusRow}>
          <Icon
            name={isReady ? 'check-circle' : 'sync'}
            size={14}
            color={isReady ? '#10b981' : '#9ca3af'}
          />
          <Text style={[styles.statusText, isReady && styles.statusReady]}>
            {isReady ? 'Ready' : 'Loading...'}
          </Text>
        </View>
        {currentSaveId && (
          <View style={styles.statusRow}>
            <Icon name="folder" size={12} color="#d1d5db" />
            <Text style={styles.currentSaveText}>{currentSaveName}</Text>
          </View>
        )}
      </View>

      {/* Modal Save Menu */}
      <SaveMenu
        visible={showSaveMenu}
        onClose={() => setShowSaveMenu(false)}
        saves={saves}
        currentSaveId={currentSaveId}
        isLoading={isLoading}
        showNewSaveInput={showNewSaveInput}
        newSaveName={newSaveName}
        onShowNewSaveInput={setShowNewSaveInput}
        onNewSaveNameChange={setNewSaveName}
        onCreateSave={handleCreateSave}
        onLoadSave={handleLoadSave}
        onDeleteSave={handleDeleteSave}
      />
      {/* Bouton FAB pour ouvrir le NodePicker */}
      <TouchableOpacity
        style={[styles.fabButton, !isReady && styles.fabButtonDisabled]}
        onPress={() => navigation.navigate('NodePicker', { onAddNode: handleAddNode })}
        disabled={!isReady}
        activeOpacity={0.8}
      >
        <Icon name="add" size={32} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

export default NodeEditorScreen;
