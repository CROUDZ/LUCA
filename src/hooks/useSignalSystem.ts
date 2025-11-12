/**
 * Hook React pour utiliser le système de signaux
 * 
 * Utilisation:
 * 
 * const { 
 *   initSystem,
 *   triggerSignal,
 *   setFlashlight,
 *   pingCount,
 *   systemStats
 * } = useSignalSystem();
 */

import { useEffect, useState, useCallback } from 'react';
import {
  initializeSignalSystem,
  getSignalSystem,
  resetSignalSystem,
  setFlashlightState,
  getFlashlightState,
  triggerNode,
  getPingCount,
  resetPingCount,
} from '../signalSystem';
import { parseDrawflowGraph } from '../engine/engine';
import type { Graph, DrawflowExport } from '../types';

export interface UseSignalSystemReturn {
  // État
  isInitialized: boolean;
  flashlightState: boolean;
  pingCount: number;
  systemStats: {
    registeredHandlers: number;
    queuedSignals: number;
    isProcessing: boolean;
  } | null;

  // Actions
  initSystem: (graphData: DrawflowExport) => Graph | null;
  resetSystem: () => void;
  triggerSignal: (nodeId: number, data?: any) => void;
  setFlashlight: (enabled: boolean) => void;
  resetPings: () => void;
  refreshStats: () => void;
}

/**
 * Hook pour gérer le système de signaux
 */
export function useSignalSystem(): UseSignalSystemReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [flashlightState, setFlashlightStateLocal] = useState(false);
  const [pingCount, setPingCount] = useState(0);
  const [systemStats, setSystemStats] = useState<{
    registeredHandlers: number;
    queuedSignals: number;
    isProcessing: boolean;
  } | null>(null);

  // Initialiser le système avec un graphe
  const initSystem = useCallback((graphData: DrawflowExport): Graph | null => {
    try {
      // Parser le graphe
      const graph = parseDrawflowGraph(graphData);

      // Initialiser le système de signaux
      initializeSignalSystem(graph);

      setIsInitialized(true);
      console.log('[useSignalSystem] Système initialisé avec', graph.nodes.size, 'nodes');

      return graph;
    } catch (error) {
      console.error('[useSignalSystem] Erreur lors de l\'initialisation:', error);
      return null;
    }
  }, []);

  // Rafraîchir les statistiques
  const refreshStats = useCallback(() => {
    const system = getSignalSystem();
    if (system) {
      const stats = system.getStats();
      setSystemStats(stats);
    }
  }, []);

  // Réinitialiser le système
  const resetSystem = useCallback(() => {
    resetSignalSystem();
    resetPingCount();
    setIsInitialized(false);
    setPingCount(0);
    setSystemStats(null);
    console.log('[useSignalSystem] Système réinitialisé');
  }, []);

  // Déclencher un signal
  const triggerSignal = useCallback((nodeId: number, data?: any) => {
    if (!isInitialized) {
      console.warn('[useSignalSystem] Système non initialisé');
      return;
    }

    triggerNode(nodeId, data);
    console.log('[useSignalSystem] Signal déclenché depuis node', nodeId);

    // Rafraîchir les stats après un délai
    setTimeout(() => {
      setPingCount(getPingCount());
      refreshStats();
    }, 100);
  }, [isInitialized, refreshStats]);

  // Contrôler la lampe torche
  const setFlashlight = useCallback((enabled: boolean) => {
    setFlashlightState(enabled);
    setFlashlightStateLocal(enabled);
    console.log('[useSignalSystem] Lampe torche:', enabled ? 'ON' : 'OFF');
  }, []);

  // Réinitialiser le compteur de pings
  const resetPings = useCallback(() => {
    resetPingCount();
    setPingCount(0);
    console.log('[useSignalSystem] Compteur de pings réinitialisé');
  }, []);

  // Mettre à jour les stats périodiquement
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      setPingCount(getPingCount());
      setFlashlightStateLocal(getFlashlightState());
      refreshStats();
    }, 1000);

    return () => clearInterval(interval);
  }, [isInitialized, refreshStats]);

  // Cleanup à la destruction
  useEffect(() => {
    return () => {
      if (isInitialized) {
        resetSystem();
      }
    };
  }, [isInitialized, resetSystem]);

  return {
    // État
    isInitialized,
    flashlightState,
    pingCount,
    systemStats,

    // Actions
    initSystem,
    resetSystem,
    triggerSignal,
    setFlashlight,
    resetPings,
    refreshStats,
  };
}

/**
 * Hook simplifié pour juste initialiser le système
 */
export function useSignalSystemInit(graphData: DrawflowExport | null) {
  const { initSystem, resetSystem } = useSignalSystem();

  useEffect(() => {
    if (graphData) {
      initSystem(graphData);
    }

    return () => {
      resetSystem();
    };
  }, [graphData, initSystem, resetSystem]);
}

/**
 * Hook pour écouter les changements de compteur de pings
 */
export function usePingCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(getPingCount());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return count;
}

/**
 * Hook pour contrôler la lampe torche
 */
export function useFlashlight() {
  const [isOn, setIsOn] = useState(false);

  const toggle = useCallback(() => {
    const newState = !isOn;
    setFlashlightState(newState);
    setIsOn(newState);
  }, [isOn]);

  const turnOn = useCallback(() => {
    setFlashlightState(true);
    setIsOn(true);
  }, []);

  const turnOff = useCallback(() => {
    setFlashlightState(false);
    setIsOn(false);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsOn(getFlashlightState());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return { isOn, toggle, turnOn, turnOff };
}
