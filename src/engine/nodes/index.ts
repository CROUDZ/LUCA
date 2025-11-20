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
import './FlashLightConditionNode';
import './PingNode';
import './TriggerNode';
// Source node removed per user request
import './ConfirmNode';

// ============================================================================
// NODES CONDITIONNELLES
// ============================================================================
import './IfElseNode';
import './LogicGateNode';

// ============================================================================
// NODES DE CONTRÔLE DE FLUX
// ============================================================================
import './DelayNode';

// ============================================================================
// NODES D'ACTIONS
// ============================================================================
import './NotificationNode';
import './VibrationNode';
import './FlashLightActionNode';
import './EventListenerNode';

import { logger } from '../../utils/logger';

logger.debug('✅ All nodes loaded (17 nodes total)');

// ============================================================================
// EXPORTS DES NODES
// ============================================================================
export { default as FlashLightConditionNode } from './FlashLightConditionNode';
export { default as PingNode } from './PingNode';
export { default as TriggerNode } from './TriggerNode';
export { default as IfElseNode } from './IfElseNode';
export { default as LogicGateNode } from './LogicGateNode';
export { default as DelayNode } from './DelayNode';
export { default as NotificationNode } from './NotificationNode';
export { default as VibrationNode } from './VibrationNode';
export { default as FlashLightActionNode } from './FlashLightActionNode';
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

// Confirm
export { default as ConfirmNode } from './ConfirmNode';

// Event Listener helpers
export {
	default as EventListenerNode,
	unsubscribeEventListener,
	unsubscribeAllEventListeners,
} from './EventListenerNode';
