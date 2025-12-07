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

import { registerNode } from '../NodeRegistry';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeMeta,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';
import { Vibration } from 'react-native';
import { ensureVibrationPermission } from '../../utils/permissions';
import { buildNodeCardHTML } from './templates/nodeCard';

const VIBRATION_NODE_ACCENT = '#F97316';

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
  color: VIBRATION_NODE_ACCENT,

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
    {
      name: 'duration',
      type: 'number',
      label: 'Duration',
      description: 'Durée en ms',
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
    vibrationType: 'simple', // 'simple', 'pattern', 'success', 'warning', 'error'
    duration: 400, // Durée en ms pour simple
    pattern: [0, 500, 200, 500], // Pattern pour pattern type
    repeat: false, // Répéter le pattern
    autoPropagate: true,
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
            logger.debug(`[Vibration Node ${context.nodeId}] Déclenchement vibration`);

            try {
              const hasPermission = await ensureVibrationPermission();
              if (!hasPermission) {
                logger.warn(`[Vibration Node ${context.nodeId}] Permission Vibration refusée`);
                try {
                  signalSystem.emitEvent('vibration.permission.denied', {
                    nodeId: context.nodeId,
                    timestamp: Date.now(),
                  });
                } catch (emitErr) {
                  logger.warn(
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

              const vibrationType = settings.vibrationType || 'simple';

              // Déterminer le pattern de vibration
              switch (vibrationType) {
                case 'simple': {
                  const duration =
                    context.inputs.duration !== undefined
                      ? Number(context.inputs.duration)
                      : settings.duration || 400;
                  Vibration.vibrate(duration);
                  break;
                }
                case 'pattern': {
                  const pattern = settings.pattern || [0, 500, 200, 500];
                  Vibration.vibrate(pattern, settings.repeat || false);
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
                propagate: settings.autoPropagate !== false,
                data: {
                  ...(signal?.data ?? {}),
                  vibrationTriggered: true,
                  vibrationType,
                },
              };
            } catch (error) {
              logger.error(`[Vibration Node ${context.nodeId}] Erreur:`, error);
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
  generateHTML: (settings: Record<string, any>, nodeMeta?: NodeMeta) => {
    const vibrationType = settings.vibrationType || 'simple';
    const typeLabels: Record<string, string> = {
      simple: 'Simple',
      pattern: 'Pattern',
      success: '✓',
      warning: '⚠',
      error: '✗',
    };

    return buildNodeCardHTML({
      title: 'Vibration',
      subtitle: typeLabels[vibrationType] || 'Simple',
      iconName: 'vibration',
      category: nodeMeta?.category || 'Action',
      accentColor: VIBRATION_NODE_ACCENT,
      description: 'Déclenche une vibration native selon le pattern choisi.',
    });
  },
};

// Enregistrer la node
registerNode(VibrationNode);

export default VibrationNode;
