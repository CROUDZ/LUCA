/**
 * LogicGateNode - Node de portes logiques (AND, OR, NOT, XOR, NAND, NOR)
 *
 * Catégorie: Condition
 *
 * Cette node applique des opérations logiques sur plusieurs entrées.
 * Utile pour combiner plusieurs conditions.
 *
 * Fonctionnement:
 * - Attend de recevoir des signaux sur toutes ses entrées (pour AND/OR)
 * - Applique l'opération logique choisie
 * - Propage le signal si le résultat est vrai
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

// Stocker l'état des entrées pour chaque node
const nodeInputStates = new Map<number, Map<string, boolean>>();

const LOGIC_GATE_ACCENT = '#3F51B5';

const LogicGateNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'condition.logic-gate',
  name: 'Logic Gate',
  description: 'Applique des opérations logiques (AND, OR, NOT, XOR)',
  category: 'Condition',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'settings-input-component',
  iconFamily: 'material',
  color: LOGIC_GATE_ACCENT,

  // ============================================================================
  // INPUTS/OUTPUTS
  // ============================================================================
  inputs: [
    {
      name: 'input_a',
      type: 'boolean',
      label: 'A',
      description: 'Première entrée',
      required: false,
    },
    {
      name: 'input_b',
      type: 'boolean',
      label: 'B',
      description: 'Deuxième entrée',
      required: false,
    },
  ],

  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Out',
      description: 'Sortie du résultat logique',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    gateType: 'AND', // 'AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR'
    inputCount: 2, // Nombre d'entrées (2-8)
    resetAfterEval: true, // Réinitialiser les entrées après évaluation
    invertSignal: false,
  },

  // ============================================================================
  // EXÉCUTION
  // ============================================================================
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const settings = context.settings || {};
      const signalSystem = getSignalSystem();

      if (signalSystem) {
        // Initialiser l'état des entrées
        if (!nodeInputStates.has(context.nodeId)) {
          nodeInputStates.set(context.nodeId, new Map());
        }

        signalSystem.registerHandler(
          context.nodeId,
          async (signal: Signal): Promise<SignalPropagation> => {
            logger.debug(`[LogicGate Node ${context.nodeId}] Signal reçu`);

            const gateType = settings.gateType || 'AND';
            const inputStates = nodeInputStates.get(context.nodeId)!;

            try {
              // Mettre à jour l'état des entrées depuis le signal
              // On assume que le signal contient l'information de quelle entrée est activée
              const inputKey = signal.data?.inputKey || 'input_a';
              const inputValue = signal.data?.inputValue !== undefined 
                ? Boolean(signal.data.inputValue) 
                : true;

              inputStates.set(inputKey, inputValue);

              logger.debug(
                `[LogicGate Node ${context.nodeId}] État des entrées:`,
                Object.fromEntries(inputStates)
              );

              // Pour NOT, on évalue immédiatement
              if (gateType === 'NOT') {
                const inputA = inputStates.get('input_a') || false;
                const result = !inputA;

                logger.debug(`[LogicGate Node ${context.nodeId}] NOT ${inputA} = ${result}`);

                if (settings.resetAfterEval) {
                  inputStates.clear();
                }

                // Appliquer l'inversion si nécessaire
                const invertSignal = settings.invertSignal ?? false;
                const finalResult = invertSignal ? !result : result;

                return {
                  propagate: finalResult,
                  data: {
                    ...signal.data,
                    logicResult: result,
                    finalResult,
                    inverted: invertSignal,
                    gateType,
                  },
                };
              }

              // Pour les autres portes, vérifier qu'on a toutes les entrées
              const inputCount = settings.inputCount || 2;
              const inputKeys = Array.from({ length: inputCount }, (_, i) =>
                i === 0 ? 'input_a' : i === 1 ? 'input_b' : `input_${String.fromCharCode(97 + i)}`
              );

              const allInputsReceived = inputKeys.every((key) => inputStates.has(key));

              if (!allInputsReceived) {
                logger.debug(
                  `[LogicGate Node ${context.nodeId}] Attente des autres entrées...`
                );
                // Ne pas propager, attendre les autres entrées
                return { propagate: false };
              }

              // Récupérer toutes les valeurs
              const values = inputKeys.map((key) => inputStates.get(key) || false);
              let result = false;

              // Appliquer la logique
              switch (gateType) {
                case 'AND':
                  result = values.every((v) => v);
                  break;
                case 'OR':
                  result = values.some((v) => v);
                  break;
                case 'XOR':
                  result = values.filter((v) => v).length === 1;
                  break;
                case 'NAND':
                  result = !values.every((v) => v);
                  break;
                case 'NOR':
                  result = !values.some((v) => v);
                  break;
                default:
                  result = false;
              }

              logger.debug(
                `[LogicGate Node ${context.nodeId}] ${gateType}(${values.join(', ')}) = ${result}`
              );

              // Réinitialiser les entrées si demandé
              if (settings.resetAfterEval) {
                inputStates.clear();
              }

              // Appliquer l'inversion si nécessaire
              const invertSignal = settings.invertSignal ?? false;
              const finalResult = invertSignal ? !result : result;

              return {
                propagate: finalResult,
                data: {
                  ...signal.data,
                  logicResult: result,
                  finalResult,
                  inverted: invertSignal,
                  gateType,
                  inputValues: values,
                },
              };
            } catch (error) {
              logger.error(`[LogicGate Node ${context.nodeId}] Erreur:`, error);
              if (settings.resetAfterEval) {
                inputStates.clear();
              }
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
    const gateType = settings.gateType || 'AND';
    const invertSignal = settings?.invertSignal ?? false;
    const body = `
      <div class="condition-invert-control">
        <label class="switch-label">
          <input type="checkbox" class="invert-signal-toggle" ${invertSignal ? 'checked' : ''} />
          <span class="switch-slider"></span>
          <span class="switch-text">Invert Signal</span>
        </label>
      </div>
    `;

    return buildNodeCardHTML({
      title: 'Logic Gate',
      subtitle: gateType,
      iconName: 'settings_input_component',
      category: 'Condition',
      accentColor: LOGIC_GATE_ACCENT,
      chips: [
        { label: gateType, tone: 'info' },
        { label: invertSignal ? 'Invert ON' : 'Invert OFF', tone: invertSignal ? 'warning' : 'default' },
      ],
      body,
    });
  },
};

// Enregistrer la node
registerNode(LogicGateNode);

export default LogicGateNode;

// Fonction helper pour réinitialiser l'état d'une node
export function resetLogicGateState(nodeId: number): void {
  nodeInputStates.delete(nodeId);
}

// Fonction helper pour réinitialiser tous les états
export function resetAllLogicGateStates(): void {
  nodeInputStates.clear();
}
