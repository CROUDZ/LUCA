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
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';
import { logger } from '../../utils/logger';
import { setFlashlightState, getFlashlightState } from './FlashLightConditionNode';

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
      const propagate = settings.propagateSignal !== false;

      const signalSystem = getSignalSystem();

      if (signalSystem) {
        signalSystem.registerHandler(
          context.nodeId,
          async (signal: Signal): Promise<SignalPropagation> => {
            try {
              logger.debug(`[FlashLightAction ${context.nodeId}] Signal reçu:`, signal);

              let newState: boolean;
              if (mode === 'set') {
                newState = value;
              } else {
                // toggle
                newState = !getFlashlightState();
              }

              await setFlashlightState(newState);

              logger.info(
                `[FlashLightAction ${context.nodeId}] Lamp state set to: ${newState ? 'ON' : 'OFF'}`
              );

              return {
                propagate: propagate,
                data: {
                  ...signal.data,
                  flashlightState: newState,
                },
              };
            } catch (err) {
              logger.warn('[FlashLightAction] Error while setting flashlight', err);
              return { propagate: false, data: signal.data };
            }
          }
        );
      }

      return {
        success: true,
        outputs: {
          signal_out: 'FlashLight action registered',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        outputs: {},
      };
    }
  },
  validate: (_context: NodeExecutionContext): boolean | string => {
    const signalSystem = getSignalSystem();
    if (!signalSystem) {
      return 'Signal system not initialized';
    }
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
