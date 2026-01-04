/**
 * FlashLightActionNode - Node d'action pour contrôler la lampe torche
 */

import { registerNode } from '../../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeMeta,
} from '../../../types/node.types';
import {
  setFlashlightState,
  getFlashlightState,
  ensureCameraPermission,
} from '../condition/FlashLightConditionNode';
import { Alert } from 'react-native';
import { buildNodeCardHTML } from '../nodeCard';
import { getSignalSystem, type Signal, type SignalPropagation } from '../../SignalSystem';

const FlashLightActionNode: NodeDefinition = {
  id: 'action.flashlight',
  name: 'FlashLight Action',
  description: "Allume la lampe torche lorsqu'un signal est reçu, l'éteint sinon. Aucun paramètre.",
  category: 'Action',
  doc: `excerpt: Contrôle la lampe torche de votre téléphone.
---
Ce bloc allume ou éteint la lampe torche de votre téléphone selon le signal qu'il reçoit. C'est très simple : quand il reçoit un signal, la lampe s'allume. Quand le signal s'arrête, elle s'éteint.

**Comment l'utiliser :**
1. Connectez ce bloc à d'autres blocs de votre flux
2. Quand le signal arrive, la lampe torche s'allume automatiquement
3. Quand le signal disparaît, la lampe s'éteint
4. Aucun réglage nécessaire !`,
  icon: 'flashlight-on',
  iconFamily: 'material',
  // Aucun réglage nécessaire — comportement simple et déterministe

  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      // Comportement simple : ON quand on reçoit un signal (sauf état 'OFF'), OFF sinon
      console.log(`[FlashLightAction ${context.nodeId}] Registering flashlight action handler.`);

      const signalSystem = getSignalSystem();
      if (!signalSystem) {
        return { success: false, error: 'Signal system not initialized', outputs: {} };
      }

      signalSystem.registerHandler(context.nodeId, async (signal: Signal): Promise<SignalPropagation> => {
        try {
          const turningOn = signal.state !== 'OFF';
          const newState = turningOn;
          console.log(`[FlashLightAction ${context.nodeId}] Signal received. Setting flashlight to: ${newState}`);

          // Vérifier la permission uniquement si on veut allumer
          if (turningOn) {
            const permissionOk = await ensureCameraPermission();
            console.log(`[FlashLightAction ${context.nodeId}] Camera permission: ${permissionOk}`);

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

  generateHTML: (_, nodeMeta?: NodeMeta): string => {
    return buildNodeCardHTML({
      title: 'FlashLight Action',
      iconName: 'flashlight_on',
      category: 'Action',
      nodeId: nodeMeta?.id,
    });
  },
};

registerNode(FlashLightActionNode);

export default FlashLightActionNode;
