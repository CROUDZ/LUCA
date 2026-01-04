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

import { registerNode } from '../../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeMeta,
} from '../../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../../SignalSystem';
import { buildNodeCardHTML } from '../nodeCard';

// Stocker l'état des entrées et la correspondance source -> entrée pour chaque node
const nodeInputStates = new Map<number, Map<string, boolean>>();
const nodeSourceKeyMap = new Map<number, Map<number, string>>();


/**
 * Génère une clé d'entrée à partir d'un index (0 -> 'input_a', 1 -> 'input_b', etc.)
 */
function resolveInputKey(index: number): string {
  const letter = String.fromCharCode(97 + index); // 97 = 'a'
  return `input_${letter}`;
}

function getSourceInputKey(nodeId: number, sourceNodeId: number, availableKeys: string[]): string {
  if (!nodeSourceKeyMap.has(nodeId)) {
    nodeSourceKeyMap.set(nodeId, new Map());
  }

  const sourceMap = nodeSourceKeyMap.get(nodeId)!;
  if (sourceMap.has(sourceNodeId)) {
    return sourceMap.get(sourceNodeId)!;
  }

  const usedKeys = new Set(sourceMap.values());
  const key =
    availableKeys.find((candidate) => !usedKeys.has(candidate)) ||
    availableKeys[availableKeys.length - 1] ||
    'input_a';
  sourceMap.set(sourceNodeId, key);
  return key;
}

