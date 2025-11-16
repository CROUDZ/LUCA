/**
 * EventListenerNode - Node d'écoute d'événements
 *
 * Catégorie: Events
 *
 * Cette node écoute des événements personnalisés émis par EventEmitterNode.
 * Quand l'événement est reçu, elle émet un signal.
 *
 * Fonctionnement:
 * - S'abonne à un événement au démarrage
 * - Quand l'événement est reçu, émet un signal avec les données de l'événement
 * - Peut filtrer les événements selon des critères
 */

import { registerNode } from '../NodeRegistry';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem } from '../SignalSystem';

// Stocker les désabonnements pour chaque node
const nodeUnsubscribers = new Map<number, (() => void)[]>();

const EventListenerNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'events.listener',
  name: 'Event Listener',
  description: 'Écoute un événement personnalisé et émet un signal',
  category: 'Events',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'hearing',
  iconFamily: 'material',
  color: '#03A9F4',

  // ============================================================================
  // INPUTS/OUTPUTS
  // ============================================================================
  inputs: [],

  outputs: [
    {
      name: 'event_out',
      type: 'any',
      label: 'Event Out',
      description: 'Signal émis lors de la réception d\'un événement',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    eventName: 'customEvent',
    storeInVariable: false,
    variableName: 'lastEventData',
    filterEnabled: false, // Activer le filtrage
    filterProperty: '', // Propriété à vérifier dans les données
    filterValue: '', // Valeur attendue
  },

  // ============================================================================
  // EXÉCUTION
  // ============================================================================
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const settings = context.settings || {};
      const signalSystem = getSignalSystem();

      if (signalSystem) {
        const eventName = settings.eventName || 'customEvent';

  logger.debug(`[EventListener Node ${context.nodeId}] Écoute de l'événement: ${eventName}`);

        // S'abonner à l'événement
        const unsubscribe = signalSystem.subscribeToEvent(
          eventName,
          context.nodeId,
          async (eventData: any) => {
            logger.debug(`[EventListener Node ${context.nodeId}] Événement reçu: ${eventName}`, eventData);

            try {
              // Filtrer si nécessaire
              if (settings.filterEnabled && settings.filterProperty) {
                const propertyValue = eventData?.[settings.filterProperty];
                if (propertyValue !== settings.filterValue) {
                  logger.debug(
                    `[EventListener Node ${context.nodeId}] Événement filtré (${settings.filterProperty} !== ${settings.filterValue})`
                  );
                  return;
                }
              }

              // Stocker dans une variable si demandé
              if (settings.storeInVariable && settings.variableName) {
                signalSystem.setVariable(settings.variableName, eventData);
              }

              // Émettre un signal avec les données de l'événement
              await signalSystem.emitSignal(context.nodeId, {
                eventName,
                eventData,
                timestamp: Date.now(),
              });
            } catch (error) {
              logger.error(`[EventListener Node ${context.nodeId}] Erreur:`, error);
            }
          }
        );

        // Stocker la fonction de désabonnement
        if (!nodeUnsubscribers.has(context.nodeId)) {
          nodeUnsubscribers.set(context.nodeId, []);
        }
        nodeUnsubscribers.get(context.nodeId)!.push(unsubscribe);
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
    const eventName = settings.eventName || 'customEvent';
    
    return `
      <div class="node-content">
        <div class="node-title">Event Listener</div>
        <div class="node-subtitle">🎧 ${eventName}</div>
      </div>
    `;
  },
};

// Enregistrer la node
registerNode(EventListenerNode);

export default EventListenerNode;

// Fonction helper pour désabonner une node
export function unsubscribeEventListener(nodeId: number): void {
  const unsubscribers = nodeUnsubscribers.get(nodeId);
  if (unsubscribers) {
    unsubscribers.forEach((unsub) => unsub());
    nodeUnsubscribers.delete(nodeId);
  }
}

// Fonction helper pour désabonner toutes les nodes
export function unsubscribeAllEventListeners(): void {
  nodeUnsubscribers.forEach((unsubscribers) => {
    unsubscribers.forEach((unsub) => unsub());
  });
  nodeUnsubscribers.clear();
}
