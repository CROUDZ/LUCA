/**
 * NotificationNode - Node d'affichage de notifications
 *
 * Catégorie: Action
 *
 * Cette node affiche une notification système ou une alerte.
 * Supporte différents types de notifications.
 *
 * Fonctionnement:
 * - Reçoit un signal
 * - Affiche une notification avec le message configuré
 * - Propage le signal après l'affichage
 */

import { registerNode } from '../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';
import { logger } from '../../utils/logger';
import { Alert } from 'react-native';

const NotificationNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'action.notification',
  name: 'Notification',
  description: 'Affiche une notification ou une alerte',
  category: 'Action',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'notifications',
  iconFamily: 'material',
  color: '#E91E63',

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
      type: 'string',
      label: 'Message',
      description: 'Message à afficher',
      required: false,
    },
  ],

  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: 'Signal de sortie après notification',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    notificationType: 'alert', // 'alert', 'console', 'toast'
    title: 'Notification',
    message: 'Message de notification',
    useVariableMessage: false,
    messageVariableName: '',
    autoPropagate: true,
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
            logger.debug(`[Notification Node ${context.nodeId}] Affichage notification`);

            try {
              // Déterminer le message
              let message: string;

              if (context.inputs.message !== undefined) {
                message = String(context.inputs.message);
              } else if (settings.useVariableMessage && settings.messageVariableName) {
                message = String(signalSystem.getVariable(settings.messageVariableName, ''));
              } else if (signal.data?.message) {
                message = String(signal.data.message);
              } else {
                message = settings.message || 'Notification';
              }

              const title = settings.title || 'Notification';
              const notificationType = settings.notificationType || 'alert';

              // Afficher selon le type
              switch (notificationType) {
                case 'alert':
                  Alert.alert(title, message);
                  break;
                case 'console':
                  logger.info(`[NOTIFICATION] ${title}: ${message}`);
                  break;
                case 'toast':
                  // Pour l'instant, utiliser console
                  // TODO: Implémenter avec react-native-toast-message
                  logger.info(`[TOAST] ${message}`);
                  break;
                default:
                  logger.info(`[NOTIFICATION] ${message}`);
              }

              return {
                propagate: settings.autoPropagate !== false,
                data: {
                  ...signal.data,
                  notificationShown: true,
                  notificationMessage: message,
                },
              };
            } catch (error) {
              logger.error(`[Notification Node ${context.nodeId}] Erreur:`, error);
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
    const message = settings.message || 'Notification';
    const shortMessage = message.length > 20 ? message.substring(0, 20) + '...' : message;
    
    return `
      <div class="node-content">
        <div class="node-title">Notification</div>
        <div class="node-subtitle">${shortMessage}</div>
      </div>
    `;
  },
};

// Enregistrer la node
registerNode(NotificationNode);

export default NotificationNode;
