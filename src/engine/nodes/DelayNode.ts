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
import { buildNodeCardHTML } from './templates/nodeCard';

const formatDelayDisplay = (delayMs: number): string => {
  const totalSeconds = delayMs / 1000;
  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds - minutes * 60;
    const minutePart = `${minutes}m`;
    const secondsPart = seconds > 0 ? `${Number.isInteger(seconds) ? seconds : Number(seconds.toFixed(2))}s` : '';
    return secondsPart ? `${minutePart} ${secondsPart}` : minutePart;
  }

  const secondsValue = Number.isInteger(totalSeconds) ? totalSeconds : Number(totalSeconds.toFixed(2));
  return `${secondsValue}s`;
};

const formatSecondsInputValue = (delayMs: number): string => {
  // When delay is 0, we prefer to show an empty input rather than "0".
  if (!delayMs || Number(delayMs) === 0) return '';
  const seconds = delayMs / 1000;
  const raw = Number.isInteger(seconds) ? `${seconds}` : `${seconds}`;
  return raw.replace('.', ',');
};

const DELAY_NODE_ACCENT = '#FF9800';

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
  color: DELAY_NODE_ACCENT,

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
    const delayMs = Number.isFinite(Number(settings.delayMs)) ? Number(settings.delayMs) : 1000;
    const safeDelay = Math.max(0, delayMs);
    const displayDelay = formatDelayDisplay(safeDelay);
  const inputValue = formatSecondsInputValue(safeDelay);
  const valueAttribute = inputValue ? `value="${inputValue}"` : '';

    const body = `
      <div class="delay-control">
        <label class="delay-label">Délai (s)</label>
        <div class="delay-input-wrapper">
          <input
            type="text"
            inputmode="decimal"
            class="delay-input"
            ${valueAttribute}
            placeholder="1,5"
          />
          <span class="delay-unit">sec</span>
        </div>
      </div>
    `;

    return buildNodeCardHTML({
      title: 'Delay',
      subtitle: displayDelay,
      iconName: 'schedule',
      category: 'Flow Control',
      accentColor: DELAY_NODE_ACCENT,
      body,
    });
  },
};

// Enregistrer la node
registerNode(DelayNode);

export default DelayNode;
