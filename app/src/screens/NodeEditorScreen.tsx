/**
 * NodeEditorScreen - Écran d'édition de graphe nodal (VERSION OPTIMISÉE)
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, Alert, DeviceEventEmitter, AppState, AppStateStatus } from 'react-native';
import { WebView } from 'react-native-webview';

import { useWebViewMessaging } from '../hooks/useWebViewMessaging';
import { backgroundService } from '../utils/backgroundService';
import { settingsManager } from '../utils/settingsManager';
import { useGraphStorage } from '../hooks/useGraphStorage';
import { APP_CONFIG } from '../config/constants';
import type { DrawflowExport, Graph, NodeSettingsMap } from '../types';
import type { RootStackParamList } from '../types/navigation.types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { useTheme } from '../theme';
import SaveMenu from '../components/SaveMenu';
import BottomControlsBar from '../components/BottomControlsBar';
import TopControlsBar from '../components/TopControlsBar';
import { nodeInstanceTracker } from '../engine/NodeInstanceTracker';
import { subscribeNodeAdded } from '../utils/NodePickerEvents';
import { signalVisualizationBridge } from '../utils/signalVisualizationBridge';
import { parseDrawflowGraph } from '../engine/engine';
import {
  ensureCameraPermission,
  hasCameraPermission,
  clearFlashlightAutoEmitRegistry,
  startMonitoringNativeTorch,
} from '../engine/nodes/condition/FlashLightConditionNode';
import { initializeSignalSystem, resetSignalSystem, getSignalSystem } from '../engine/SignalSystem';
import { nodeRegistry } from '../engine/NodeRegistry';
import { triggerNode } from '../engine/nodes/controle/TriggerNode';
import { programState } from '../engine/ProgramState';
import { setNodeCardTheme } from '../engine/nodes/nodeCard';

type NodeEditorScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NodeEditor'>;

type NodeEditorScreenRouteProp = RouteProp<RootStackParamList, 'NodeEditor'>;

interface NodeEditorScreenProps {
  navigation: NodeEditorScreenNavigationProp;
  route: NodeEditorScreenRouteProp;
}

type GraphInitResult = { graph: Graph; triggerIds: number[] };
type GraphSyncResolver = {
  id: number;
  resolve: (value: GraphInitResult) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const NodeEditorScreen: React.FC<NodeEditorScreenProps> = ({ navigation, route }) => {
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showNewSaveInput, setShowNewSaveInput] = useState(false);
  const [newSaveName, setNewSaveName] = useState('');
  const [currentGraph, setCurrentGraph] = useState<DrawflowExport | null>(null);
  const [triggerNodeId, setTriggerNodeId] = useState<number | null>(null);
  const [hasFlashActionInGraph, setHasFlashActionInGraph] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);

  const { theme: appTheme } = useTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  const pendingSaveNameRef = useRef<string | null>(null);
  const flashlightEventUnsubRef = useRef<(() => void) | null>(null);
  const graphSyncResolvers = useRef<GraphSyncResolver[]>([]);
  const lastGraphHashRef = useRef<string | null>(null);
  const nodeSettingsRef = useRef<Map<number, Record<string, any>>>(new Map());
  const nodeInputsRef = useRef<Map<number, Record<string, any>>>(new Map());
  const isRebuildingRef = useRef(false);
  const settingsChangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const resolveGraphSync = useCallback((result: GraphInitResult | null) => {
    if (!result || !graphSyncResolvers.current.length) return;
    const waiters = [...graphSyncResolvers.current];
    graphSyncResolvers.current = [];
    waiters.forEach(({ resolve, timeout }) => {
      clearTimeout(timeout);
      resolve(result);
    });
  }, []);

  const rejectGraphSync = useCallback((error: Error) => {
    if (!graphSyncResolvers.current.length) return;
    const waiters = [...graphSyncResolvers.current];
    graphSyncResolvers.current = [];
    waiters.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(error);
    });
  }, []);

  const rebuildSignalSystem = useCallback(
    async (graphData: DrawflowExport | null, force = false, preserveSettings = false): Promise<GraphInitResult | null> => {
      if (!graphData) return null;

      // Sauvegarder les settings actuels si on veut les préserver
      const previousSettings = preserveSettings ? new Map(nodeSettingsRef.current) : null;
      const previousInputs = preserveSettings ? new Map(nodeInputsRef.current) : null;

      // Reset cached state so runtime inputs/settings stay in sync with the latest graph
      nodeSettingsRef.current.clear();
      nodeInputsRef.current.clear();

      // Éviter les appels concurrents
      if (isRebuildingRef.current) {
        return null;
      }

      // Créer un hash simple du graphe pour détecter les changements
      const graphHash = JSON.stringify(graphData);

      // Ne pas reconstruire si le graphe n'a pas changé (sauf si forcé)
      if (!force && lastGraphHashRef.current === graphHash && getSignalSystem()) {
        const graph = parseDrawflowGraph(graphData);
        const graphNodes = Array.from(graph.nodes.values());
        const triggers = graphNodes.filter((n) => n.type === 'input.trigger').map((n) => n.id);
        return { graph, triggerIds: triggers };
      }

      isRebuildingRef.current = true;

      try {
        resetSignalSystem();
        const graph = parseDrawflowGraph(graphData);
        const signalSystem = initializeSignalSystem(graph);

        lastGraphHashRef.current = graphHash;

        try {
          DeviceEventEmitter.emit?.('signalsystem.initialized', { timestamp: Date.now() });
        } catch {}

        startMonitoringNativeTorch();
        clearFlashlightAutoEmitRegistry();

        flashlightEventUnsubRef.current?.();
        flashlightEventUnsubRef.current = null;

        if (signalSystem) {
          flashlightEventUnsubRef.current = signalSystem.subscribeToEvent(
            'flashlight.permission.failed',
            0,
            () => setCameraPermissionGranted(false)
          );
        }

        graph.nodes.forEach((node) => {
          const nodeDef = nodeRegistry.getNode(node.type);
          if (!nodeDef) return;

          try {
            // Utiliser les settings préservés s'ils existent, sinon utiliser ceux du graphe/défaut
            const preservedSettings = previousSettings?.get(node.id);
            const preservedInputs = previousInputs?.get(node.id);

            const settings = preservedSettings || {
              ...(nodeDef.defaultSettings || {}),
              ...(node.data?.settings || node.data || {}),
            };

            const inputs = preservedInputs || {};

            nodeSettingsRef.current.set(node.id, settings);
            nodeInputsRef.current.set(node.id, inputs);

            nodeDef.execute({
              nodeId: node.id,
              inputs,
              inputsCount: node.inputs.length,
              settings,
              log: (msg: string) => console.log(`[Node ${node.id}] ${msg}`),
            });
          } catch (error) {
            console.error(`Error executing node ${node.id}:`, error);
          }
        });

        const graphNodes = Array.from(graph.nodes.values());
        const triggers = graphNodes.filter((n) => n.type === 'input.trigger').map((n) => n.id);
        setTriggerNodeId(triggers[0] ?? null);
        setHasFlashActionInGraph(graphNodes.some((n) => n.type === 'action.flashlight'));

        return { graph, triggerIds: triggers };
      } finally {
        isRebuildingRef.current = false;
      }
    },
    []
  );

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

  /**
   * Collecter les paramètres de tous les nœuds pour la sauvegarde
   */
  const collectNodeSettings = useCallback((): NodeSettingsMap => {
    const nodeSettingsMap: NodeSettingsMap = {};
    
    // Collecter les settings de chaque nœud
    nodeSettingsRef.current.forEach((settings, nodeId) => {
      const inputs = nodeInputsRef.current.get(nodeId) || {};
      nodeSettingsMap[nodeId.toString()] = {
        settings,
        inputs,
      };
    });
    
    console.log('📦 Collected node settings for save:', Object.keys(nodeSettingsMap).length, 'nodes');
    return nodeSettingsMap;
  }, []);

  /**
   * Restaurer les paramètres des nœuds depuis une sauvegarde
   */
  const restoreNodeSettings = useCallback((nodeSettings: NodeSettingsMap | undefined, graphData: DrawflowExport) => {
    if (!nodeSettings) {
      console.log('📂 No node settings to restore');
      return;
    }

    console.log('📂 Restoring node settings for', Object.keys(nodeSettings).length, 'nodes');

    // Restaurer les settings dans les refs
    Object.entries(nodeSettings).forEach(([nodeIdStr, data]) => {
      const nodeId = Number(nodeIdStr);
      if (data.settings) {
        nodeSettingsRef.current.set(nodeId, data.settings);
      }
      if (data.inputs) {
        nodeInputsRef.current.set(nodeId, data.inputs);
      }

      // Mettre à jour les données du graphe également pour synchronisation
      const moduleData = graphData?.drawflow?.Home?.data;
      if (moduleData && moduleData[nodeIdStr]) {
        if (!moduleData[nodeIdStr].data) {
          moduleData[nodeIdStr].data = {};
        }
        moduleData[nodeIdStr].data = {
          ...moduleData[nodeIdStr].data,
          settings: data.settings,
        };
      }
    });
  }, []);

  /**
   * Déclencher une sauvegarde automatique des paramètres (debounced)
   * Appelé après chaque changement de paramètre dans une node
   */
  const debouncedSaveSettings = useCallback(() => {
    // Annuler le timeout précédent s'il existe
    if (settingsChangeDebounceRef.current) {
      clearTimeout(settingsChangeDebounceRef.current);
    }

    // Déclencher une sauvegarde après 500ms d'inactivité
    settingsChangeDebounceRef.current = setTimeout(async () => {
      if (!currentSaveId || !currentGraph) {
        console.log('💾 No active save or graph for settings auto-save');
        return;
      }

      const nodeSettings = collectNodeSettings();
      console.log('💾 Auto-saving node settings...', Object.keys(nodeSettings).length, 'nodes');
      await autoSave(currentGraph, nodeSettings);
    }, 500);
  }, [currentSaveId, currentGraph, collectNodeSettings, autoSave]);

  const handleGraphExport = useCallback(
    async (data: DrawflowExport) => {
      try {
        // Synchroniser le tracker avec le graphe exporté
        nodeInstanceTracker.rebuildFromGraph(data);
        
        // Collecter les paramètres des nœuds pour la sauvegarde
        const nodeSettings = collectNodeSettings();
        
        await autoSave(data, nodeSettings);
        setCurrentGraph(data);

        if (pendingSaveNameRef.current) {
          const saveName = pendingSaveNameRef.current;
          pendingSaveNameRef.current = null;

          try {
            const save = await createSave(saveName, data, undefined, nodeSettings);
            if (save) {
              setNewSaveName('');
              setShowNewSaveInput(false);
              Alert.alert('Success', `Save "${save.name}" created!`);
            }
          } catch (error) {
            console.error('Failed to create save', error);
            Alert.alert('Error', 'Failed to create save.');
          }
        }

        const result = await rebuildSignalSystem(data);
        if (result) {
          resolveGraphSync(result);
        } else if (graphSyncResolvers.current.length > 0) {
          // Si le système existe déjà et n'a pas été reconstruit,
          // résoudre avec les données actuelles
          const existingSystem = getSignalSystem();
          if (existingSystem) {
            const graph = parseDrawflowGraph(data);
            const graphNodes = Array.from(graph.nodes.values());
            const triggers = graphNodes.filter((n) => n.type === 'input.trigger').map((n) => n.id);
            resolveGraphSync({ graph, triggerIds: triggers });
          } else {
            rejectGraphSync(new Error('Graph rebuild failed'));
          }
        }
      } catch (error) {
        rejectGraphSync(error instanceof Error ? error : new Error(String(error)));
        console.error('Failed to handle graph export', error);
      }
    },
    [autoSave, createSave, collectNodeSettings, rebuildSignalSystem, resolveGraphSync, rejectGraphSync]
  );

  const handleNodeSettingsChanged = useCallback((payload: any) => {
    try {
      const { nodeId, settings } = payload || {};
      if (!nodeId) return;

      const ss = getSignalSystem();
      const numericId = Number(nodeId);

      if (ss) {
        ss.unregisterHandler(numericId);
        if (typeof ss.unsubscribeNode === 'function') ss.unsubscribeNode(numericId);
      }

      const nodeType = payload?.nodeType;
      if (!nodeType) return;

      const nodeDef = nodeRegistry.getNode(nodeType);
      if (!nodeDef) return;

      const resolvedSettings = { ...(nodeDef.defaultSettings || {}), ...(settings || {}) };
      nodeSettingsRef.current.set(numericId, resolvedSettings);
      const cachedInputs = nodeInputsRef.current.get(numericId) || {};
      const inputsCount = ss?.graph.nodes.get(numericId)?.inputs.length ?? 0;
      nodeDef.execute({
        nodeId: numericId,
        inputs: cachedInputs,
        inputsCount,
        settings: resolvedSettings,
        log: (msg: string) => console.log(`[Node ${numericId}] ${msg}`),
      });

      // Déclencher une sauvegarde automatique des paramètres
      debouncedSaveSettings();
    } catch (err) {
      console.error('Failed to handle node setting change:', err);
    }
  }, [debouncedSaveSettings]);

  const handleNodeInputChanged = useCallback((payload: any) => {
    try {
      const { nodeId, inputName, inputType, value, nodeType } = payload || {};
      if (!nodeId || !inputName) return;

      const numericId = Number(nodeId);
      const parsedValue =
        inputType === 'number'
          ? Number(value)
          : inputType === 'switch'
          ? value === true || value === 'true'
          : value;
      const finalValue = inputType === 'number' && !Number.isFinite(parsedValue) ? 0 : parsedValue;

      console.log(`[NodeInputChanged] Node ${numericId}: ${inputName} = ${finalValue} (type: ${inputType})`);

      // Mettre à jour nodeInputsRef (pour les vraies connexions input/output)
      const currentInputs = nodeInputsRef.current.get(numericId) || {};
      const updatedInputs = { ...currentInputs, [inputName]: finalValue };
      nodeInputsRef.current.set(numericId, updatedInputs);

      const ss = getSignalSystem();
      const graphNode = ss?.graph.nodes.get(numericId);
      const definitionId = nodeType || graphNode?.type;
      if (!definitionId) return;

      const nodeDef = nodeRegistry.getNode(definitionId);
      if (!nodeDef) return;

      // Récupérer les settings actuels
      const currentSettings = nodeSettingsRef.current.get(numericId) || {
        ...(nodeDef.defaultSettings || {}),
        ...((graphNode?.data?.settings as Record<string, any> | undefined) ||
          graphNode?.data ||
          {}),
      };

      // IMPORTANT: Mettre à jour les settings avec la nouvelle valeur
      const updatedSettings = {
        ...currentSettings,
        [inputName]: finalValue,
      };

      // Sauvegarder les nouveaux settings dans la ref
      nodeSettingsRef.current.set(numericId, updatedSettings);

      // IMPORTANT: Persister les settings dans le graphNode pour les rechargements ultérieurs
      if (graphNode) {
        if (!graphNode.data) graphNode.data = {};
        graphNode.data.settings = updatedSettings;
      }

      console.log(`[NodeInputChanged] Updated settings for node ${numericId}:`, updatedSettings);

      // Désinscrire et réexécuter le nœud avec les nouveaux settings
      if (ss) {
        ss.unregisterHandler(numericId);
      }

      nodeDef.execute({
        nodeId: numericId,
        inputs: updatedInputs,
        inputsCount: graphNode?.inputs.length ?? 0,
        settings: updatedSettings,
        log: (msg: string) => console.log(`[Node ${numericId}] ${msg}`),
      });

      // Déclencher une sauvegarde automatique des paramètres
      debouncedSaveSettings();
    } catch (err) {
      console.error('Failed to handle node input change:', err);
    }
  }, [debouncedSaveSettings]);

  const {
    webRef,
    isReady,
    handleMessage,
    sendMessage,
    loadGraph,
    addNode,
    requestExport,
    clearGraph: clearWebViewGraph,
    setTheme: setWebViewTheme,
  } = useWebViewMessaging({
    currentTheme: appTheme.mode,
    onReady: () => {
      if (currentSaveId) {
        const save = saves.find((s) => s.id === currentSaveId);
        if (save) {
          nodeInstanceTracker.rebuildFromGraph(save.data);
          
          // Restaurer les paramètres des nœuds sauvegardés
          if (save.nodeSettings) {
            restoreNodeSettings(save.nodeSettings, save.data);
          }
          
          loadGraph(save.data);
          setCurrentGraph(save.data);
          // Passer preserveSettings=true pour utiliser les settings restaurés
          rebuildSignalSystem(save.data, false, true).catch((e) => console.warn('Failed to rebuild graph', e));
        }
      }
    },
    onExport: handleGraphExport,
    onNodeSettingsChanged: handleNodeSettingsChanged,
    onNodeInputChanged: handleNodeInputChanged,
    onThemeApplied: () => {},
  });

  const waitForGraphSync = useCallback((): Promise<GraphInitResult> => {
    if (!isReady) return Promise.reject(new Error('WebView not ready'));

    // Si le système existe déjà, retourner directement le résultat
    const existingSystem = getSignalSystem();
    if (existingSystem && currentGraph) {
      const graph = parseDrawflowGraph(currentGraph);
      const graphNodes = Array.from(graph.nodes.values());
      const triggers = graphNodes.filter((n) => n.type === 'input.trigger').map((n) => n.id);
      return Promise.resolve({ graph, triggerIds: triggers });
    }

    return new Promise((resolve, reject) => {
      const id = Date.now() + Math.random();
      const timeout = setTimeout(() => {
        graphSyncResolvers.current = graphSyncResolvers.current.filter((e) => e.id !== id);
        reject(new Error('Graph export timeout'));
      }, 2000);

      graphSyncResolvers.current.push({ id, resolve, reject, timeout });
      if (!requestExport()) {
        clearTimeout(timeout);
        graphSyncResolvers.current = graphSyncResolvers.current.filter((e) => e.id !== id);
        reject(new Error('Unable to request export'));
      }
    });
  }, [isReady, currentGraph, requestExport]);

  const handleRunProgram = useCallback(async () => {
    if (!isReady || triggerNodeId === null) return;

    if (programState.isRunning) {
      programState.stop();
      triggerNode(
        triggerNodeId,
        { timestamp: Date.now(), source: 'run-button' },
        { state: 'stop' }
      );
      return;
    }

    if (hasFlashActionInGraph) {
      try {
        const allowed = await ensureCameraPermission();
        if (!allowed) {
          Alert.alert('Permission requise', 'La permission Caméra est nécessaire');
          return;
        }
      } catch {
        return;
      }
    }

    if (!getSignalSystem()) {
      try {
        await waitForGraphSync();
      } catch {}
    }

    programState.start();
    triggerNode(triggerNodeId, { timestamp: Date.now(), source: 'run-button' }, { state: 'start' });
  }, [hasFlashActionInGraph, isReady, triggerNodeId, waitForGraphSync]);

  // Garder le template des nodes synchronisé avec le thème courant même sans DOM.
  useEffect(() => {
    setNodeCardTheme(appTheme.mode);
  }, [appTheme.mode]);

  // Sync theme with WebView
  useEffect(() => {
    if (!isReady || !setWebViewTheme) return;
    const timeout = setTimeout(() => setWebViewTheme(appTheme.mode), 100);
    return () => clearTimeout(timeout);
  }, [isReady, appTheme.mode, setWebViewTheme]);

  // Request initial export
  useEffect(() => {
    if (!isReady || currentGraph || !requestExport) return;
    const timeout = setTimeout(() => requestExport(), 600);
    return () => clearTimeout(timeout);
  }, [isReady, currentGraph, requestExport]);

  // If this screen was opened with a specific save id, load it immediately
  useEffect(() => {
    const openId = route?.params?.openSaveId;
    if (!openId) return;

    const save = loadSave(openId);
    if (!save) return;

    // Make sure we don't try to send messages to the WebView before it's ready.
    // If the WebView is ready, load it immediately; otherwise set the current
    // save and let the existing `onReady` handler (above) load it when ready.
    nodeInstanceTracker.reset();
    nodeInstanceTracker.rebuildFromGraph(save.data);
    setCurrentGraph(save.data);
    setCurrentSaveId(save.id);

    if (isReady) {
      loadGraph(save.data);
      rebuildSignalSystem(save.data).catch((e) => console.error('Failed to rebuild', e));
    }
  }, [
    route?.params?.openSaveId,
    loadSave,
    loadGraph,
    rebuildSignalSystem,
    setCurrentSaveId,
    isReady,
  ]);

  // Connect visualization bridge
  useEffect(() => {
    if (!isReady || !sendMessage) return;
    signalVisualizationBridge.connect(sendMessage);
    signalVisualizationBridge.setTriggerNodeId(triggerNodeId);
    return () => signalVisualizationBridge.disconnect();
  }, [isReady, sendMessage, triggerNodeId]);

  // Check camera permission for flash nodes
  useEffect(() => {
    if (!currentGraph) {
      setCameraPermissionGranted(null);
      return;
    }

    const hasFlash = Array.from(parseDrawflowGraph(currentGraph).nodes.values()).some(
      (n) => n.type === 'action.flashlight'
    );

    if (hasFlash) {
      hasCameraPermission()
        .then(setCameraPermissionGranted)
        .catch(() => {});
    } else {
      setCameraPermissionGranted(null);
    }
  }, [currentGraph]);

  // Background execution: Listen to AppState for background handling
  useEffect(() => {
    // Handle app state changes (background/foreground)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      console.log(`[Background] App state changed: ${previousState} -> ${nextAppState}`);

      // App went to background while program is running
      if (
        previousState === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive') &&
        programState.isRunning
      ) {
        console.log('[Background] App moved to background with program running - keeping alive');
        // The BackgroundService with WakeLock keeps the JS running
        // Update notification to show running state
        backgroundService.updateTriggerState(true);
      }

      // App came back to foreground
      if (
        (previousState === 'background' || previousState === 'inactive') &&
        nextAppState === 'active'
      ) {
        console.log('[Background] App returned to foreground');
        // Sync the notification state with current program state
        backgroundService.updateTriggerState(programState.isRunning);
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // Ensure BackgroundService is started if settings allow
    const settings = settingsManager.getSettings();
    if (settings.backgroundServiceEnabled && !backgroundService.isRunning()) {
      backgroundService.start();
    }

    return () => {
      appStateSub.remove();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      flashlightEventUnsubRef.current?.();
      rejectGraphSync(new Error('NodeEditorScreen unmounted'));
      // Don't reset signal system if program is still running in background
      if (!programState.isRunning) {
        resetSignalSystem();
      }
    };
  }, [rejectGraphSync]);

  const handleCreateSave = useCallback(async () => {
    if (pendingSaveNameRef.current || !newSaveName.trim()) {
      Alert.alert('Error', pendingSaveNameRef.current ? 'Please wait' : 'Enter a name');
      return;
    }
    pendingSaveNameRef.current = newSaveName.trim();
    if (!requestExport()) {
      pendingSaveNameRef.current = null;
      Alert.alert('Error', 'Unable to export graph');
    }
  }, [newSaveName, requestExport]);

  const handleLoadSave = useCallback(
    (saveId: string) => {
      const save = loadSave(saveId);
      if (save) {
        nodeInstanceTracker.reset();
        
        // Restaurer les paramètres des nœuds avant de charger le graphe
        if (save.nodeSettings) {
          restoreNodeSettings(save.nodeSettings, save.data);
        }
        
        loadGraph(save.data);
        setCurrentGraph(save.data);
        // Passer preserveSettings=true pour utiliser les settings restaurés
        rebuildSignalSystem(save.data, false, true).catch((e) => console.error('Failed to rebuild', e));
        setShowSaveMenu(false);
        Alert.alert('Loaded', `Loaded "${save.name}"`);
      }
    },
    [loadSave, loadGraph, restoreNodeSettings, rebuildSignalSystem]
  );

  const handleDeleteSave = useCallback(
    async (saveId: string) => {
      await deleteSave(saveId);
    },
    [deleteSave]
  );

  const handleAddNode = useCallback(
    (nodeType: string) => {
      const x =
        Math.random() * APP_CONFIG.nodes.randomOffsetRange + APP_CONFIG.nodes.defaultPosition.x;
      const y =
        Math.random() * APP_CONFIG.nodes.randomOffsetRange + APP_CONFIG.nodes.defaultPosition.y;
      addNode(nodeType, x, y, { type: nodeType });
      setTimeout(() => requestExport(), 300);
    },
    [addNode, requestExport]
  );

  useEffect(() => {
    const unsub = subscribeNodeAdded((nodeType: string) => {
      handleAddNode(nodeType);
      if (nodeType === 'action.flashlight') {
        ensureCameraPermission()
          .then((granted) => {
            if (!granted) Alert.alert('Permission requise', 'LUCA needs Camera permission');
          })
          .catch(() => {});
      }
    });
    return unsub;
  }, [handleAddNode]);

  const handleClearGraph = useCallback(() => {
    Alert.alert('Clear Graph', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearWebViewGraph();
          setCurrentSaveId(null);
          nodeInstanceTracker.reset();
          setCurrentGraph(null);
          setTriggerNodeId(null);
          setHasFlashActionInGraph(false);
          flashlightEventUnsubRef.current?.();
          flashlightEventUnsubRef.current = null;
          resetSignalSystem();
        },
      },
    ]);
  }, [clearWebViewGraph, setCurrentSaveId]);

  const currentSaveName = useMemo(() => {
    return saves.find((s) => s.id === currentSaveId)?.name || 'Untitled';
  }, [saves, currentSaveId]);

  const injectedThemeScript = useMemo(
    () =>
      `(function(){try{var root=document.documentElement; if (${JSON.stringify(
        appTheme.mode
      )} === 'light'){root.classList.add('light-theme');root.classList.remove('dark-theme');}else{root.classList.remove('light-theme');root.classList.add('dark-theme');}try{if(window.DrawflowEditor&&typeof window.DrawflowEditor.setTheme==='function'){window.DrawflowEditor.setTheme(${JSON.stringify(
        appTheme.mode
      )});}}catch(e){};}catch(e){};true;})();`,
    [appTheme.mode]
  );

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
                if (!granted) Alert.alert('Permission requise', 'Camera permission needed');
              } catch {
                Alert.alert('Error', 'Permission request failed');
              }
            }}
          >
            <Text style={styles.permissionButtonText}>Request permission</Text>
          </TouchableOpacity>
        </View>
      )}

      <WebView
        ref={webRef}
        source={{ uri: APP_CONFIG.webview.htmlUri }}
        style={{ flex: 1 }}
        injectedJavaScriptBeforeContentLoaded={injectedThemeScript}
        injectedJavaScript={injectedThemeScript}
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
        cacheEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        startInLoadingState={false}
        originWhitelist={['*']}
        allowFileAccess={true}
        onError={(e) => console.error('WebView error:', e.nativeEvent)}
      />

      <BottomControlsBar
        triggerNodeId={triggerNodeId}
        isReady={isReady}
        onRunProgram={handleRunProgram}
      />

      <TopControlsBar
        isReady={isReady}
        currentSaveId={currentSaveId}
        currentSaveName={currentSaveName}
        onOpenSaveMenu={() => setShowSaveMenu(true)}
        onClearGraph={handleClearGraph}
        onOpenSettings={() => navigation.navigate('Settings')}
      />

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
    </View>
  );
};

import { StyleSheet, StatusBar } from 'react-native';
import type { AppTheme } from '../theme';
import { hexToRgba } from '../theme';

const createStyles = (theme: AppTheme) => {
  const isDark = theme.mode === 'dark';
  // Respect safe-area / status bar on Android and add a small bottom inset
  const topInset = StatusBar.currentHeight || 8;
  const bottomInset = 24;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingTop: topInset,
      paddingBottom: bottomInset,
    },
    permissionBanner: {
      position: 'absolute',
      top: 60 + topInset,
      left: 10,
      right: 10,
      backgroundColor: hexToRgba(theme.colors.error, isDark ? 0.9 : 0.98),
      borderRadius: 12,
      borderWidth: 1,
      borderColor: hexToRgba(theme.colors.error, 0.6),
      padding: 12,
      zIndex: 999,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      elevation: 6,
      shadowColor: theme.colors.error,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 8,
    },
    permissionText: { color: theme.colors.text, flex: 1, fontSize: 12 },
    permissionButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.error,
      borderRadius: 8,
    },
    permissionButtonText: { color: theme.colors.background, fontWeight: '700' },
  });
};

export default NodeEditorScreen;
