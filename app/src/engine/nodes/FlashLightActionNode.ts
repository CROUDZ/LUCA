/**
 * FlashLightActionNode - Node d'action pour contrôler la lampe torche
 */

import { registerNode } from '../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeMeta,
} from '../../types/node.types';
import {
  setFlashlightState,
  getFlashlightState,
  ensureCameraPermission,
} from './FlashLightConditionNode';
import { Alert } from 'react-native';
import { buildNodeCardHTML } from './templates/nodeCard';

const FLASHLIGHT_ACTION_COLOR = '#FF9800';

const FlashLightActionNode: NodeDefinition = {
  id: 'action.flashlight',
  name: 'FlashLight Action',
  description: "Active / Désactive la lampe torche lorsqu'un signal est reçu (mode: switch)",
  category: 'Action',
  icon: 'flashlight-on',
  iconFamily: 'material',
  color: FLASHLIGHT_ACTION_COLOR,
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
    mode: 'toggle',
    value: true,
    propagateSignal: true,
  },

  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const settings = context.settings || {};
      const mode = settings.mode || 'toggle';
      const value = Boolean(settings.value);
      const propagateSignal = settings.propagateSignal !== false;

      const signalSystem = require('../SignalSystem').getSignalSystem();
      if (!signalSystem) {
        return { success: false, error: 'Signal system not initialized', outputs: {} };
      }

      signalSystem.registerHandler(context.nodeId, async (signal: any): Promise<any> => {
        try {
          if (signal.state === 'OFF') {
            return {
              propagate: propagateSignal,
              state: 'OFF',
              data: { ...(signal?.data ?? {}), flashlightState: getFlashlightState() },
            };
          }

          const newState = mode === 'set' ? value : !getFlashlightState();
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

            await setFlashlightState(newState, true, false);
            return {
              propagate: propagateSignal,
              data: { ...signal.data, flashlightState: newState },
            };
          }

          try {
            await setFlashlightState(newState);
          } catch (flashError) {
            Alert.alert('Erreur', 'Impossible de contrôler la lampe torche.', [{ text: 'OK' }]);
            throw flashError;
          }

          return {
            propagate: propagateSignal,
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

  generateHTML: (settings: Record<string, any>, nodeMeta?: NodeMeta): string => {
    const mode = settings?.mode || 'toggle';
    const value = settings?.value === true;
    const propagateSignal = settings?.propagateSignal !== false;
    const modeLabel = mode === 'set' ? `Définir (${value ? 'ON' : 'OFF'})` : 'Toggle';
    const body = `
      <div class="node-info-grid">
        <div class="node-info-item">
          <span class="node-info-label">Mode</span>
          <span class="node-info-value">${mode === 'set' ? 'Définir' : 'Toggle'}</span>
        </div>
        <div class="node-info-item">
          <span class="node-info-label">Cible</span>
          <span class="node-info-value">${
            mode === 'set' ? (value ? 'ON' : 'OFF') : 'Basculement'
          }</span>
        </div>
        <div class="node-info-item">
          <span class="node-info-label">Propagation</span>
          <span class="node-info-badge ${
            propagateSignal ? 'node-info-badge--success' : 'node-info-badge--warning'
          }">${propagateSignal ? 'Activée' : 'Bloquée'}</span>
        </div>
      </div>
    `;

    return buildNodeCardHTML({
      title: 'FlashLight Action',
      subtitle: modeLabel,
      iconName: 'flashlight_on',
      category: nodeMeta?.category || 'Action',
      accentColor: FLASHLIGHT_ACTION_COLOR,
      body,
    });
  },
};

registerNode(FlashLightActionNode);

export default FlashLightActionNode;
