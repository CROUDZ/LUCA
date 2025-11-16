/**
 * MathNode - Node d'opérations mathématiques
 *
 * Catégorie: Data
 *
 * Cette node effectue des opérations mathématiques sur des valeurs.
 * Supporte les opérations de base et avancées.
 *
 * Fonctionnement:
 * - Reçoit un ou deux opérandes
 * - Applique l'opération choisie
 * - Propage le résultat dans les données du signal
 */

import { registerNode } from '../NodeRegistry';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';

const MathNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'data.math',
  name: 'Math',
  description: 'Effectue des opérations mathématiques',
  category: 'Data',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'calculate',
  iconFamily: 'material',
  color: '#00BCD4',

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
      name: 'operand_a',
      type: 'number',
      label: 'A',
      description: 'Premier opérande',
      required: false,
    },
    {
      name: 'operand_b',
      type: 'number',
      label: 'B',
      description: 'Deuxième opérande',
      required: false,
    },
  ],

  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Result',
      description: 'Résultat de l\'opération',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    operation: 'add', // 'add', 'subtract', 'multiply', 'divide', 'modulo', 'power', 'sqrt', 'abs', 'round', 'floor', 'ceil', 'min', 'max', 'random'
    operandA: 0,
    operandB: 0,
    useVariableA: false,
    useVariableB: false,
    variableNameA: '',
    variableNameB: '',
    outputVariableName: '', // Si défini, stocke le résultat dans cette variable
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
            const operation = settings.operation || 'add';
            
            logger.debug(`[Math Node ${context.nodeId}] Opération: ${operation}`);

            try {
              // Récupérer les opérandes
              let operandA: number;
              let operandB: number;

              if (context.inputs.operand_a !== undefined) {
                operandA = Number(context.inputs.operand_a);
              } else if (settings.useVariableA && settings.variableNameA) {
                operandA = Number(signalSystem.getVariable(settings.variableNameA, 0));
              } else {
                operandA = Number(settings.operandA || 0);
              }

              if (context.inputs.operand_b !== undefined) {
                operandB = Number(context.inputs.operand_b);
              } else if (settings.useVariableB && settings.variableNameB) {
                operandB = Number(signalSystem.getVariable(settings.variableNameB, 0));
              } else {
                operandB = Number(settings.operandB || 0);
              }

              let result: number;

              // Effectuer l'opération
              switch (operation) {
                case 'add':
                  result = operandA + operandB;
                  break;
                case 'subtract':
                  result = operandA - operandB;
                  break;
                case 'multiply':
                  result = operandA * operandB;
                  break;
                case 'divide':
                  result = operandB !== 0 ? operandA / operandB : 0;
                  break;
                case 'modulo':
                  result = operandB !== 0 ? operandA % operandB : 0;
                  break;
                case 'power':
                  result = Math.pow(operandA, operandB);
                  break;
                case 'sqrt':
                  result = Math.sqrt(operandA);
                  break;
                case 'abs':
                  result = Math.abs(operandA);
                  break;
                case 'round':
                  result = Math.round(operandA);
                  break;
                case 'floor':
                  result = Math.floor(operandA);
                  break;
                case 'ceil':
                  result = Math.ceil(operandA);
                  break;
                case 'min':
                  result = Math.min(operandA, operandB);
                  break;
                case 'max':
                  result = Math.max(operandA, operandB);
                  break;
                case 'random':
                  result = Math.random() * operandA;
                  break;
                default:
                  result = 0;
              }

              logger.debug(`[Math Node ${context.nodeId}] Résultat: ${result}`);

              // Stocker dans une variable si demandé
              if (settings.outputVariableName) {
                signalSystem.setVariable(settings.outputVariableName, result);
              }

              return {
                propagate: true,
                data: {
                  ...signal.data,
                  mathResult: result,
                  result,
                },
              };
            } catch (error) {
              logger.error(`[Math Node ${context.nodeId}] Erreur:`, error);
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
    const operation = settings.operation || 'add';
    const symbols: Record<string, string> = {
      add: '+',
      subtract: '-',
      multiply: '×',
      divide: '÷',
      modulo: '%',
      power: '^',
      sqrt: '√',
      abs: '| |',
      round: '≈',
      floor: '⌊ ⌋',
      ceil: '⌈ ⌉',
      min: 'min',
      max: 'max',
      random: '?',
    };
    
    return `
      <div class="node-content">
        <div class="node-title">Math</div>
        <div class="node-subtitle">${symbols[operation] || operation}</div>
      </div>
    `;
  },
};

// Enregistrer la node
registerNode(MathNode);

export default MathNode;
