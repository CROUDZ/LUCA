/**
 * FlashLightActionNode - Node d'action pour contrôler la lampe torche
 */

import { registerNode } from '../../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../../types/node.types';
import {
  setFlashlightState,
  getFlashlightState,
  ensureCameraPermission,
} from '../condition/FlashLightConditionNode';
import { Alert } from 'react-native';
import { buildNodeCardHTML } from '../nodeCard';

const FlashLightActionNode: NodeDefinition = {
  id: 'action.flashlight',
  name: 'FlashLight Action',
  description: "Allume la lampe torche lorsqu'un signal est reçu, l'éteint sinon. Aucun paramètre.",
  category: 'Action',
  icon: 'flashlight-on',
  iconFamily: 'material',
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
  // Aucun réglage nécessaire — comportement simple et déterministe

  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      // Comportement simple : ON quand on reçoit un signal (sauf état 'OFF'), OFF sinon

      const signalSystem = require('../SignalSystem').getSignalSystem();
      if (!signalSystem) {
        return { success: false, error: 'Signal system not initialized', outputs: {} };
      }

      signalSystem.registerHandler(context.nodeId, async (signal: any): Promise<any> => {
        try {
          const turningOn = signal.state !== 'OFF';
          const newState = turningOn;

          // Vérifier la permission uniquement si on veut allumer
          if (turningOn) {
            const permissionOk = await ensureCameraPermission();

            if (!permissionOk) {
              try {
                signalSystem.emitEvent('flashlight.permission.failed', {
                  nodeId: context.nodeId,
                  timestamp: Date.now(),
                });
              } catch {}

              Alert.alert(
                'Permission requise',
                'LUCA a besoin de la permission Caméra pour contrôler la lampe torche.',
                [{ text: 'OK' }]
              );

              // Ne pas tenter d'allumer si pas de permission
              return { propagate: true, data: { ...signal.data, flashlightState: getFlashlightState() } };
            }
          }

          try {
            await setFlashlightState(newState);
          } catch (flashError) {
            Alert.alert('Erreur', 'Impossible de contrôler la lampe torche.', [{ text: 'OK' }]);
            throw flashError;
          }

          return {
            propagate: true,
            state: signal.state,
            data: {
              ...signal.data,
              flashlightState: newState,
              flashlightActionExecuted: true,
              timestamp: Date.now(),
            },
          };
        } catch (err) {
          console.error(`[FlashLightAction ${context.nodeId}] Error:`, err);
          return { propagate: false, data: signal.data };
        }
      });

      return { success: true, outputs: { signal_out: 'FlashLight action registered' } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        outputs: {},
      };
    }
  },

  validate: (): boolean | string => true,

  generateHTML: (): string => {
    return buildNodeCardHTML({
      title: 'FlashLight Action',
      iconName: 'flashlight_on',
      category: 'Action',
    });
  },
};

registerNode(FlashLightActionNode);

export default FlashLightActionNode;
