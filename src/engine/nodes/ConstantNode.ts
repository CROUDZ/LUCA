/**
 * ConstantNode - Node de valeur constante
 *
 * Catégorie: Data
 *
 * Cette node émet une valeur constante configurée.
 * Peut être utilisée comme source de données.
 *
 * Fonctionnement:
 * - Peut être déclenchée pour émettre sa valeur
 * - Ou propager une valeur constante à travers un signal reçu
 */

import { registerNode } from '../NodeRegistry';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';

const ConstantNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'data.constant',
  name: 'Constant',
  description: 'Fournit une valeur constante',
  category: 'Data',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'label',
  iconFamily: 'material',
  color: '#607D8B',

  // ============================================================================
  // INPUTS/OUTPUTS
  // ============================================================================
  inputs: [
    {
      name: 'trigger',
      type: 'any',
      label: 'Trigger',
      description: 'Déclenche l\'émission de la constante',
      required: false,
    },
  ],

  outputs: [
    {
      name: 'value_out',
      type: 'any',
      label: 'Value',
      description: 'Valeur constante',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    valueType: 'string', // 'string', 'number', 'boolean', 'json'
    stringValue: '',
    numberValue: 0,
    booleanValue: false,
    jsonValue: '{}',
    outputVariableName: '', // Si défini, stocke aussi dans une variable
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
            logger.debug(`[Constant Node ${context.nodeId}] Émission de la constante`);

            try {
              const valueType = settings.valueType || 'string';
              let value: any;

              // Déterminer la valeur selon le type
              switch (valueType) {
                case 'string':
                  value = String(settings.stringValue || '');
                  break;
                case 'number':
                  value = Number(settings.numberValue || 0);
                  break;
                case 'boolean':
                  value = Boolean(settings.booleanValue);
                  break;
                case 'json':
                  try {
                    value = JSON.parse(settings.jsonValue || '{}');
                  } catch {
                    value = {};
                  }
                  break;
                default:
                  value = null;
              }

              logger.debug(`[Constant Node ${context.nodeId}] Valeur:`, value);

              // Stocker dans une variable si demandé
              if (settings.outputVariableName) {
                signalSystem.setVariable(settings.outputVariableName, value);
              }

              return {
                propagate: true,
                data: {
                  ...signal.data,
                  constantValue: value,
                  value,
                },
              };
            } catch (error) {
              logger.error(`[Constant Node ${context.nodeId}] Erreur:`, error);
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
    const valueType = settings.valueType || 'string';
    let displayValue = '';

    switch (valueType) {
      case 'string':
        displayValue = `"${settings.stringValue || ''}"`;
        break;
      case 'number':
        displayValue = String(settings.numberValue || 0);
        break;
      case 'boolean':
        displayValue = settings.booleanValue ? 'true' : 'false';
        break;
      case 'json':
        displayValue = '{ }';
        break;
    }
    
    return `
      <div class="node-content">
        <div class="node-title">Constant</div>
        <div class="node-subtitle">${displayValue}</div>
      </div>
    `;
  },
};

// Enregistrer la node
registerNode(ConstantNode);

export default ConstantNode;
