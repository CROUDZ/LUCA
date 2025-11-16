/**
 * VariableNode - Node de gestion des variables
 *
 * Catégorie: Data
 *
 * Cette node permet de lire et d'écrire des variables dans le contexte global.
 * Les variables sont partagées entre toutes les nodes du graphe.
 *
 * Fonctionnement:
 * - Mode GET: Lit une variable et la place dans les données du signal
 * - Mode SET: Écrit une valeur dans une variable
 * - Mode DELETE: Supprime une variable
 */

import { registerNode } from '../NodeRegistry';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';

const VariableNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'data.variable',
  name: 'Variable',
  description: 'Lit ou écrit une variable dans le contexte global',
  category: 'Data',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'variable',
  iconFamily: 'material',
  color: '#009688',

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
      name: 'value',
      type: 'any',
      label: 'Value',
      description: 'Valeur à écrire (mode SET)',
      required: false,
    },
  ],

  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: 'Signal de sortie avec la variable',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    mode: 'get', // 'get', 'set', 'delete'
    variableName: 'myVariable',
    defaultValue: null, // Valeur par défaut pour GET si la variable n'existe pas
    setValue: null, // Valeur fixe pour SET (si pas d'input)
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
            const mode = settings.mode || 'get';
            const variableName = settings.variableName || 'myVariable';

            logger.debug(`[Variable Node ${context.nodeId}] Mode: ${mode}, Variable: ${variableName}`);

            try {
              if (mode === 'get') {
                // Lire la variable
                const value = signalSystem.getVariable(variableName, settings.defaultValue);
                
                logger.debug(`[Variable Node ${context.nodeId}] GET ${variableName} =`, value);

                return {
                  propagate: true,
                  data: {
                    ...signal.data,
                    [variableName]: value,
                    variableValue: value,
                  },
                };
              } else if (mode === 'set') {
                // Écrire la variable
                let valueToSet: any;

                if (context.inputs.value !== undefined) {
                  valueToSet = context.inputs.value;
                } else if (signal.data?.value !== undefined) {
                  valueToSet = signal.data.value;
                } else {
                  valueToSet = settings.setValue;
                }

                signalSystem.setVariable(variableName, valueToSet);
                
                logger.debug(`[Variable Node ${context.nodeId}] SET ${variableName} =`, valueToSet);

                return {
                  propagate: true,
                  data: {
                    ...signal.data,
                    variableSet: true,
                    variableName,
                    variableValue: valueToSet,
                  },
                };
              } else if (mode === 'delete') {
                // Supprimer la variable
                const deleted = signalSystem.deleteVariable(variableName);
                
                logger.debug(
                  `[Variable Node ${context.nodeId}] DELETE ${variableName}: ${deleted ? 'success' : 'not found'}`
                );

                return {
                  propagate: true,
                  data: {
                    ...signal.data,
                    variableDeleted: deleted,
                    variableName,
                  },
                };
              }

              return { propagate: false };
              } catch (error) {
              logger.error(`[Variable Node ${context.nodeId}] Erreur:`, error);
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
    const mode = (settings.mode || 'get').toUpperCase();
    const variableName = settings.variableName || 'myVariable';
    
    return `
      <div class="node-content">
        <div class="node-title">Variable</div>
        <div class="node-subtitle">${mode}: ${variableName}</div>
      </div>
    `;
  },
};

// Enregistrer la node
registerNode(VariableNode);

export default VariableNode;
