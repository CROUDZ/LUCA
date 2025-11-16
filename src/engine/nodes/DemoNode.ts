/**
 * DemoNode - Node d'exemple démontrant TOUTES les fonctionnalités disponibles
 *
 * Cette node démontre :
 * - Tous les types d'inputs/outputs possibles
 * - Plusieurs modes de fonctionnement
 * - Validation des inputs
 * - Gestion d'erreurs
 * - État persistant
 * - maxInstances (limite d'instances dans le graphe)
 * - Exécution asynchrone
 * - Formatage et transformation de données
 */

import { registerNode } from '../NodeRegistry';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
 

const DemoNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'demo.complete',
  name: 'Demo Complete',
  description:
    'Demonstrates all available node features: inputs/outputs, modes, validation, limits, async execution',
  category: 'Demo',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'science',
  iconFamily: 'material',
  color: '#FF5722',

  // ============================================================================
  // LIMITES (OPTIONNELLES)
  // ============================================================================
  maxInstances: 5, // Maximum 5 instances de cette node dans le graphe

  // ============================================================================
  // INPUTS - Tous les types possibles
  // ============================================================================
  inputs: [
    {
      name: 'text',
      type: 'string',
      label: 'Text Input',
      description: 'Any text string',
      required: true,
      defaultValue: 'Hello World',
    },
    {
      name: 'number',
      type: 'number',
      label: 'Number Input',
      description: 'Any numeric value',
      required: false,
      defaultValue: 42,
    },
    {
      name: 'boolean',
      type: 'boolean',
      label: 'Boolean Flag',
      description: 'True or false',
      required: false,
      defaultValue: true,
    },
    {
      name: 'array',
      type: 'array',
      label: 'Array Input',
      description: 'Array of values',
      required: false,
      defaultValue: [1, 2, 3],
    },
    {
      name: 'object',
      type: 'object',
      label: 'Object Input',
      description: 'JSON object',
      required: false,
      defaultValue: { key: 'value' },
    },
    {
      name: 'any',
      type: 'any',
      label: 'Any Type',
      description: 'Accepts any type of data',
      required: false,
    },
  ],

  // ============================================================================
  // OUTPUTS - Plusieurs outputs de différents types
  // ============================================================================
  outputs: [
    {
      name: 'result',
      type: 'string',
      label: 'Main Result',
      description: 'Processed text result',
    },
    {
      name: 'count',
      type: 'number',
      label: 'Character Count',
      description: 'Number of characters',
    },
    {
      name: 'success',
      type: 'boolean',
      label: 'Success Flag',
      description: 'True if execution succeeded',
    },
    {
      name: 'data',
      type: 'object',
      label: 'Data Object',
      description: 'Complete execution data',
    },
    {
      name: 'timestamp',
      type: 'number',
      label: 'Timestamp',
      description: 'Execution timestamp',
    },
  ],

  // ============================================================================
  // CONFIGURATION - Paramètres par défaut
  // ============================================================================
  defaultSettings: {
    mode: 'uppercase', // Mode de traitement
    multiplier: 2, // Multiplicateur pour le mode repeat
    async: false, // Mode asynchrone
    delay: 1000, // Délai en ms pour le mode async
  },

  // ============================================================================
  // VALIDATION - Validation des inputs avant exécution
  // ============================================================================
  validate: (context: NodeExecutionContext): boolean | string => {
    const { inputs, settings } = context;
    const errors: string[] = [];

    // Validation du text
    if (!inputs.text || typeof inputs.text !== 'string') {
      errors.push('Text input is required and must be a string');
    } else if (inputs.text.length === 0) {
      errors.push('Text input cannot be empty');
    } else if (inputs.text.length > 1000) {
      errors.push('Text input must be less than 1000 characters');
    }

    // Validation du number
    if (inputs.number !== undefined && typeof inputs.number !== 'number') {
      errors.push('Number input must be a number');
    }

    // Validation du mode
    const validModes = ['uppercase', 'lowercase', 'reverse', 'repeat', 'count'];
    if (settings.mode && !validModes.includes(settings.mode)) {
      errors.push(`Invalid mode: ${settings.mode}`);
    }

    // Validation du multiplier
    if (settings.multiplier !== undefined) {
      if (typeof settings.multiplier !== 'number') {
        errors.push('Multiplier must be a number');
      } else if (settings.multiplier < 1 || settings.multiplier > 10) {
        errors.push('Multiplier must be between 1 and 10');
      }
    }

    // Retourner true si pas d'erreurs, sinon le message d'erreur
    return errors.length === 0 ? true : errors.join('; ');
  },

  // ============================================================================
  // EXECUTION - Logique principale de la node
  // ============================================================================
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    const { inputs, settings } = context;

  logger.debug('🔬 DemoNode executing with:', { inputs, settings });

    try {
      // Récupérer les inputs
      const text = String(inputs.text || '');
      const number = Number(inputs.number || 0);
      const boolean = Boolean(inputs.boolean);
      const mode = (settings.mode as string) || 'uppercase';
      const multiplier = Number(settings.multiplier || 2);
      const isAsync = Boolean(settings.async);
      const delay = Number(settings.delay || 1000);

      // Si mode async, attendre
      if (isAsync) {
        logger.debug(`⏳ DemoNode: Waiting ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Traiter selon le mode
      let result: string;
      let count: number;

      switch (mode) {
        case 'uppercase':
          result = text.toUpperCase();
          count = result.length;
          break;

        case 'lowercase':
          result = text.toLowerCase();
          count = result.length;
          break;

        case 'reverse':
          result = text.split('').reverse().join('');
          count = result.length;
          break;

        case 'repeat':
          result = text.repeat(multiplier);
          count = result.length;
          break;

        case 'count':
          result = `Text has ${text.length} characters`;
          count = text.length;
          break;

        default:
          result = text;
          count = text.length;
      }

      // Créer l'objet de données avec toutes les infos
      const data = {
        mode,
        multiplier,
        inputLength: text.length,
        outputLength: result.length,
        number,
        boolean,
        isAsync,
        delay,
        processedAt: new Date().toISOString(),
        timestamp: Date.now(),
      };

      // Log des informations
      context.log?.(`Mode: ${mode}`);
      context.log?.(`Input: "${text}" (${text.length} chars)`);
      context.log?.(`Output: "${result}" (${result.length} chars)`);

      // Retourner le résultat
      return {
        success: true,
        outputs: {
          result,
          count,
          success: true,
          data,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      logger.error('❌ DemoNode error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        outputs: {
          result: '',
          count: 0,
          success: false,
          data: {},
          timestamp: Date.now(),
        },
      };
    }
  },
};

// Enregistrer la node
registerNode(DemoNode);

export default DemoNode;
