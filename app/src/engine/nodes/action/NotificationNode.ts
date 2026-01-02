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

import { registerNode } from '../../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeMeta,
} from '../../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../../SignalSystem';
import { Alert } from 'react-native';
import { buildNodeCardHTML } from '../nodeCard';

const NOTIFICATION_NODE_ACCENT = '#E91E63';

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
  color: NOTIFICATION_NODE_ACCENT,

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
            console.log(`[Notification Node ${context.nodeId}] Affichage notification`);

            if (signal.state === 'OFF') {
              return {
                propagate: settings.autoPropagate !== false,
                state: 'OFF',
                data: { ...signal.data, notificationSkipped: 'off' },
              };
            }

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
                  console.log(`[NOTIFICATION] ${title}: ${message}`);
                  break;
                case 'toast':
                  // Pour l'instant, utiliser console
                  // TODO: Implémenter avec react-native-toast-message
                  console.log(`[TOAST] ${message}`);
                  break;
                default:
                  console.log(`[NOTIFICATION] ${message}`);
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
              console.error(`[Notification Node ${context.nodeId}] Erreur:`, error);
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
    const title = settings.title || 'Notification';
    const shortTitle = title.length > 22 ? `${title.substring(0, 22)}…` : title;
    const message = settings.message || 'Message de notification';
    const shortMessage = message.length > 22 ? `${message.substring(0, 22)}…` : message;
    const notificationType = settings.notificationType || 'alert';

    const body = `
      <div class="notification-control">
        <label class="notification-field">
          <span class="notification-label">Titre</span>
          <input type="text" class="notification-title-input" value="${title}" placeholder="Titre" />
        </label>
        <label class="notification-field">
          <span class="notification-label">Message</span>
          <input type="text" class="notification-message-input" value="${message}" placeholder="Message" />
        </label>
        <label class="notification-field notification-type-field">
          <span class="notification-label">Type</span>
          <select class="notification-type-select">
            <option value="alert" ${notificationType === 'alert' ? 'selected' : ''}>Alert</option>
            <option value="console" ${
              notificationType === 'console' ? 'selected' : ''
            }>Console</option>
            <option value="toast" ${notificationType === 'toast' ? 'selected' : ''}>Toast</option>
          </select>
        </label>
      </div>
    `;

    return buildNodeCardHTML({
      title: 'Notification',
      subtitle: shortTitle,
      iconName: 'notifications',
      category: nodeMeta?.category || 'Action',
      accentColor: NOTIFICATION_NODE_ACCENT,
      chips: [
        {
          label: notificationType.toUpperCase(),
          tone: notificationType === 'alert' ? 'warning' : 'info',
        },
      ],
      description: `Message: ${shortMessage}`,
      body,
    });
  },
};

// Enregistrer la node
registerNode(NotificationNode);

export default NotificationNode;
