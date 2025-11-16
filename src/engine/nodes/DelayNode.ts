/**
 * DelayNode - Node de délai temporel
 *
 * Catégorie: Flow Control
 *
 * Cette node introduit un délai avant de propager le signal.
 * Utile pour créer des séquences temporisées.
 *
 * Fonctionnement:
 * - Reçoit un signal
 * - Attend pendant un délai configuré
 * - Propage le signal après le délai
 */

import { registerNode } from '../NodeRegistry';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';

const DelayNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'flow.delay',
  name: 'Delay',
  description: 'Introduit un délai avant de propager le signal',
  category: 'Flow Control',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'schedule',
  iconFamily: 'material',
  color: '#FF9800',

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
      name: 'delay_ms',
      type: 'number',
      label: 'Delay (ms)',
      description: 'Délai en millisecondes',
      required: false,
    },
  ],

  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: 'Signal de sortie (après délai)',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    delayMs: 1000, // Délai en millisecondes
    useVariableDelay: false, // Utiliser une variable pour le délai
    delayVariableName: '', // Nom de la variable contenant le délai
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
            logger.debug(`[Delay Node ${context.nodeId}] Délai en cours...`);

            try {
              // Déterminer le délai
              let delayMs: number;

              if (context.inputs.delay_ms !== undefined) {
                delayMs = Number(context.inputs.delay_ms);
              } else if (settings.useVariableDelay && settings.delayVariableName) {
                delayMs = Number(signalSystem.getVariable(settings.delayVariableName, settings.delayMs));
              } else {
                delayMs = settings.delayMs || 1000;
              }

              // S'assurer que le délai est positif
              delayMs = Math.max(0, delayMs);

              logger.debug(`[Delay Node ${context.nodeId}] Attente de ${delayMs}ms`);

              // Attendre
              await new Promise((resolve) => setTimeout(resolve, delayMs));

              logger.debug(`[Delay Node ${context.nodeId}] Délai terminé, propagation`);

              return {
                propagate: true,
                data: {
                  ...signal.data,
                  delayApplied: delayMs,
                },
              };
            } catch (error) {
              logger.error(`[Delay Node ${context.nodeId}] Erreur:`, error);
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
    const delayMs = settings.delayMs || 1000;
    const displayDelay = delayMs >= 1000 ? `${delayMs / 1000}s` : `${delayMs}ms`;
    
    return `
      <div class="node-content">
        <div class="node-title">Delay</div>
        <div class="node-subtitle">${displayDelay}</div>
      </div>
    `;
  },
};

// Enregistrer la node
registerNode(DelayNode);

export default DelayNode;
