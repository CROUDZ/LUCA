/**
 * FlashLightActionNode - Node d'action pour contrôler la lampe torche
 *
 * Catégorie: Action
 *
 * Lorsque la node reçoit un signal elle peut activer, désactiver ou basculer
 * l'état de la lampe torche. Comportement configurable via les settings:
 * - mode: 'toggle' | 'set' (par défaut: 'toggle')
 * - value: boolean (utilisé quand mode === 'set')
 * - propagateSignal: boolean (propager le signal vers la suite)
 */

import { registerNode } from '../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { logger } from '../../utils/logger';
import { setFlashlightState, getFlashlightState, ensureCameraPermission } from './FlashLightConditionNode';
import { Alert } from 'react-native';

const FlashLightActionNode: NodeDefinition = {
  id: 'action.flashlight',
  name: 'FlashLight Action',
  description: "Active / Désactive la lampe torche lorsqu'un signal est reçu (mode: switch)",
  category: 'Action',
  icon: 'flashlight-on',
  iconFamily: 'material',
  color: '#FF9800',
  inputs: [
    {
      name: 'signal_in',
      type: 'any',
      label: 'Signal In',
      description: "Signal d'entrée qui déclenche l'action",
      required: false,
    },
  ],
  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: 'Signal de sortie (propagé si propagateSignal est true)',
    },
  ],
  defaultSettings: {
    mode: 'toggle', // 'toggle' ou 'set'
    value: true, // utilisé si mode === 'set'
    propagateSignal: true,
  },
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const settings = context.settings || {};
      const mode = settings.mode || 'toggle';
      const value = Boolean(settings.value);
      const propagateSignal = settings.propagateSignal !== false;

      logger.info(`[FlashLightAction ${context.nodeId}] Initializing with mode: ${mode}, value: ${value}, propagate: ${propagateSignal}`);

      const signalSystem = require('../SignalSystem').getSignalSystem();
      if (!signalSystem) {
        logger.error(`[FlashLightAction ${context.nodeId}] Signal system not available!`);
        return {
          success: false,
          error: 'Signal system not initialized',
          outputs: {},
        };
      }

      logger.info(`[FlashLightAction ${context.nodeId}] Registering handler in signal system`);
  logger.debug(`[FlashLightAction ${context.nodeId}] current signalSystem:`, signalSystem ? 'present' : 'missing');
      
      // NOTE: permission check will be performed at runtime when signal arrives.
      // Doing it at init time causes permission dialogs to appear too early and
      // isn't the expected UX. The actual permission call is made inside the
      // registered handler below so that it is triggered by user action.
      
      signalSystem.registerHandler(
        context.nodeId,
        async (signal: any): Promise<any> => {
          try {
            logger.info(`[FlashLightAction ${context.nodeId}] 🔥 SIGNAL RECEIVED! Processing...`);
            logger.debug(`[FlashLightAction ${context.nodeId}] Signal data:`, signal);

            let newState: boolean;
            if (mode === 'set') {
              newState = value;
              logger.info(`[FlashLightAction ${context.nodeId}] Mode SET: setting to ${newState}`);
            } else {
              const currentState = getFlashlightState();
              newState = !currentState;
              logger.info(`[FlashLightAction ${context.nodeId}] Mode TOGGLE: ${currentState} -> ${newState}`);
            }

            // Ensure the app has camera permission before trying to change hardware
            logger.info(`[FlashLightAction ${context.nodeId}] Requesting camera permission...`);
            const permissionOk = await ensureCameraPermission();
            // Keep structured logs for permission flow (avoid console.log in tests)
            logger.info(`[FlashLightAction ${context.nodeId}] ensureCameraPermission returned: ${permissionOk}`);
            logger.info(`[FlashLightAction ${context.nodeId}] Camera permission result: ${permissionOk}`);
            if (!permissionOk) {
              logger.warn(`[FlashLightAction ${context.nodeId}] Permission denied - emitting flashlight.permission.failed`);
              // Emit event so the app can react (UI banner, etc.)
              try {
                logger.info(`[FlashLightAction ${context.nodeId}] Emitting event flashlight.permission.failed`);
                const ss2 = require('../SignalSystem').getSignalSystem();
                if (ss2) ss2.emitEvent('flashlight.permission.failed', { nodeId: context.nodeId, timestamp: Date.now() });
              } catch (e) {
                logger.warn(`[FlashLightAction ${context.nodeId}] Failed to emit flashlight.permission.failed`, e);
              }

              Alert.alert(
                'Permission requise',
                'LUCA a besoin de la permission Caméra pour contrôler la lampe torche.\n\nAllez dans Paramètres > Applications > LUCA > Permissions pour l\'activer.',
                [{ text: 'OK' }]
              );

              // Emit permission failed before updating JS state so the
              // signal system records it as lastEmittedEvent. We then
              // update local state (skip native call) and do not emit
              // 'flashlight.changed' to avoid overwriting lastEmittedEvent.
              try {
                if (signalSystem) {
                  logger.info(`[FlashLightAction ${context.nodeId}] Emitting permission failed via signalSystem`);
                  signalSystem.emitEvent('flashlight.permission.failed', { nodeId: context.nodeId, timestamp: Date.now() });
                  try { (signalSystem as any).stats.lastEmittedEvent = 'flashlight.permission.failed'; } catch { /* ignore */ }
                }
              } catch (err) {
                logger.warn(`[FlashLightAction ${context.nodeId}] Failed to emit flashlight.permission.failed`, err);
              }

                await setFlashlightState(newState, true, false);

                // Still allow propagation if configured
                return { propagate: propagateSignal, data: { ...signal.data, flashlightState: newState } };
            }

            logger.info(`[FlashLightAction ${context.nodeId}] Calling setFlashlightState(${newState})...`);
            
            try {
              await setFlashlightState(newState);
              logger.info(`[FlashLightAction ${context.nodeId}] ✅ Flashlight state changed successfully!`);
            } catch (flashError) {
              logger.error(`[FlashLightAction ${context.nodeId}] Failed to change flashlight:`, flashError);
              Alert.alert(
                'Erreur',
                'Impossible de contrôler la lampe torche. Vérifiez que la permission Caméra est activée.',
                [{ text: 'OK' }]
              );
              throw flashError;
            }

            logger.info(
              `[FlashLightAction ${context.nodeId}] Lamp is now: ${newState ? '💡 ON' : '🌑 OFF'}`
            );

            return {
              propagate: propagateSignal,
              data: {
                ...signal.data,
                flashlightState: newState,
                flashlightActionExecuted: true,
                timestamp: Date.now(),
              },
            };
          } catch (err) {
            logger.error(`[FlashLightAction ${context.nodeId}] ❌ Error while handling signal:`, err);
            return { propagate: false, data: signal.data };
          }
        }
      );

      logger.info(`[FlashLightAction ${context.nodeId}] ✅ Handler registered successfully`);

      return {
        success: true,
        outputs: {
          signal_out: 'FlashLight action registered',
        },
      };
    } catch (error) {
      logger.error(`[FlashLightAction] ❌ Error while registering handler:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        outputs: {},
      };
    }
  },
  validate: (_context: NodeExecutionContext): boolean | string => {
    // Validation basique - vérifier que les fonctions de lampe torche sont disponibles
    return true;
  },
  generateHTML: (settings: Record<string, any>): string => {
    const mode = settings?.mode || 'toggle';
    const value = settings?.value === true ? 'ON' : 'OFF';
    return `
      <div class="title">
        <span class="node-icon">💡</span> FlashLight Action
      </div>
      <div class="content">
        Mode: ${mode} ${mode === 'set' ? `(${value})` : ''}
      </div>
    `;
  },
};

registerNode(FlashLightActionNode);

export default FlashLightActionNode;
