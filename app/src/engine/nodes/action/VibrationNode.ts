/**
 * VibrationNode - Node de vibration
 *
 * Catégorie: Action
 *
 * Cette node déclenche une vibration sur le téléphone.
 * Supporte différents patterns de vibration.
 *
 * Fonctionnement:
 * - Reçoit un signal
 * - Déclenche une vibration avec le pattern configuré
 * - Propage le signal après la vibration
 */

import { registerNode } from '../../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../../SignalSystem';
import { Vibration } from 'react-native';
import { ensureVibrationPermission } from '../../../utils/permissions';
import { buildNodeCardHTML } from '../nodeCard';

const VibrationNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'action.vibration',
  name: 'Vibration',
  description: 'Déclenche une vibration sur le téléphone',
  category: 'Action',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'vibration',
  iconFamily: 'material',

  // ============================================================================
  // INPUTS/OUTPUTS
  // ============================================================================
  inputs: [
    {
      name: 'signal_in',
      type: 'any',
      label: 'Signal In',
      description: "Signal d'entrée",
      required: false,
    },
  ],

  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: 'Signal de sortie après vibration',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    vibrationType: 'simple', // 'simple', 'success', 'warning', 'error'
  },

  // ============================================================================
  // EXÉCUTION
  // ============================================================================
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const settings = context.settings || {};
      const signalSystem = getSignalSystem();

      if (signalSystem) {
        signalSystem.registerHandler(
          context.nodeId,
          async (signal: Signal): Promise<SignalPropagation> => {
            console.log(`[Vibration Node ${context.nodeId}] Déclenchement vibration`);

            try {
              const hasPermission = await ensureVibrationPermission();
              if (!hasPermission) {
                console.warn(`[Vibration Node ${context.nodeId}] Permission Vibration refusée`);
                try {
                  signalSystem.emitEvent('vibration.permission.denied', {
                    nodeId: context.nodeId,
                    timestamp: Date.now(),
                  });
                } catch (emitErr) {
                  console.warn(
                    `[Vibration Node ${context.nodeId}] Impossible d'émettre l'évènement permission`,
                    emitErr
                  );
                }

                return {
                  propagate: false,
                  data: {
                    ...(signal?.data ?? {}),
                    vibrationTriggered: false,
                    vibrationPermission: 'denied',
                  },
                };
              }

              const vibrationType : 'simple' | 'pattern' | 'success' | 'warning' | 'error' = settings.vibrationType || 'simple';

              // Déterminer le pattern de vibration
              switch (vibrationType) {
                case 'simple': {
                  Vibration.vibrate(400);
                  break;
                }
                case 'success': {
                  // Pattern court et agréable
                  Vibration.vibrate([0, 100, 50, 100]);
                  break;
                }
                case 'warning': {
                  // Pattern moyen
                  Vibration.vibrate([0, 200, 100, 200, 100, 200]);
                  break;
                }
                case 'error': {
                  // Pattern long et insistant
                  Vibration.vibrate([0, 500, 200, 500, 200, 500]);
                  break;
                }
                default:
                  Vibration.vibrate(400);
              }

              return {
                propagate: true,
                data: {
                  ...(signal?.data ?? {}),
                  vibrationTriggered: true,
                  vibrationType,
                },
              };
            } catch (error) {
              console.error(`[Vibration Node ${context.nodeId}] Erreur:`, error);
              return { propagate: false };
            }
          }
        );
      }

      return {
        outputs: {},
        success: true,
      };
    } catch (error) {
      return {
        outputs: {},
        success: false,
        error: String(error),
      };
    }
  },

  // ============================================================================
  // HTML PERSONNALISÉ
  // ============================================================================
  generateHTML: (settings: Record<string, any>, nodeMeta?: Record<string, any>) => {
    const vibrationType = settings?.vibrationType || 'simple';

    return buildNodeCardHTML({
      title: 'Vibration',
      subtitle: 'Déclenche une vibration',
      iconName: 'vibration',
      category: 'Action',
      nodeId: nodeMeta?.id,
      inputs: [
        {
          type: 'selector',
          name: 'vibrationType',
          label: 'Type',
          value: vibrationType,
          options: [
            { label: 'Simple', value: 'simple' },
            { label: 'Succès ✓', value: 'success' },
            { label: 'Attention ⚠', value: 'warning' },
            { label: 'Erreur ✗', value: 'error' },
          ],
        }
      ],
    });
  },
};

// Enregistrer la node
registerNode(VibrationNode);

export default VibrationNode;