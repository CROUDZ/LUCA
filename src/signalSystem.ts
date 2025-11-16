/**
 * Export central du système de signaux
 *
 * Importer depuis ce fichier pour avoir accès à tout le système :
 * import { SignalSystem, TriggerNode, ... } from './signalSystem';
 */

// ============================================================================
// Système de signaux
// ============================================================================
export {
  SignalSystem,
  initializeSignalSystem,
  getSignalSystem,
  resetSignalSystem,
} from './engine/SignalSystem';

export type {
  Signal,
  SignalHandler,
  SignalPropagation,
  SignalCallback,
} from './engine/SignalSystem';

// ============================================================================
// Nodes
// ============================================================================

// FlashLight Node
export { default as FlashLightConditionNode } from './engine/nodes/FlashLightConditionNode';
export { setFlashlightState, getFlashlightState } from './engine/nodes/FlashLightConditionNode';

// Ping Node
export { default as PingNode } from './engine/nodes/PingNode';
export { getPingCount, resetPingCount } from './engine/nodes/PingNode';

// Trigger Node
export { default as TriggerNode } from './engine/nodes/TriggerNode';
export { triggerNode, triggerAll } from './engine/nodes/TriggerNode';

// Demo Node
export { default as DemoNode } from './engine/nodes/DemoNode';

// ============================================================================
// Types
// ============================================================================
export type {
  Graph,
  GraphNode,
  DrawflowExport,
  NodeExecutionContext,
  NodeExecutionResult,
} from './types';

// ============================================================================
// Engine
// ============================================================================
export { parseDrawflowGraph, topologicalSort, validateGraph, executeGraph } from './engine/engine';
