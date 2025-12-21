/**
 * Utilitaires de debug pour le SignalSystem
 * Utilisez ces fonctions dans l'app pour diagnostiquer les problèmes
 */

import { getSignalSystem } from '../engine/SignalSystem';
import { logger } from './logger';

/**
 * Affiche l'état complet du SignalSystem
 */
export function debugSignalSystem(): void {
  const ss = getSignalSystem();
  
  if (!ss) {
    logger.error('[DEBUG] SignalSystem non initialise !');
    return;
  }

  logger.info('[DEBUG] SignalSystem initialise');
  
  // Stats
  const stats = ss.getStats();
  logger.info('[DEBUG] Statistiques:', {
    handlers: stats.registeredHandlers,
    totalSignals: stats.totalSignals,
    failedSignals: stats.failedSignals,
    activeNodes: stats.activeNodes,
    isIdle: stats.isIdle,
  });

  // Graphe
  if (ss.graph) {
    logger.info(`[DEBUG] Graphe: ${ss.graph.nodes.size} nodes, ${ss.graph.edges.length} edges`);
    
    // Afficher chaque node avec ses connexions
    ss.graph.nodes.forEach((node, nodeId) => {
      const state = ss.getNodeState(nodeId);
      logger.info(
        `[DEBUG] Node ${nodeId}: type=${node.type}, etat=${state}, inputs=[${node.inputs.join(', ')}], outputs=[${node.outputs.join(', ')}]`
      );
    });
    
    // Afficher les edges
    logger.info('[DEBUG] Connexions:');
    ss.graph.edges.forEach((edge, index) => {
      logger.info(`[DEBUG]   ${index + 1}. Node ${edge.from} -> Node ${edge.to}`);
    });
  } else {
    logger.warn('[DEBUG] Pas de graphe dans le SignalSystem');
  }

  // Nodes actives
  const activeNodes = ss.getActiveNodes();
  if (activeNodes.length > 0) {
    logger.info(`[DEBUG] Nodes actives: [${activeNodes.join(', ')}]`);
  } else {
    logger.info('[DEBUG] Aucune node active');
  }
}

/**
 * Debug une node spécifique
 */
export function debugNode(nodeId: number): void {
  const ss = getSignalSystem();
  
  if (!ss) {
    logger.error('[DEBUG] SignalSystem non initialise !');
    return;
  }

  const node = ss.graph?.nodes.get(nodeId);
  if (!node) {
    logger.error(`[DEBUG] Node ${nodeId} introuvable dans le graphe`);
    return;
  }

  const state = ss.getNodeState(nodeId);
  const data = ss.getNodeData(nodeId);
  
  logger.info(`[DEBUG] Node ${nodeId}:`, {
    type: node.type,
    name: node.name,
    etat: state,
    data: data,
    inputs: node.inputs,
    outputs: node.outputs,
  });
}

/**
 * Teste la propagation d'un signal depuis une node
 */
export async function testSignalPropagation(nodeId: number): Promise<void> {
  const ss = getSignalSystem();
  
  if (!ss) {
    logger.error('[DEBUG] SignalSystem non initialise !');
    return;
  }

  const node = ss.graph?.nodes.get(nodeId);
  if (!node) {
    logger.error(`[DEBUG] Node ${nodeId} introuvable`);
    return;
  }

  logger.info(`[DEBUG] Test de propagation depuis node ${nodeId} (${node.type})`);
  logger.info(`[DEBUG] Sorties: [${node.outputs.join(', ')}]`);
  
  // Vérifier que chaque sortie a un handler
  node.outputs.forEach((outputId) => {
    const outputNode = ss.graph?.nodes.get(outputId);
    const stats = ss.getStats();
    
    if (outputNode) {
      logger.info(
        `[DEBUG]   -> Node ${outputId} (${outputNode.type}): handler=${stats.registeredHandlers > 0 ? 'OK' : 'MANQUANT'}`
      );
    } else {
      logger.warn(`[DEBUG]   -> Node ${outputId}: INTROUVABLE`);
    }
  });

  // Tester un pulse
  try {
    logger.info('[DEBUG] Emission d un pulse de test...');
    await ss.pulseNode(nodeId, { _test: true, _pulse: Date.now() });
    logger.info('[DEBUG] Pulse emis avec succes');
  } catch (error) {
    logger.error('[DEBUG] Erreur lors du pulse:', error);
  }
}

/**
 * Affiche toutes les variables du contexte
 */
export function debugVariables(): void {
  const ss = getSignalSystem();
  
  if (!ss) {
    logger.error('[DEBUG] SignalSystem non initialise !');
    return;
  }

  const vars = ss.getAllVariables();
  const varCount = Object.keys(vars).length;
  
  if (varCount === 0) {
    logger.info('[DEBUG] Aucune variable dans le contexte');
  } else {
    logger.info(`[DEBUG] Variables (${varCount}):`, vars);
  }
}

/**
 * Watchdog : affiche automatiquement l'état quand un signal est émis
 */
let watchdogUnsubscribe: (() => void) | null = null;

export function startSignalWatchdog(): void {
  const ss = getSignalSystem();
  
  if (!ss) {
    logger.error('[DEBUG] SignalSystem non initialise !');
    return;
  }

  if (watchdogUnsubscribe) {
    logger.warn('[DEBUG] Watchdog deja actif');
    return;
  }

  logger.info('[DEBUG] Watchdog de signaux active');

  // S'abonner aux événements de propagation
  watchdogUnsubscribe = ss.subscribeToEvent('signal.propagated', 0, (data) => {
    logger.info(
      `[WATCHDOG] Signal ${data.state} : Node ${data.fromNodeId} -> Node ${data.toNodeId}`
    );
  });
}

export function stopSignalWatchdog(): void {
  if (watchdogUnsubscribe) {
    watchdogUnsubscribe();
    watchdogUnsubscribe = null;
    logger.info('[DEBUG] Watchdog de signaux desactive');
  }
}

// Exposer globalement pour les tests en dev
if (__DEV__) {
  (global as any).debugSignalSystem = debugSignalSystem;
  (global as any).debugNode = debugNode;
  (global as any).testSignalPropagation = testSignalPropagation;
  (global as any).debugVariables = debugVariables;
  (global as any).startSignalWatchdog = startSignalWatchdog;
  (global as any).stopSignalWatchdog = stopSignalWatchdog;
  
  logger.info('[DEBUG] Utilitaires de debug exposes globalement:');
  logger.info('[DEBUG]   - debugSignalSystem()');
  logger.info('[DEBUG]   - debugNode(nodeId)');
  logger.info('[DEBUG]   - testSignalPropagation(nodeId)');
  logger.info('[DEBUG]   - debugVariables()');
  logger.info('[DEBUG]   - startSignalWatchdog()');
  logger.info('[DEBUG]   - stopSignalWatchdog()');
}
