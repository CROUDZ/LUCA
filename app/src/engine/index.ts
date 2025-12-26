/**
 * Export centralisé du système de signaux
 *
 * Ce fichier réexporte tous les éléments nécessaires pour utiliser
 * le système de signaux et les nodes dans l'application.
 */

// ============================================================================
// SIGNAL SYSTEM
// ============================================================================
export {
  SignalSystem,
  initializeSignalSystem,
  getSignalSystem,
  resetSignalSystem,
} from './SignalSystem';

export type {
  Signal,
  SignalHandler,
  SignalPropagation,
  ExecutionContext,
  EventHandler,
  EventSubscription,
} from './SignalSystem';

// ============================================================================
// ENGINE
// ============================================================================
export {
  parseDrawflowGraph,
  topologicalSort,
  exportToDrawflow,
  validateGraph,
  findSourceNodes,
  findOutputNodes,
} from './engine';

// ============================================================================
// NODE REGISTRY
// ============================================================================
export { nodeRegistry, registerNode } from './NodeRegistry';

export type { NodeDefinition } from '../types/node.types';

// ============================================================================
// NODE INSTANCE TRACKER
// ============================================================================
export { nodeInstanceTracker } from './NodeInstanceTracker';

// ============================================================================
// NODES - Importer toutes les nodes
// ============================================================================
import './nodes';

// Réexporter les helpers des nodes
export {
  // Trigger
  triggerNode,
  triggerAll,

  // FlashLight
  setFlashlightState,
  getFlashlightState,

  // Ping
  getPingCount,
  resetPingCount,

  // Logic Gate
  resetLogicGateState,
  resetAllLogicGateStates,

  // Confirm helper
  ConfirmNode,
  // Source node removed (start/stop helpers no longer exported)
} from './nodes';
