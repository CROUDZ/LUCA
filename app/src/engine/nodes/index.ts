/**
 * Nodes Index - Point d'entrée pour toutes les nodes
 *
 * Pour ajouter une nouvelle node :
 * 1. Créer le fichier dans ce dossier
 * 2. L'importer ici
 * 3. L'exporter si nécessaire
 */

// ============================================================================
// NODES DE BASE
// ============================================================================
import './FlashLightConditionNode';
import './PingNode';
import './TriggerNode';
import './ConfirmNode';
import './VoiceKeywordConditionNode';

// ============================================================================
// NODES CONDITIONNELLES
// ============================================================================
import './IfElseNode';
import './LogicGateNode';
import './VolumeConditionNodes';

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
import './VolumeActionNodes';

import { logger } from '../../utils/logger';

logger.debug('✅ All nodes loaded');

// ============================================================================
// EXPORTS DES NODES
// ============================================================================
export { default as FlashLightConditionNode } from './FlashLightConditionNode';
export { default as PingNode } from './PingNode';
export { default as TriggerNode } from './TriggerNode';
export { default as VoiceKeywordConditionNode } from './VoiceKeywordConditionNode';
export { default as IfElseNode } from './IfElseNode';
export { default as LogicGateNode } from './LogicGateNode';
export { VolumeUpConditionNode, VolumeDownConditionNode } from './VolumeConditionNodes';
export { default as DelayNode } from './DelayNode';
export { default as NotificationNode } from './NotificationNode';
export { default as VibrationNode } from './VibrationNode';
export { default as FlashLightActionNode } from './FlashLightActionNode';
export { VolumeUpActionNode, VolumeDownActionNode } from './VolumeActionNodes';
export { default as ConfirmNode } from './ConfirmNode';

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

// Voice Keyword
export { clearVoiceKeywordRegistry, getActiveListenersCount } from './VoiceKeywordConditionNode';
