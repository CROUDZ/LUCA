// ============================================================================
// NODES DE BASE
// ============================================================================
import './condition/FlashLightConditionNode';
import './condition/VoiceKeywordConditionNode';
import './condition/VolumeConditionNodes';

import './controle/TriggerNode';
import './controle/LogicGateNode';
import './controle/DelayNode';

import './action/PingNode';
import './action/NotificationNode';
import './action/VibrationNode';
import './action/FlashLightActionNode';
import './action/VolumeActionNodes';
import './action/ColorScreenNode';

// ============================================================================
// EXPORTS DES NODES
// ============================================================================
export { default as FlashLightConditionNode } from './condition/FlashLightConditionNode';
export { default as PingNode } from './action/PingNode';
export { default as TriggerNode } from './controle/TriggerNode';
export { default as VoiceKeywordConditionNode } from './condition/VoiceKeywordConditionNode';
export { default as LogicGateNode } from './controle/LogicGateNode';
export { VolumeUpConditionNode, VolumeDownConditionNode } from './condition/VolumeConditionNodes';
export { default as DelayNode } from './controle/DelayNode';
export { default as NotificationNode } from './action/NotificationNode';
export { default as VibrationNode } from './action/VibrationNode';
export { default as FlashLightActionNode } from './action/FlashLightActionNode';
export { default as VolumeActionNode } from './action/VolumeActionNodes';
export { default as ColorScreenNode } from './action/ColorScreenNode';

// ============================================================================
// EXPORTS DES HELPERS
// ============================================================================

// Trigger
export { triggerNode, triggerAll } from './controle/TriggerNode';
// No continuous Source node — helpers removed

// FlashLight
export { setFlashlightState, getFlashlightState } from './condition/FlashLightConditionNode';

// Ping
export { getPingCount, resetPingCount } from './action/PingNode';

// Logic Gate
export { resetLogicGateState, resetAllLogicGateStates } from './controle/LogicGateNode';

// Voice Keyword
export { clearVoiceKeywordRegistry, getActiveListenersCount } from './condition/VoiceKeywordConditionNode';
