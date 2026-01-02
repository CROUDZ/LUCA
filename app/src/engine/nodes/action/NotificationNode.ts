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
import { buildNodeCardHTML } from '../nodeCard';
import NotificationManager from '../../../utils/NotificationManager';

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
    notificationType: 'standard', // 'standard', 'toast'
    title: 'Notification',
    message: 'Message de notification',
  },

  // ============================================================================
  // EXÉCUTION
  // ============================================================================
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const settings = context.settings || {};
      const title = settings.title;
      const message = settings.message;
      const notificationType = settings.notificationType;
      const signalSystem = getSignalSystem();

      if (signalSystem) {
        signalSystem.registerHandler(
          context.nodeId,
          async (signal: Signal): Promise<SignalPropagation> => {
            console.log(`[Notification Node ${context.nodeId}] Affichage notification`);

            try {
              // Afficher selon le type avec le gestionnaire de notifications
              NotificationManager.show(notificationType as 'standard' | 'toast', {
                title,
                message,
              });

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
    const message = settings.message || 'Message de notification';
    const notificationType = settings.notificationType || 'alert';

    return buildNodeCardHTML({
      title: 'Notification',
      iconName: 'notifications',
      nodeId: nodeMeta?.id,
      category: 'Action',
      inputs: [
        { type: 'text', name: 'title', label: 'Titre', value: title },
        { type: 'text', name: 'message', label: 'Message', value: message },
        {
          type: 'selector',
          name: 'notificationType',
          label: 'Type',
          value: notificationType,
          options: [
            { label: 'Standard', value: 'standard' },
            { label: 'Toast', value: 'toast' },
          ],
        },
      ],
    });
  },
};

// Enregistrer la node
registerNode(NotificationNode);

export default NotificationNode;
