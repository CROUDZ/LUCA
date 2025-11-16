/**
 * SequenceNode - Node de séquence
 *
 * Catégorie: Flow Control
 *
 * Cette node ordonne la propagation de signaux vers plusieurs sorties
 * de manière séquentielle avec des délais optionnels.
 *
 * Fonctionnement:
 * - Reçoit un signal
 * - Propage vers chaque sortie l'une après l'autre
 * - Peut introduire des délais entre chaque propagation
 */

import { registerNode } from '../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';
import { logger } from '../../utils/logger';

const SequenceNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'flow.sequence',
  name: 'Sequence',
  description: 'Propage le signal vers plusieurs sorties de manière séquentielle',
  category: 'Flow Control',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'playlist-play',
  iconFamily: 'material',
  color: '#795548',

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
      name: 'out_1',
      type: 'any',
      label: 'Out 1',
      description: 'Première sortie',
    },
    {
      name: 'out_2',
      type: 'any',
      label: 'Out 2',
      description: 'Deuxième sortie',
    },
    {
      name: 'out_3',
      type: 'any',
      label: 'Out 3',
      description: 'Troisième sortie',
    },
    {
      name: 'complete_out',
      type: 'any',
      label: 'Complete',
      description: 'Signal de fin de séquence',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    delayBetweenSteps: 500, // Délai entre chaque sortie (ms)
    stopOnError: true, // Arrêter si une étape échoue
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
            logger.debug(`[Sequence Node ${context.nodeId}] Début de la séquence`);

            try {
              const delay = settings.delayBetweenSteps || 500;

              // Obtenir la node actuelle
              // @ts-expect-error - Accès au graph interne
              const node = signalSystem.graph?.nodes.get(context.nodeId);
              if (!node || node.outputs.length === 0) {
                return { propagate: false };
              }

              // Séparer les sorties de séquence de la sortie de complétion
              const outputs = node.outputs.slice(0, -1); // Toutes sauf la dernière
              const completeOutput = node.outputs[node.outputs.length - 1]; // Dernière sortie

              // Exécuter séquentiellement
              for (let i = 0; i < outputs.length; i++) {
                const outputId = outputs[i];
                
                if (outputId === undefined) continue;

                logger.debug(`[Sequence Node ${context.nodeId}] Étape ${i + 1}/${outputs.length}`);

                try {
                  // Émettre le signal vers cette sortie
                  await signalSystem.emitSignal(outputId, {
                    ...signal.data,
                    sequenceStep: i + 1,
                    sequenceTotal: outputs.length,
                  }, signal.context);

                  // Délai avant la prochaine étape
                  if (i < outputs.length - 1 && delay > 0) {
                    await new Promise((resolve) => setTimeout(resolve, delay));
                  }
                } catch (error) {
                  logger.error(`[Sequence Node ${context.nodeId}] Erreur à l'étape ${i + 1}:`, error);
                  
                  if (settings.stopOnError) {
                    logger.debug(`[Sequence Node ${context.nodeId}] Arrêt de la séquence sur erreur`);
                    break;
                  }
                }
              }

              // Émettre le signal de complétion
              if (completeOutput !== undefined) {
                await signalSystem.emitSignal(completeOutput, {
                  ...signal.data,
                  sequenceCompleted: true,
                }, signal.context);
              }

              logger.debug(`[Sequence Node ${context.nodeId}] Séquence terminée`);

              // Ne pas propager automatiquement
              return { propagate: false };
            } catch (error) {
              logger.error(`[Sequence Node ${context.nodeId}] Erreur:`, error);
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
  generateHTML: (settings: Record<string, any>) => {
    const delay = settings.delayBetweenSteps || 500;
    const displayDelay = delay >= 1000 ? `${delay / 1000}s` : `${delay}ms`;
    
    return `
      <div class="node-content">
        <div class="node-title">Sequence</div>
        <div class="node-subtitle">${displayDelay}</div>
      </div>
    `;
  },
};

// Enregistrer la node
registerNode(SequenceNode);

export default SequenceNode;
