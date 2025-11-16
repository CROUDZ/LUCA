/**
 * IfElseNode - Node conditionnelle avec branchement if/else
 *
 * Catégorie: Condition
 *
 * Cette node évalue une condition et dirige le flux vers une sortie "true" ou "false".
 * Elle permet de créer des branchements conditionnels dans le programme visuel.
 *
 * Fonctionnement:
 * - Reçoit un signal sur son anchor d'entrée
 * - Évalue une condition (expression JavaScript ou comparaison simple)
 * - Propage vers l'output "true" si la condition est vraie
 * - Propage vers l'output "false" si la condition est fausse
 */

import { registerNode } from '../NodeRegistry';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';

const IfElseNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'condition.if-else',
  name: 'If/Else',
  description: 'Branchement conditionnel - dirige le flux selon une condition',
  category: 'Condition',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'call-split',
  iconFamily: 'material',
  color: '#9C27B0',

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
      name: 'condition_value',
      type: 'any',
      label: 'Value',
      description: 'Valeur à évaluer (si non définie, utilise les settings)',
      required: false,
    },
  ],

  outputs: [
    {
      name: 'true_out',
      type: 'any',
      label: 'True',
      description: 'Sortie si condition vraie',
    },
    {
      name: 'false_out',
      type: 'any',
      label: 'False',
      description: 'Sortie si condition fausse',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    conditionType: 'expression', // 'expression', 'variable', 'comparison'
    expression: 'true', // Expression JavaScript à évaluer
    variableName: '', // Nom de la variable à vérifier (si conditionType === 'variable')
    comparisonOperator: '==', // '==', '!=', '>', '<', '>=', '<=', '===', '!=='
    comparisonValue: '', // Valeur de comparaison
    truthyCheck: true, // Si true, utilise le truthy check JS
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
            logger.debug(`[IfElse Node ${context.nodeId}] Évaluation de la condition`);

            let conditionResult = false;

            try {
              // Déterminer la valeur à tester
              let testValue: any;

              if (context.inputs.condition_value !== undefined) {
                testValue = context.inputs.condition_value;
              } else if (settings.conditionType === 'variable' && settings.variableName) {
                testValue = signalSystem.getVariable(settings.variableName);
              } else if (settings.conditionType === 'expression' && settings.expression) {
                // Évaluer l'expression JavaScript
                // ATTENTION: eval est dangereux en production, utiliser un parser sécurisé
                const variables = signalSystem.getAllVariables();
                const evalFunc = new Function(
                  ...Object.keys(variables),
                  'signal',
                  `return ${settings.expression};`
                );
                testValue = evalFunc(...Object.values(variables), signal);
                conditionResult = Boolean(testValue);
              } else {
                testValue = signal.data;
              }

              // Évaluer la condition selon le type
              if (settings.conditionType === 'comparison' && testValue !== undefined) {
                const compareValue = settings.comparisonValue;
                const operator = settings.comparisonOperator;

                switch (operator) {
                  case '==':
                    conditionResult = testValue == compareValue;
                    break;
                  case '===':
                    conditionResult = testValue === compareValue;
                    break;
                  case '!=':
                    conditionResult = testValue != compareValue;
                    break;
                  case '!==':
                    conditionResult = testValue !== compareValue;
                    break;
                  case '>':
                    conditionResult = testValue > compareValue;
                    break;
                  case '<':
                    conditionResult = testValue < compareValue;
                    break;
                  case '>=':
                    conditionResult = testValue >= compareValue;
                    break;
                  case '<=':
                    conditionResult = testValue <= compareValue;
                    break;
                  default:
                    conditionResult = Boolean(testValue);
                }
              } else if (settings.conditionType !== 'expression') {
                // Truthy check simple
                conditionResult = settings.truthyCheck ? Boolean(testValue) : testValue === true;
              }

              logger.debug(
                `[IfElse Node ${context.nodeId}] Condition: ${conditionResult ? 'TRUE' : 'FALSE'}`
              );

              // Obtenir les IDs des nodes de sortie
              const node = signalSystem['graph'].nodes.get(context.nodeId);
              if (!node) {
                return { propagate: false };
              }

              // Déterminer quelle sortie activer
              // outputs[0] = true, outputs[1] = false (par convention)
              const targetOutputs = conditionResult
                ? [node.outputs[0]].filter(Boolean)
                : [node.outputs[1]].filter(Boolean);

              return {
                propagate: true,
                data: {
                  ...signal.data,
                  conditionResult,
                  conditionValue: testValue,
                },
                targetOutputs,
              };
            } catch (error) {
              logger.error(`[IfElse Node ${context.nodeId}] Erreur d'évaluation:`, error);
              // En cas d'erreur, aller vers false
              const node = signalSystem['graph'].nodes.get(context.nodeId);
              return {
                propagate: true,
                data: { ...signal.data, error: String(error) },
                targetOutputs: node ? [node.outputs[1]].filter(Boolean) : [],
              };
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
    const type = settings.conditionType || 'expression';
    let displayText = '';

    if (type === 'expression') {
      displayText = settings.expression || 'true';
    } else if (type === 'variable') {
      displayText = `var: ${settings.variableName || '?'}`;
    } else if (type === 'comparison') {
      displayText = `? ${settings.comparisonOperator || '=='} ${settings.comparisonValue || ''}`;
    }

    return `
      <div class="node-content">
        <div class="node-title">If/Else</div>
        <div class="node-subtitle">${displayText}</div>
      </div>
    `;
  },
};

// Enregistrer la node
registerNode(IfElseNode);

export default IfElseNode;
