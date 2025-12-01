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

// Stocker l'état des entrées et la correspondance source -> entrée pour chaque node
const nodeInputStates = new Map<number, Map<string, boolean>>();
const nodeSourceKeyMap = new Map<number, Map<number, string>>();

const LOGIC_GATE_ACCENT = '#3F51B5';

const SUPPORTED_LOGIC_GATES = [
  { value: 'AND', label: 'AND (ET)' },
  { value: 'OR', label: 'OR (OU)' },
  { value: 'NOT', label: 'NOT (NON)' },
  { value: 'XOR', label: 'XOR' },
  { value: 'NAND', label: 'NAND' },
  { value: 'NOR', label: 'NOR' },
  { value: 'XNOR', label: 'XNOR' },
] as const;

type LogicGateType = (typeof SUPPORTED_LOGIC_GATES)[number]['value'];

function normalizeGateType(rawType?: string): LogicGateType {
  const normalized = (rawType || '').toUpperCase();
  const option = SUPPORTED_LOGIC_GATES.find((gate) => gate.value === normalized);
  return option ? option.value : SUPPORTED_LOGIC_GATES[0].value;
}

function resolveInputKey(index: number): string {
  if (index === 0) return 'input_a';
  if (index === 1) return 'input_b';
  return `input_${String.fromCharCode(97 + index)}`;
}

function getSourceInputKey(
  nodeId: number,
  sourceNodeId: number,
  availableKeys: string[]
): string {
  if (!nodeSourceKeyMap.has(nodeId)) {
    nodeSourceKeyMap.set(nodeId, new Map());
  }

  const sourceMap = nodeSourceKeyMap.get(nodeId)!;
  if (sourceMap.has(sourceNodeId)) {
    return sourceMap.get(sourceNodeId)!;
  }

  const usedKeys = new Set(sourceMap.values());
  const key = availableKeys.find((candidate) => !usedKeys.has(candidate)) || availableKeys[availableKeys.length - 1] || 'input_a';
  sourceMap.set(sourceNodeId, key);
  return key;
}

function getMinimumInputsForGate(gateType: LogicGateType): number {
  if (gateType === 'NOT') {
    return 1;
  }
  if (gateType === 'OR') {
    return 1;
  }
  return 2;
}

function resolveInputCountForGate(
  gateType: LogicGateType,
  configuredCount?: number,
  actualCount?: number
): number {
  if (gateType === 'NOT') {
    return 1;
  }

  const minInputs = getMinimumInputsForGate(gateType);
  const normalizedConfigured = Math.min(
    Math.max(
      typeof configuredCount === 'number' ? Math.floor(configuredCount) : 2,
      minInputs
    ),
    8
  );

  if (typeof actualCount === 'number' && actualCount > 0) {
    const normalizedActual = Math.min(Math.max(actualCount, minInputs), 8);

    if (gateType === 'OR') {
      return normalizedActual;
    }

    if (normalizedActual >= normalizedConfigured) {
      return normalizedActual;
    }
  }

  return normalizedConfigured;
}

function clearNodeState(nodeId: number): void {
  nodeInputStates.get(nodeId)?.clear();
  nodeSourceKeyMap.get(nodeId)?.clear();
}

const LogicGateNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'condition.logic-gate',
  name: 'Logic Gate',
  description: 'Applique des opérations logiques (AND, OR, NOT, XOR, NAND, NOR)',
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

      const requestedInputCount = Number.isFinite(Number(settings.inputCount))
        ? Number(settings.inputCount)
        : undefined;
      const actualInputCount = typeof context.inputsCount === 'number' && context.inputsCount > 0
        ? context.inputsCount
        : undefined;

      if (signalSystem) {
        // Initialiser l'état des entrées
        if (!nodeInputStates.has(context.nodeId)) {
          nodeInputStates.set(context.nodeId, new Map());
        }
        if (!nodeSourceKeyMap.has(context.nodeId)) {
          nodeSourceKeyMap.set(context.nodeId, new Map());
        }

        signalSystem.registerHandler(
          context.nodeId,
          async (signal: Signal): Promise<SignalPropagation> => {
            logger.debug(`[LogicGate Node ${context.nodeId}] Signal reçu`);

            const gateType = normalizeGateType(settings.gateType);
            const inputStates = nodeInputStates.get(context.nodeId)!;
            const invertSignal = settings.invertSignal ?? false;
            const resolvedInputCount = resolveInputCountForGate(
              gateType,
              requestedInputCount,
              actualInputCount
            );
            const inputKeys = Array.from({ length: resolvedInputCount }, (_, i) => resolveInputKey(i));

            try {
              // Mettre à jour l'état des entrées depuis le signal
              // On assume que le signal contient l'information de quelle entrée est activée
              const inputKey = signal.data?.inputKey
                || getSourceInputKey(context.nodeId, signal.sourceNodeId, inputKeys);
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
                  clearNodeState(context.nodeId);
                }

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
                case 'XNOR':
                  result = values.filter((v) => v).length !== 1;
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
                clearNodeState(context.nodeId);
              }

              // Appliquer l'inversion si nécessaire
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
                clearNodeState(context.nodeId);
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
    const gateType = normalizeGateType(settings.gateType);
    const gateLabel =
      SUPPORTED_LOGIC_GATES.find((gate) => gate.value === gateType)?.label || gateType;
    const options = SUPPORTED_LOGIC_GATES.map((gate) => {
      const selectedAttr = gate.value === gateType ? ' selected' : '';
      return `<option value="${gate.value}"${selectedAttr}>${gate.label}</option>`;
    }).join('');

    const body = `
      <div class="logic-gate-control">
        <label class="logic-gate-label">Type de logique</label>
        <div class="logic-gate-select-wrapper">
          <select class="logic-gate-select" aria-label="Choisir la logique">
            ${options}
          </select>
        </div>
        <p class="logic-gate-helper">Sélectionnez l'opération appliquée aux entrées A/B.</p>
      </div>
    `;

    return buildNodeCardHTML({
      title: 'Logic Gate',
      subtitle: gateLabel,
      iconName: 'settings_input_component',
      category: 'Condition',
      accentColor: LOGIC_GATE_ACCENT,
      chips: [{ label: gateLabel, tone: 'info' }],
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
  nodeSourceKeyMap.delete(nodeId);
}

// Fonction helper pour réinitialiser tous les états
export function resetAllLogicGateStates(): void {
  nodeInputStates.clear();
  nodeSourceKeyMap.clear();
}
