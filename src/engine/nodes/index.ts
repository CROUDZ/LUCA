/**
 * Nodes Index - Charge automatiquement toutes les nodes
 * Pour ajouter une nouvelle node, il suffit de créer un nouveau fichier dans ce dossier
 * et de l'importer ici
 */

// ============================================================================
// Node de démonstration complète
// ============================================================================
// Cette node unique démontre TOUTES les fonctionnalités disponibles :
// - Tous les types d'inputs/outputs (string, number, boolean, array, object, any)
// - Validation des inputs avec messages d'erreur détaillés
// - Configuration via defaultSettings
// - Limites : maxInstances (5)
// - Exécution synchrone ET asynchrone
// - Multiples modes de traitement
// - Logging avec context.log()
// - Gestion d'erreurs complète
// ============================================================================

// ============================================================================
// NODES DE BASE (EXISTANTES)
// ============================================================================
import './DemoNode';
import './FlashLightConditionNode';
import './PingNode';
import './TriggerNode';
// Source node removed per user request
import './ConfirmNode';

// ============================================================================
// NODES CONDITIONNELLES
// ============================================================================
import './IfElseNode';
import './CompareNode';
import './LogicGateNode';

// ============================================================================
// NODES DE CONTRÔLE DE FLUX
// ============================================================================
import './DelayNode';
import './LoopNode';
import './SequenceNode';

// ============================================================================
// NODES DE DONNÉES
// ============================================================================
import './VariableNode';
import './MathNode';
import './ConstantNode';

// ============================================================================
// NODES D'ACTIONS
// ============================================================================
import './NotificationNode';
import './VibrationNode';
import './LogNode';
import './FlashLightActionNode';

// ============================================================================
// NODES D'ÉVÉNEMENTS
// ============================================================================
import './EventEmitterNode';
import './EventListenerNode';
import { logger } from '../../utils/logger';

logger.debug('✅ All nodes loaded (17 nodes total)');

// ============================================================================
// EXPORTS DES NODES
// ============================================================================
export { default as DemoNode } from './DemoNode';
export { default as FlashLightConditionNode } from './FlashLightConditionNode';
export { default as PingNode } from './PingNode';
export { default as TriggerNode } from './TriggerNode';
export { default as IfElseNode } from './IfElseNode';
export { default as CompareNode } from './CompareNode';
export { default as LogicGateNode } from './LogicGateNode';
export { default as DelayNode } from './DelayNode';
export { default as LoopNode } from './LoopNode';
export { default as SequenceNode } from './SequenceNode';
export { default as VariableNode } from './VariableNode';
export { default as MathNode } from './MathNode';
export { default as ConstantNode } from './ConstantNode';
export { default as NotificationNode } from './NotificationNode';
export { default as VibrationNode } from './VibrationNode';
export { default as LogNode } from './LogNode';
export { default as FlashLightActionNode } from './FlashLightActionNode';
export { default as EventEmitterNode } from './EventEmitterNode';
export { default as EventListenerNode } from './EventListenerNode';
// ConfirmNode export (duplicate removed)

// ============================================================================
// EXPORTS DES HELPERS
// ============================================================================

// Trigger
export { triggerNode, triggerAll } from './TriggerNode';
// No continuous Source node — helpers removed

// FlashLight
export { setFlashlightState, getFlashlightState } from './FlashLightConditionNode';

// Ping
export { getPingCount, resetPingCount } from './PingNode';

// Logic Gate
export { resetLogicGateState, resetAllLogicGateStates } from './LogicGateNode';

// Event Listener
export {
  unsubscribeEventListener,
  unsubscribeAllEventListeners,
} from './EventListenerNode';
// Confirm
export { default as ConfirmNode } from './ConfirmNode';
