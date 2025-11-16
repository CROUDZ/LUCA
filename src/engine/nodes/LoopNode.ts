/**
 * LoopNode - Node de boucle
 *
 * Catégorie: Flow Control
 *
 * Cette node répète la propagation d'un signal plusieurs fois.
 * Supporte les boucles comptées, conditionnelles et infinies (avec limite de sécurité).
 *
 * Fonctionnement:
 * - Reçoit un signal
 * - Répète la propagation selon le type de boucle
 * - Fournit un compteur d'itération dans les données du signal
 */

import { registerNode } from '../NodeRegistry';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';

const LoopNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'flow.loop',
  name: 'Loop',
  description: 'Répète la propagation du signal plusieurs fois',
  category: 'Flow Control',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'repeat',
  iconFamily: 'material',
  color: '#FF5722',

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
      name: 'loop_count',
      type: 'number',
      label: 'Count',
      description: 'Nombre de répétitions',
      required: false,
    },
  ],

  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: 'Signal répété',
    },
    {
      name: 'complete_out',
      type: 'any',
      label: 'Complete',
      description: 'Signal émis à la fin de la boucle',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    loopType: 'count', // 'count', 'condition', 'infinite'
    loopCount: 3, // Nombre de répétitions pour 'count'
    maxIterations: 100, // Limite de sécurité
    delayBetweenIterations: 0, // Délai entre chaque itération (ms)
    conditionVariable: '', // Variable à vérifier pour 'condition'
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
            logger.debug(`[Loop Node ${context.nodeId}] Début de la boucle`);

            try {
              const loopType = settings.loopType || 'count';
              const maxIterations = settings.maxIterations || 100;
              const delay = settings.delayBetweenIterations || 0;

              let loopCount = 0;

              if (loopType === 'count') {
                loopCount = context.inputs.loop_count !== undefined
                  ? Number(context.inputs.loop_count)
                  : (settings.loopCount || 3);
              }

              // Limiter le nombre d'itérations pour éviter les boucles infinies
              loopCount = Math.min(loopCount, maxIterations);

              // Obtenir la node actuelle
              // @ts-expect-error - Accès au graph interne
              const node = signalSystem.graph?.nodes.get(context.nodeId);
              if (!node || node.outputs.length === 0) {
                return { propagate: false };
              }

              const mainOutput = node.outputs[0];
              const completeOutput = node.outputs[1];

              // Exécuter la boucle
              for (let i = 0; i < loopCount; i++) {
                // Vérifier la condition si nécessaire
                if (loopType === 'condition' && settings.conditionVariable) {
                  const conditionValue = signalSystem.getVariable(settings.conditionVariable);
                  if (!conditionValue) {
                    logger.debug(`[Loop Node ${context.nodeId}] Condition fausse, arrêt à l'itération ${i}`);
                    break;
                  }
                }

                logger.debug(`[Loop Node ${context.nodeId}] Itération ${i + 1}/${loopCount}`);

                // Émettre le signal pour cette itération
                await signalSystem.emitSignal(mainOutput, {
                  ...signal.data,
                  loopIteration: i,
                  loopTotal: loopCount,
                  isLastIteration: i === loopCount - 1,
                }, signal.context);

                // Délai entre les itérations
                if (delay > 0 && i < loopCount - 1) {
                  await new Promise((resolve) => setTimeout(resolve, delay));
                }
              }

              // Émettre le signal de complétion si une deuxième sortie existe
              if (completeOutput !== undefined) {
                await signalSystem.emitSignal(completeOutput, {
                  ...signal.data,
                  loopCompleted: true,
                  totalIterations: loopCount,
                }, signal.context);
              }

              logger.debug(`[Loop Node ${context.nodeId}] Boucle terminée`);

              // Ne pas propager automatiquement (on l'a déjà fait manuellement)
              return { propagate: false };
            } catch (error) {
              logger.error(`[Loop Node ${context.nodeId}] Erreur:`, error);
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
    const loopType = settings.loopType || 'count';
    const loopCount = settings.loopCount || 3;
    
    let displayText = '';
    if (loopType === 'count') {
      displayText = `x${loopCount}`;
    } else if (loopType === 'condition') {
      displayText = 'while';
    } else {
      displayText = '∞';
    }
    
    return `
      <div class="node-content">
        <div class="node-title">Loop</div>
        <div class="node-subtitle">${displayText}</div>
      </div>
    `;
  },
};

// Enregistrer la node
registerNode(LoopNode);

export default LoopNode;
