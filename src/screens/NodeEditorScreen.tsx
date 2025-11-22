/**
 * NodeEditorScreen - Écran d'édition de graphe nodal (VERSION OPTIMISÉE)
 * Utilise les hooks personnalisés pour une meilleure organisation du code
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Import des hooks personnalisés
import { useWebViewMessaging } from '../hooks/useWebViewMessaging';
import { useGraphStorage } from '../hooks/useGraphStorage';

// Import des configurations
import { APP_CONFIG } from '../config/constants';
import type { DrawflowExport } from '../types';
import type { RootStackParamList } from '../types/navigation.types';

import styles from './NodeEditorScreenStyles';
import SaveMenu from '../components/SaveMenu';
import RunProgramButton from '../components/RunProgramButton';
import { nodeInstanceTracker } from '../engine/NodeInstanceTracker';
import { subscribeNodeAdded } from '../utils/NodePickerEvents';
import { logger } from '../utils/logger';

// Import du système de signaux
import { parseDrawflowGraph } from '../engine/engine';
import {
  ensureCameraPermission,
  hasCameraPermission,
  clearFlashlightAutoEmitRegistry,
  startMonitoringNativeTorch,
} from '../engine/nodes/FlashLightConditionNode';
import { initializeSignalSystem, resetSignalSystem, getSignalSystem } from '../engine/SignalSystem';
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
  const [hasFlashActionInGraph, setHasFlashActionInGraph] = useState(false);
  const pendingSaveNameRef = useRef<string | null>(null);

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
      logger.debug('✅ WebView ready');
      // Charger la dernière sauvegarde si disponible
      if (currentSaveId) {
        const save = saves.find((s) => s.id === currentSaveId);
        if (save) {
          loadGraph(save.data);
          setCurrentGraph(save.data);
        }
      }
    },
    onExport: async (data: DrawflowExport) => {
      // Auto-sauvegarde
      await autoSave(data);
      // Mettre à jour le graphe actuel pour le système de signaux
      setCurrentGraph(data);

      if (pendingSaveNameRef.current) {
        const saveName = pendingSaveNameRef.current;
        pendingSaveNameRef.current = null;

        try {
          const save = await createSave(saveName, data);
          if (save) {
            setNewSaveName('');
            setShowNewSaveInput(false);
            Alert.alert('Success', `Save "${save.name}" created!`);
          } else {
            Alert.alert('Error', 'Failed to create save.');
          }
        } catch (error) {
          logger.error('Failed to finalize save creation', error);
          Alert.alert('Error', 'Failed to create save.');
        }
      }
    },
    onNodeSettingsChanged: (payload) => {
      try {
        logger.debug('[WebView] Node settings changed:', payload);
        const { nodeId, settings } = payload || {};
        if (!nodeId) return;
        const graph = parseDrawflowGraph(currentGraph || { drawflow: { Home: { data: {} } } });
  const node = graph.nodes.get(Number(nodeId));
  // If not present in graph yet, fall back to nodeType coming from the webview
  const nodeType = (node && node.type) || payload?.nodeType;
  if (!node && !nodeType) return;
  const nodeDef = nodeRegistry.getNode(nodeType || node?.type);
        const ss = getSignalSystem();
        if (ss) {
          // Unregister existing handler and re-register with new settings
          const numericId = Number(nodeId);
          ss.unregisterHandler(numericId);
          // Also unsubscribe from any event subscriptions this node had
          if (typeof ss.unsubscribeNode === 'function') ss.unsubscribeNode(numericId);
        }
        if (nodeDef) {
          const numericId = Number(nodeId);
          const resolvedSettings = {
            ...(nodeDef.defaultSettings || {}),
            ...(node?.data?.settings || node?.data || {}),
            ...(settings || {}),
          };
          const inputsCount = node?.inputs?.length ?? 0;

          nodeDef.execute({
            nodeId: numericId,
            inputs: {},
            inputsCount,
            settings: resolvedSettings,
            log: (message: string) => {
              logger.debug(`[Node ${numericId}] ${message}`);
            },
          });
          logger.info(`[NodeEditorScreen] Re-registered node ${numericId} after settings change`);
        }
      } catch (err) {
        logger.error('Failed to handle node setting change:', err);
      }
    },
  });

  /**
   * Initialiser le système de signaux quand le graphe change
   */
  useEffect(() => {
    const ss = getSignalSystem();
    let unsubscribe: (() => void) | null = null;
    if (ss) {
      unsubscribe = ss.subscribeToEvent('flashlight.permission.failed', 0, () => {
        logger.info('[NodeEditorScreen] Received flashlight.permission.failed - updating banner state');
        setCameraPermissionGranted(false);
      });
    }
  if (!currentGraph) return;

  logger.debug('🔄 Initializing signal system...');

    // Reset le système
    resetSignalSystem();

    // Parser le graphe
    const graph = parseDrawflowGraph(currentGraph);
  logger.debug(`📊 Parsed graph: ${graph.nodes.size} nodes, ${graph.edges.length} connections`);

    // Initialiser le système avec le graphe
    initializeSignalSystem(graph);
  startMonitoringNativeTorch();

  // Exécuter tous les nœuds pour enregistrer leurs handlers
  clearFlashlightAutoEmitRegistry();
    let handlersRegistered = 0;
    graph.nodes.forEach((node) => {
      const nodeDef = nodeRegistry.getNode(node.type);
      if (nodeDef) {
        try {
          const resolvedSettings = {
            ...(nodeDef.defaultSettings || {}),
            ...(node.data?.settings || node.data || {}),
          };

          nodeDef.execute({
            nodeId: node.id,
            inputs: {},
            inputsCount: node.inputs.length,
            settings: resolvedSettings,
            log: (message: string) => {
              logger.debug(`[Node ${node.id}] ${message}`);
            },
          });
          handlersRegistered++;
        } catch (error) {
          logger.error(`❌ Error executing node ${node.id} (${node.type}):`, error);
        }
      }
    });

  logger.debug(`✅ Registered ${handlersRegistered} signal handlers`);

    // Do NOT request permission on graph initialization. We'll show a UI banner
    // linking to the permission flow instead. Permission requests should happen
    // as part of explicit user actions (e.g., pressing Run, toggling flashlight
    // in SignalControls, or firing a trigger with FlashLightAction).

    // Trouver tous les nœuds Trigger
    const graphNodes = Array.from(graph.nodes.values());
    const triggers = graphNodes.filter((n) => n.type === 'input.trigger').map((n) => n.id);
    setTriggerNodeIds(triggers);

    const hasFlashAction = graphNodes.some((n) => n.type === 'action.flashlight');
    setHasFlashActionInGraph(hasFlashAction);

  logger.debug(`🎯 Found ${triggers.length} trigger nodes:`, triggers);
  return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [currentGraph]);

  // Show a small banner if FlashLight nodes present and permission denied
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const hasFlashAction = currentGraph
          ? Array.from(parseDrawflowGraph(currentGraph).nodes.values()).some(n => n.type === 'action.flashlight')
          : false;

        if (hasFlashAction) {
          const perm = await hasCameraPermission();
          setCameraPermissionGranted(perm);
        } else {
          setCameraPermissionGranted(null);
        }
      } catch (e) {
        logger.warn('[NodeEditorScreen] Error checking camera permission for banner', e);
      }
    })();
  }, [currentGraph]);

  // Ajouter un log pour vérifier les settings des nodes après export
  useEffect(() => {
    if (!currentGraph) return;
    try {
      const nodes = currentGraph.drawflow?.Home?.data || {};
      Object.keys(nodes).forEach(id => {
        const n = nodes[id];
        if ((n.class || '').includes('condition-node') || (n.class || '').includes('condition')) {
          logger.debug(`[Web to RN] Node ${id} settings:`, n.data?.settings || n.data || {});
        }
      });
    } catch (e) {
      logger.warn('Failed to inspect currentGraph debug settings', e);
    }
  }, [currentGraph]);

  /**
   * Créer une nouvelle sauvegarde
   */
  const handleCreateSave = useCallback(async () => {
    if (pendingSaveNameRef.current) {
      Alert.alert('Please wait', 'A save is already being created.');
      return;
    }

    if (!newSaveName.trim()) {
      Alert.alert('Error', 'Please enter a name for the save');
      return;
    }

    // Demander l'export du graphe actuel
    const success = requestExport();

    if (success) {
      pendingSaveNameRef.current = newSaveName.trim();
    } else {
      Alert.alert('Error', 'Unable to export the graph. Please try again.');
    }
  }, [newSaveName, requestExport]);

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
        setCurrentGraph(save.data);
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

  logger.info('➕ Adding node:', nodeType);
      addNode(nodeType, x, y, { type: nodeType });
      
      // Forcer l'export après ajout pour mettre à jour le graphe
      setTimeout(() => {
        requestExport();
      }, 300);
    },
    [addNode, requestExport]
  );

    // Subscribe to NodePicker events instead of passing callback through navigation params
    useEffect(() => {
      const unsubscribe = subscribeNodeAdded((nodeType: string) => {
        handleAddNode(nodeType);

        // Si l'utilisateur ajoute une node FlashLight action, demander la permission
        if (nodeType === 'action.flashlight') {
          (async () => {
            try {
              const granted = await ensureCameraPermission();
              if (!granted) {
                Alert.alert('Permission requise', 'LUCA a besoin de la permission Caméra pour utiliser FlashLight nodes.');
              }
            } catch (e) {
              logger.warn('[NodeEditorScreen] ensureCameraPermission on node add failed', e);
            }
          })();
        }
      });
      return unsubscribe;
    }, [handleAddNode]);

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
          logger.info('🗑️ Graph cleared');
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
      {cameraPermissionGranted === false && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>LUCA needs Camera permission to use FlashLight nodes</Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              try {
                const granted = await ensureCameraPermission();
                setCameraPermissionGranted(granted);
                if (!granted) {
                  Alert.alert('Permission requise', 'LUCA needs Camera permission to use FlashLight nodes');
                }
              } catch (e) {
                logger.error('[NodeEditorScreen] Permission request failed', e);
                Alert.alert('Error', 'Permission request failed');
              }
            }}
          >
            <Text style={styles.permissionButtonText}>Request permission</Text>
          </TouchableOpacity>
        </View>
      )}
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
          logger.error('❌ WebView error:', nativeEvent);
        }}
  onLoad={() => logger.debug('📄 WebView loaded')}
      />

    {/* Signal controls removed - manual flashlight toggling is handled elsewhere */}

      {/* Bouton Run Program en bas de l'écran - uniquement si un Trigger node est présent */}
      {triggerNodeIds.length > 0 && (
        <RunProgramButton
          triggerNodeIds={triggerNodeIds}
          isReady={isReady}
          hasFlashAction={hasFlashActionInGraph}
        />
      )}

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
  onPress={() => navigation.navigate('NodePicker')}
        disabled={!isReady}
        activeOpacity={0.8}
      >
        <Icon name="add" size={32} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

export default NodeEditorScreen;