function resolveInputCountForGate(
  configuredCount?: number,
  actualCount?: number
): number {
  const minInputs = 2; // AND et XOR nécessitent au moins 2 entrées
  const normalizedConfigured = Math.min(
    Math.max(typeof configuredCount === 'number' ? Math.floor(configuredCount) : 2, minInputs),
    8
  );

  if (typeof actualCount === 'number' && actualCount > 0) {
    const normalizedActual = Math.min(Math.max(actualCount, minInputs), 8);
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
  description: 'Applique des opérations logiques (AND, XOR)',
  category: 'Control',
  doc: `excerpt: Combine plusieurs conditions avec de la logique.
---
Ce bloc vous permet de combiner plusieurs signaux en utilisant des règles logiques simples. Par exemple, vous pouvez dire "avancer que si deux conditions sont vraies" ou "avancer si une seule condition est vraie".

**Comment l'utiliser :**
1. Choisissez le type de logique : AND (toutes les conditions) ou XOR (exactement une)
2. Connectez plusieurs signaux en entrée
3. Le bloc attend les signaux et applique la logique
4. Il propage le signal si le résultat est correct
5. Parfait pour créer des flux complexes !`,

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'settings-input-component',
  iconFamily: 'material',

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    gateType: 'AND', // 'AND' ou 'XOR'
    resetAfterEval: true, // Réinitialiser les entrées après évaluation
  },

  // ============================================================================
  // EXÉCUTION
  // ============================================================================
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const settings = context.settings || {};
      const gateType = settings.gateType;
      const signalSystem = getSignalSystem();

      const actualInputCount =
        typeof context.inputsCount === 'number' && context.inputsCount > 0
          ? context.inputsCount
          : undefined;
      console.log(`[LogicGate Node ${context.nodeId}] Initialized with ${actualInputCount ?? 'unknown'} inputs`);

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
            // Utiliser les données source du SignalSystem pour debug
            const activeSources = signalSystem.getActiveSourcesFor(context.nodeId);
            const sourceData = signalSystem.getNodeSourceData(context.nodeId);
            
            console.log(`[LogicGate Node ${context.nodeId}] Signal reçu de node ${signal.sourceNodeId}: ${signal.state}`);
            console.log(`[LogicGate Node ${context.nodeId}] Sources actives: [${activeSources.join(', ')}]`);
            console.log(`[LogicGate Node ${context.nodeId}] Données sources:`, Object.fromEntries(sourceData));

            // Si le signal est un OFF explicite (trigger arrêté), réinitialiser et propager OFF
            if (signal.state === 'OFF' && signal.explicitOff) {
              console.log(`[LogicGate Node ${context.nodeId}] OFF explicite reçu, propagation forcée`);
              clearNodeState(context.nodeId);

              // Propager directement le OFF explicite
              return {
                propagate: true,
                state: 'OFF',
                data: { ...signal.data, logicResult: false, finalResult: false, stopped: true },
              };
            }

            // Signal OFF normal (une source se désactive)
            // Mettre à jour l'état de cette entrée à false et réévaluer
            if (signal.state === 'OFF') {
              // S'assurer que les maps existent
              if (!nodeInputStates.has(context.nodeId)) {
                return { propagate: false, data: signal.data };
              }
              
              const inputStates = nodeInputStates.get(context.nodeId)!;
              const inputKeys = Array.from({ length: actualInputCount ?? 2 }, (_, i) =>
                resolveInputKey(i)
              );
              
              // Trouver la clé de cette source et la mettre à false
              const inputKey = getSourceInputKey(context.nodeId, signal.sourceNodeId, inputKeys);
              const previousValue = inputStates.get(inputKey);
              inputStates.set(inputKey, false);
              
              console.log(`[LogicGate Node ${context.nodeId}] Source ${signal.sourceNodeId} OFF, input ${inputKey}: ${previousValue} -> false`);
              console.log(`[LogicGate Node ${context.nodeId}] État des entrées après OFF:`, Object.fromEntries(inputStates));
              
              // Pour une porte AND, si une entrée devient false, le résultat devient false
              // On doit propager OFF seulement si on avait propagé ON avant
              // Le SignalSystem gère ça avec activeConnections
              
              // Ne pas propager le OFF ici, le SignalSystem s'en charge
              // via le tracking des activeConnections
              return { propagate: false, data: signal.data };
            }

            // S'assurer que l'état existe même si quelqu'un l'a réinitialisé via helpers
            if (!nodeInputStates.has(context.nodeId)) {
              nodeInputStates.set(context.nodeId, new Map());
            }
            if (!nodeSourceKeyMap.has(context.nodeId)) {
              nodeSourceKeyMap.set(context.nodeId, new Map());
            }

            const inputStates = nodeInputStates.get(context.nodeId)!;
            const resolvedInputCount = resolveInputCountForGate(
              actualInputCount
            );
            const inputKeys = Array.from({ length: resolvedInputCount }, (_, i) =>
              resolveInputKey(i)
            );

            try {
              // Mettre à jour l'état des entrées depuis le signal
              const inputKey =
                signal.data?.inputKey ||
                getSourceInputKey(context.nodeId, signal.sourceNodeId, inputKeys);
              const inputValue =
                signal.data?.inputValue !== undefined ? Boolean(signal.data.inputValue) : true;

              inputStates.set(inputKey, inputValue);

              console.log(
                `[LogicGate Node ${context.nodeId}] État des entrées:`,
                Object.fromEntries(inputStates)
              );

              // Récupérer les valeurs actuelles
              const values = inputKeys.map((key) => inputStates.get(key) ?? false);
              const receivedKeys = inputKeys.filter((key) => inputStates.has(key));
              const receivedCount = receivedKeys.length;
              const allInputsReceived = receivedCount === inputKeys.length;

              console.log(
                `[LogicGate Node ${context.nodeId}] Entrées reçues: ${receivedCount}/${inputKeys.length}, valeurs: [${values.join(', ')}]`
              );

              let result = false;
              let canEvaluateNow = false;

              // Vérifier si au moins une entrée reçue est false
              const hasReceivedFalse = receivedKeys.some((key) => inputStates.get(key) === false);

              // Logique d'évaluation
              if (gateType === 'AND') {
                // AND: Court-circuit si une entrée est false, sinon attend toutes les entrées
                if (hasReceivedFalse) {
                  result = false;
                  canEvaluateNow = true;
                } else if (allInputsReceived) {
                  result = values.every((v) => v);
                  canEvaluateNow = true;
                }
              } else if (gateType === 'XOR') {
                // XOR: Doit attendre toutes les entrées - exactement une doit être true
                if (allInputsReceived) {
                  result = values.filter((v) => v).length === 1;
                  canEvaluateNow = true;
                }
              }

              if (!canEvaluateNow) {
                console.log(`[LogicGate Node ${context.nodeId}] Attente des autres entrées pour ${gateType}...`);
                return { propagate: false };
              }

              console.log(
                `[LogicGate Node ${context.nodeId}] ${gateType}(${values.join(', ')}) = ${result}`
              );

              // Réinitialiser les entrées si demandé
              if (settings.resetAfterEval) {
                clearNodeState(context.nodeId);
              }

              return {
                propagate: result,
                state: result ? 'ON' : 'OFF',
                data: {
                  ...signal.data,
                  logicResult: result,
                  gateType,
                  inputValues: values,
                },
              };
            } catch (error) {
              console.error(`[LogicGate Node ${context.nodeId}] Erreur:`, error);
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
  generateHTML: (settings: Record<string, any>, nodeMeta?: NodeMeta) => {
    const gateType = settings.gateType;

    return buildNodeCardHTML({
      title: 'Logic Gate',
      iconName: 'settings_input_component',
      category: 'Control',
      nodeId: nodeMeta?.id,
      inputs: [
        {
          type: 'selector',
          name: 'gateType',
          label: 'Type de logique',
          value: gateType,
          options: [
            { value: 'AND', label: 'AND - Toutes les entrées doivent être vraies' },
            { value: 'XOR', label: 'XOR - Exactement une entrée doit être vraie' },
          ],
        },
      ],
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
