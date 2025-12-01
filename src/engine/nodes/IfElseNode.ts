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
import { buildNodeCardHTML } from './templates/nodeCard';

// Helper: disallow some dangerous strings that would let user code access Node internals
const DISALLOWED_TOKENS = [
  'process',
  'global',
  'globalThis',
  'require',
  'Function(',
  'Function ',
  'constructor',
  'eval(',
  'eval ',
  'while ',
  'for ',
  '=>',
];

function isExpressionSafe(expr: string | undefined): boolean {
  if (!expr) return false;
  const normalized = String(expr);
  for (const token of DISALLOWED_TOKENS) {
    if (normalized.includes(token)) return false;
  }
  return true;
}

function safeEvalExpression(expression: string, variables: Record<string, any>, signal: Signal) {
  // Small wrapper around new Function, with a basic safety check.
  // This is *not* a true sandbox — we keep it minimal and explicitly check tokens above.
  // The expression must be a single expression (no statements such as loops, function definitions...)
  const argNames = Object.keys(variables || {});
  const argValues = Object.values(variables || {});
  // Provide 'signal' as last param
  argNames.push('signal');
  argValues.push(signal);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...argNames, `return (${expression});`);
  return fn(...argValues);
}

const IF_ELSE_NODE_ACCENT = '#9C27B0';

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
  color: IF_ELSE_NODE_ACCENT,

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
    invertSignal: false,
  },

  // ============================================================================
  // EXÉCUTION
  // ============================================================================
  validate: (context: NodeExecutionContext): boolean | string => {
    const { settings } = context;
    const conditionType = settings?.conditionType || 'expression';
    // noop debug removed

    if (conditionType === 'expression' && !settings.expression) {
      return 'Expression manquante pour la condition';
    }

    if (conditionType === 'variable' && !settings.variableName) {
      return 'Nom de variable manquant pour la condition';
    }

    if (conditionType === 'comparison' && (settings.comparisonValue === undefined || settings.comparisonOperator === undefined)) {
      return 'Opérateur/valeur de comparaison manquant';
    }

    // Basic safety check for the expression
    if (conditionType === 'expression' && !isExpressionSafe(settings.expression)) {
      logger.warn(`[IfElse Node ${context.nodeId}] Unsafe expression blocked:`, settings.expression);
      return 'L\'expression contient des tokens non sûrs';
    }

    return true;
  },

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
                  if (!isExpressionSafe(settings.expression)) {
                    throw new Error('Expression contains disallowed tokens');
                  }
                  // Evaluate safely in the simplest way we can in this environment
                  const variables = signalSystem.getAllVariables();
                  testValue = safeEvalExpression(settings.expression, variables, signal);
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
                    // eslint-disable-next-line eqeqeq
                    conditionResult = testValue == compareValue;
                    break;
                  case '===':
                    conditionResult = testValue === compareValue;
                    break;
                  case '!=':
                    // eslint-disable-next-line eqeqeq
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
              // Temporary debug removed; we use logger.debug instead

              // Appliquer l'inversion si nécessaire
              const invertSignal = settings.invertSignal ?? false;
              const finalResult = invertSignal ? !conditionResult : conditionResult;
              // Debug after finalizing result
              logger.debug(`[IfElse Node ${context.nodeId}] testValue=${testValue} conditionResult=${conditionResult} invert=${invertSignal} finalResult=${finalResult}`);

              // Obtenir les IDs des nodes de sortie
              // eslint-disable-next-line dot-notation
              const node = signalSystem['graph'].nodes.get(context.nodeId);
              if (!node) {
                return { propagate: false };
              }

              // Déterminer quelle sortie activer
              // outputs[0] = true, outputs[1] = false (par convention)
              const targetOutputs = finalResult
                ? [node.outputs[0]].filter(Boolean)
                : [node.outputs[1]].filter(Boolean);

              const shouldPropagate = targetOutputs.length > 0;

              return {
                // Propagate only if we have target outputs
                propagate: shouldPropagate,
                data: {
                  ...signal.data,
                  conditionResult,
                  finalResult,
                  inverted: invertSignal,
                  conditionValue: testValue,
                },
                targetOutputs,
              };
            } catch (error) {
              logger.error(`[IfElse Node ${context.nodeId}] Erreur d'évaluation:`, error);
              // En cas d'erreur, aller vers false
              // eslint-disable-next-line dot-notation
              const node = signalSystem['graph'].nodes.get(context.nodeId);
              const errorTargetOutputs = node ? [node.outputs[1]].filter(Boolean) : [];
              return {
                // on error, ne pas stopper le graphe; router vers la sortie false si existante
                propagate: errorTargetOutputs.length > 0,
                data: { ...signal.data, error: String(error) },
                targetOutputs: errorTargetOutputs,
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

    // no invert control: UI simplified
    const body = ``;

    return buildNodeCardHTML({
      title: 'If/Else',
      subtitle: displayText,
      iconName: 'call_split',
      category: 'Condition',
      accentColor: IF_ELSE_NODE_ACCENT,
  chips: [{ label: type.toUpperCase(), tone: 'info' }],
  body,
    });
  },
};

// Enregistrer la node
registerNode(IfElseNode);

export default IfElseNode;
