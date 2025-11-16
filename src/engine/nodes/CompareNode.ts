/**
 * CompareNode - Node de comparaison de valeurs
 *
 * Catégorie: Condition
 *
 * Cette node compare deux valeurs et propage le signal si la comparaison est vraie.
 * Plus simple que IfElseNode, elle n'a qu'une seule sortie.
 *
 * Fonctionnement:
 * - Reçoit un signal avec deux valeurs à comparer
 * - Effectue la comparaison selon l'opérateur choisi
 * - Propage le signal si la comparaison est vraie
 * - Bloque le signal si la comparaison est fausse
 */

import { registerNode } from '../NodeRegistry';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';

const CompareNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'condition.compare',
  name: 'Compare',
  description: 'Compare deux valeurs et propage si la condition est vraie',
  category: 'Condition',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'compare-arrows',
  iconFamily: 'material',
  color: '#673AB7',

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
      name: 'value_a',
      type: 'any',
      label: 'Value A',
      description: 'Première valeur',
      required: false,
    },
    {
      name: 'value_b',
      type: 'any',
      label: 'Value B',
      description: 'Deuxième valeur',
      required: false,
    },
  ],

  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: 'Sortie si comparaison vraie',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    operator: '===', // '===', '!==', '>', '<', '>=', '<=', '==', '!='
    valueA: null,
    valueB: null,
    useVariableA: false,
    useVariableB: false,
    variableNameA: '',
    variableNameB: '',
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
            logger.debug(`[Compare Node ${context.nodeId}] Comparaison en cours`);

            try {
              // Récupérer les valeurs à comparer
              let valueA: any;
              let valueB: any;

              if (context.inputs.value_a !== undefined) {
                valueA = context.inputs.value_a;
              } else if (settings.useVariableA && settings.variableNameA) {
                valueA = signalSystem.getVariable(settings.variableNameA);
              } else {
                valueA = settings.valueA;
              }

              if (context.inputs.value_b !== undefined) {
                valueB = context.inputs.value_b;
              } else if (settings.useVariableB && settings.variableNameB) {
                valueB = signalSystem.getVariable(settings.variableNameB);
              } else {
                valueB = settings.valueB;
              }

              const operator = settings.operator || '===';
              let result = false;

              // Effectuer la comparaison
              switch (operator) {
                case '===':
                  result = valueA === valueB;
                  break;
                case '!==':
                  result = valueA !== valueB;
                  break;
                case '>':
                  result = valueA > valueB;
                  break;
                case '<':
                  result = valueA < valueB;
                  break;
                case '>=':
                  result = valueA >= valueB;
                  break;
                case '<=':
                  result = valueA <= valueB;
                  break;
                case '==':
                  // eslint-disable-next-line eqeqeq
                  result = valueA == valueB;
                  break;
                case '!=':
                  // eslint-disable-next-line eqeqeq
                  result = valueA != valueB;
                  break;
                default:
                  result = false;
              }

              logger.debug(
                `[Compare Node ${context.nodeId}] ${valueA} ${operator} ${valueB} = ${result}`
              );

              return {
                propagate: result,
                data: {
                  ...signal.data,
                  comparisonResult: result,
                  valueA,
                  valueB,
                  operator,
                },
              };
            } catch (error) {
              logger.error(`[Compare Node ${context.nodeId}] Erreur:`, error);
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
    const operator = settings.operator || '===';
    return `
      <div class="node-content">
        <div class="node-title">Compare</div>
        <div class="node-subtitle">${operator}</div>
      </div>
    `;
  },
};

// Enregistrer la node
registerNode(CompareNode);

export default CompareNode;
