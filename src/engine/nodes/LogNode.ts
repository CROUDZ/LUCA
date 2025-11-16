/**
 * LogNode - Node de journalisation
 *
 * Catégorie: Action
 *
 * Cette node enregistre des messages dans la console ou un système de logs.
 * Utile pour le debug et le monitoring.
 *
 * Fonctionnement:
 * - Reçoit un signal
 * - Enregistre le message avec le niveau choisi
 * - Propage le signal
 */

import { registerNode } from '../NodeRegistry';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';

const LogNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'action.log',
  name: 'Log',
  description: 'Enregistre des messages dans les logs',
  category: 'Action',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'article',
  iconFamily: 'material',
  color: '#795548',

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
      name: 'message',
      type: 'any',
      label: 'Message',
      description: 'Message à logger',
      required: false,
    },
  ],

  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: 'Signal de sortie',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    message: '',
    logSignalData: true, // Logger aussi les données du signal
    useVariableMessage: false,
    messageVariableName: '',
    prefix: '[LOG]',
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
            try {
              // Déterminer le message
              let message: any;

              if (context.inputs.message !== undefined) {
                message = context.inputs.message;
              } else if (settings.useVariableMessage && settings.messageVariableName) {
                message = signalSystem.getVariable(settings.messageVariableName);
              } else {
                message = settings.message || '';
              }

              const logLevel = settings.logLevel || 'info';
              const prefix = settings.prefix || '[LOG]';

              // Construire le message complet
              let fullMessage = `${prefix} ${message}`;

              if (settings.logSignalData && signal.data) {
                fullMessage += ` | Data: ${JSON.stringify(signal.data)}`;
              }

              // Logger selon le niveau
              switch (logLevel) {
                case 'debug':
                  logger.debug(fullMessage);
                  break;
                case 'info':
                  logger.info(fullMessage);
                  break;
                case 'warn':
                  logger.warn(fullMessage);
                  break;
                case 'error':
                  logger.error(fullMessage);
                  break;
                default:
                  logger.debug(fullMessage);
              }

              return {
                propagate: true,
                data: {
                  ...signal.data,
                  logged: true,
                  logMessage: message,
                },
              };
            } catch (error) {
              logger.error(`[Log Node ${context.nodeId}] Erreur:`, error);
              return { propagate: true }; // Propager quand même en cas d'erreur de log
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
    const logLevel = settings.logLevel || 'info';
    const icons: Record<string, string> = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    };
    
    return `
      <div class="node-content">
        <div class="node-title">Log</div>
        <div class="node-subtitle">${icons[logLevel]} ${logLevel}</div>
      </div>
    `;
  },
};

// Enregistrer la node
registerNode(LogNode);

export default LogNode;
