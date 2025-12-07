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
import type { DrawflowExport, Graph } from '../types';
import type { RootStackParamList } from '../types/navigation.types';

import createStyles from './NodeEditorScreenStyles';
import { useAppTheme } from '../styles/theme';
import SaveMenu from '../components/SaveMenu';
import RunProgramButton from '../components/RunProgramButton';
import TopControlsBar from '../components/TopControlsBar';
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
import { triggerNode, triggerAll } from '../engine/nodes/TriggerNode';

type NodeEditorScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NodeEditor'>;

interface NodeEditorScreenProps {
  navigation: NodeEditorScreenNavigationProp;
}

type GraphInitResult = {
  graph: Graph;
  triggerIds: number[];
};

type GraphSyncResolver = {
  id: number;
  resolve: (value: GraphInitResult) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const NodeEditorScreen: React.FC<NodeEditorScreenProps> = ({ navigation }) => {
  // États locaux pour l'UI
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const { theme: appTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  const [showNewSaveInput, setShowNewSaveInput] = useState(false);
  const [newSaveName, setNewSaveName] = useState('');
  const [currentGraph, setCurrentGraph] = useState<DrawflowExport | null>(null);
  const [triggerNodeIds, setTriggerNodeIds] = useState<number[]>([]);
  const [hasFlashActionInGraph, setHasFlashActionInGraph] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  const pendingSaveNameRef = useRef<string | null>(null);
  const flashlightEventUnsubscribeRef = useRef<(() => void) | null>(null);
  const pendingGraphSyncResolvers = useRef<GraphSyncResolver[]>([]);

  const resolveGraphSyncWaiters = useCallback((result: GraphInitResult | null) => {
    if (!result || pendingGraphSyncResolvers.current.length === 0) {
      return;
    }

    const waiters = [...pendingGraphSyncResolvers.current];
    pendingGraphSyncResolvers.current = [];
    waiters.forEach(({ resolve, timeout }) => {
      clearTimeout(timeout);
      resolve(result);
    });
  }, []);

  const rejectGraphSyncWaiters = useCallback((error: Error) => {
    if (pendingGraphSyncResolvers.current.length === 0) {
      return;
    }

    const waiters = [...pendingGraphSyncResolvers.current];
    pendingGraphSyncResolvers.current = [];
    waiters.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(error);
    });
  }, []);

  const rebuildSignalSystem = useCallback(
    async (graphData: DrawflowExport | null): Promise<GraphInitResult | null> => {
      if (!graphData) {
        return null;
      }

      logger.info('🔄 Initializing signal system...');

      resetSignalSystem();

      const graph = parseDrawflowGraph(graphData);
      logger.info(
        `📊 Parsed graph: ${graph.nodes.size} nodes, ${graph.edges.length} connection(s)`
      );

      const signalSystem = initializeSignalSystem(graph);
      startMonitoringNativeTorch();
      clearFlashlightAutoEmitRegistry();

      if (flashlightEventUnsubscribeRef.current) {
        flashlightEventUnsubscribeRef.current();
        flashlightEventUnsubscribeRef.current = null;
      }

      if (signalSystem) {
        flashlightEventUnsubscribeRef.current = signalSystem.subscribeToEvent(
          'flashlight.permission.failed',
          0,
          () => {
            logger.info(
              '[NodeEditorScreen] Received flashlight.permission.failed - updating banner state'
            );
            setCameraPermissionGranted(false);
          }
        );
      }

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

      logger.info(`✅ Registered ${handlersRegistered} signal handlers`);

      const graphNodes = Array.from(graph.nodes.values());
      const triggers = graphNodes.filter((n) => n.type === 'input.trigger').map((n) => n.id);
      setTriggerNodeIds(triggers);

      const hasFlashAction = graphNodes.some((n) => n.type === 'action.flashlight');
      setHasFlashActionInGraph(hasFlashAction);

      logger.info(`🎯 Found ${triggers.length} trigger node(s):`, triggers);

      return { graph, triggerIds: triggers };
    },
    [setCameraPermissionGranted, setHasFlashActionInGraph, setTriggerNodeIds]
  );

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

  const handleGraphExport = useCallback(
    async (data: DrawflowExport) => {
      try {
        await autoSave(data);
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

        const result = await rebuildSignalSystem(data);
        if (!result) {
          rejectGraphSyncWaiters(new Error('Graph rebuild produced no result'));
          return;
        }
        resolveGraphSyncWaiters(result);
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        rejectGraphSyncWaiters(normalizedError);
        logger.error('[NodeEditorScreen] Failed to handle graph export', normalizedError);
      }
    },
    [autoSave, createSave, rebuildSignalSystem, resolveGraphSyncWaiters, rejectGraphSyncWaiters]
  );

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
          rebuildSignalSystem(save.data).catch((error) => {
            logger.warn('[NodeEditorScreen] Failed to rebuild graph on ready load', error);
          });
        }
      }
    },
    onExport: handleGraphExport,
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

  const waitForGraphSync = useCallback((): Promise<GraphInitResult> => {
    if (!isReady) {
      return Promise.reject(new Error('WebView not ready'));
    }

    return new Promise<GraphInitResult>((resolve, reject) => {
      const id = Date.now() + Math.random();
      const timeout = setTimeout(() => {
        pendingGraphSyncResolvers.current = pendingGraphSyncResolvers.current.filter(
          (entry) => entry.id !== id
        );
        reject(new Error('Graph export timeout'));
      }, 2000);

      pendingGraphSyncResolvers.current.push({ id, resolve, reject, timeout });

      const success = requestExport();
      if (!success) {
        clearTimeout(timeout);
        pendingGraphSyncResolvers.current = pendingGraphSyncResolvers.current.filter(
          (entry) => entry.id !== id
        );
        reject(new Error('Unable to request graph export'));
      }
    });
  }, [isReady, requestExport]);

  const handleRunProgram = useCallback(async () => {
    if (!isReady || triggerNodeIds.length === 0) {
      return;
    }

    logger.info('🚀 Launching program from', triggerNodeIds.length, 'trigger(s)');

    if (hasFlashActionInGraph) {
      try {
        logger.info(
          '[NodeEditorScreen] Flash action in graph - requesting camera permission if needed'
        );
        const allowed = await ensureCameraPermission();
        if (!allowed) {
          Alert.alert(
            'Permission requise',
            'La permission Caméra est nécessaire pour exécuter votre programme'
          );
          return;
        }
      } catch (error) {
        logger.warn('[NodeEditorScreen] Permission request failed', error);
        return;
      }
    }

    let activeTriggerIds = triggerNodeIds;
    try {
      const result = await waitForGraphSync();
      if (result?.triggerIds?.length) {
        activeTriggerIds = result.triggerIds;
      }
    } catch (error) {
      logger.warn('[NodeEditorScreen] Graph sync before run failed', error);
    }

    const payload = {
      timestamp: Date.now(),
      source: 'run-button',
    };

    let triggeredCount = 0;
    activeTriggerIds.forEach((nodeId) => {
      triggerNode(nodeId, payload);
      triggeredCount += 1;
    });

    if (triggeredCount === 0) {
      logger.warn('[NodeEditorScreen] Aucun trigger ID actif - fallback triggerAll');
      triggerAll(payload);
    } else {
      logger.debug(`[NodeEditorScreen] Emitted ${triggeredCount} trigger(s)`);
    }
  }, [hasFlashActionInGraph, isReady, triggerNodeIds, waitForGraphSync]);

  // Show a small banner if FlashLight nodes present and permission denied

  useEffect(() => {
    (async () => {
      try {
        const hasFlashAction = currentGraph
          ? Array.from(parseDrawflowGraph(currentGraph).nodes.values()).some(
              (n) => n.type === 'action.flashlight'
            )
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
  }, [currentGraph, setCameraPermissionGranted]);

  // Ajouter un log pour vérifier les settings des nodes après export
  useEffect(() => {
    if (!currentGraph) return;
    try {
      const nodes = currentGraph.drawflow?.Home?.data || {};
      Object.keys(nodes).forEach((id) => {
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
        rebuildSignalSystem(save.data).catch((error) => {
          logger.error('[NodeEditorScreen] Failed to rebuild graph after load', error);
        });
        setShowSaveMenu(false);
        Alert.alert('Loaded', `Loaded "${save.name}"`);
      }
    },
    [loadSave, loadGraph, rebuildSignalSystem]
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
              Alert.alert(
                'Permission requise',
                'LUCA a besoin de la permission Caméra pour utiliser FlashLight nodes.'
              );
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
          setCurrentGraph(null);
          setTriggerNodeIds([]);
          setHasFlashActionInGraph(false);
          flashlightEventUnsubscribeRef.current?.();
          flashlightEventUnsubscribeRef.current = null;
          resetSignalSystem();
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

  useEffect(() => {
    return () => {
      flashlightEventUnsubscribeRef.current?.();
      rejectGraphSyncWaiters(new Error('NodeEditorScreen unmounted'));
      resetSignalSystem();
    };
  }, [rejectGraphSyncWaiters]);

  return (
    <View style={styles.container}>
      {cameraPermissionGranted === false && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            LUCA needs Camera permission to use FlashLight nodes
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              try {
                const granted = await ensureCameraPermission();
                setCameraPermissionGranted(granted);
                if (!granted) {
                  Alert.alert(
                    'Permission requise',
                    'LUCA needs Camera permission to use FlashLight nodes'
                  );
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
          onRunProgram={handleRunProgram}
        />
      )}

      {/* Barre de contrôles supérieure */}
      <TopControlsBar
        isReady={isReady}
        currentSaveId={currentSaveId}
        currentSaveName={currentSaveName}
        onOpenSaveMenu={() => setShowSaveMenu(true)}
        onManualSave={handleManualSave}
        onClearGraph={handleClearGraph}
      />

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

      {/* Bouton Bibliothèque de Mods */}
      <TouchableOpacity
        style={styles.modLibraryButton}
        onPress={() => navigation.navigate('ModLibrary')}
        activeOpacity={0.8}
      >
        <Icon name="extension" size={24} color="#ffffff" />
        <Text style={styles.modLibraryButtonText}>Mods</Text>
      </TouchableOpacity>
    </View>
  );
};

export default NodeEditorScreen;
