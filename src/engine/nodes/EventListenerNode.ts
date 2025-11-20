/**
 * EventListenerNode - Node qui convertit les événements du SignalSystem en signaux
 *
 * Catégorie: Events
 *
 * Cette node s'abonne à un événement personnalisé (ex: flashlight.changed)
 * et propage automatiquement un signal lorsque l'événement est émis.
 */

import { registerNode } from '../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem } from '../SignalSystem';
import { logger } from '../../utils/logger';

const eventListenerSubscriptions = new Map<number, () => void>();

export function unsubscribeEventListener(nodeId: number): void {
  const unsubscribe = eventListenerSubscriptions.get(nodeId);
  if (unsubscribe) {
    try {
      unsubscribe();
    } catch (error) {
      logger.warn(`[EventListener ${nodeId}] Erreur lors du désabonnement`, error);
    } finally {
      eventListenerSubscriptions.delete(nodeId);
    }
  }
}

export function unsubscribeAllEventListeners(): void {
  eventListenerSubscriptions.forEach((unsubscribe, nodeId) => {
    try {
      unsubscribe();
    } catch (error) {
      logger.warn(`[EventListener ${nodeId}] Erreur lors du désabonnement global`, error);
    }
  });
  eventListenerSubscriptions.clear();
}

const EventListenerNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'events.listener',
  name: 'Event Listener',
  description: "Écoute un événement du SignalSystem et propage un signal",
  category: 'Events',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'event',
  iconFamily: 'material',
  color: '#3F51B5',

  // ============================================================================
  // INPUTS/OUTPUTS
  // ============================================================================
  inputs: [],
  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: "Signal déclenché lorsqu'un événement est reçu",
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    eventName: 'custom.event',
    autoPropagate: true,
    mergePayload: true,
    throttleMs: 0,
    staticPayload: {},
  },

  // ============================================================================
  // EXÉCUTION
  // ============================================================================
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const signalSystem = getSignalSystem();
      if (!signalSystem) {
        return {
          success: false,
          outputs: {},
          error: 'Signal system not initialized',
        };
      }

      const settings = context.settings || {};
      const rawEventName = typeof settings.eventName === 'string' ? settings.eventName.trim() : '';
      const eventName = rawEventName.length > 0 ? rawEventName : 'custom.event';
      const mergePayload = settings.mergePayload !== false;
      const throttleMs = Math.max(0, Number(settings.throttleMs) || 0);
      const staticPayload =
        settings.staticPayload && typeof settings.staticPayload === 'object'
          ? settings.staticPayload
          : {};

      // Nettoyer l'ancienne souscription si la node est ré-exécutée
      unsubscribeEventListener(context.nodeId);

      let lastTriggerAt = 0;
      let triggerCount = 0;

      const handler = async (eventData: any) => {
        try {
          if (throttleMs > 0) {
            const now = Date.now();
            if (now - lastTriggerAt < throttleMs) {
              logger.debug(`[EventListener ${context.nodeId}] Événement ignoré (throttle)`);
              return;
            }
            lastTriggerAt = now;
          }

          triggerCount += 1;
          logger.info(
            `[EventListener ${context.nodeId}] Événement reçu (${eventName}) #${triggerCount}`
          );

          const mergedPayload = mergePayload && eventData && typeof eventData === 'object'
            ? { ...eventData }
            : undefined;

          await signalSystem.emitSignal(context.nodeId, {
            eventName,
            eventPayload: eventData,
            triggerCount,
            fromEvent: true,
            ...staticPayload,
            ...(mergedPayload ?? {}),
          });
        } catch (error) {
          logger.error(`[EventListener ${context.nodeId}] Erreur lors de la propagation`, error);
        }
      };

      const unsubscribe = signalSystem.subscribeToEvent(eventName, context.nodeId, handler);
      eventListenerSubscriptions.set(context.nodeId, unsubscribe);

      logger.info(
        `[EventListener ${context.nodeId}] En écoute sur l'événement "${eventName}" (throttle=${throttleMs}ms)`
      );

      return {
        success: true,
        outputs: {
          signal_out: `Listening to ${eventName}`,
        },
      };
    } catch (error) {
      logger.error(`[EventListener ${context.nodeId}] Erreur lors de l'exécution`, error);
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // ============================================================================
  // VALIDATION
  // ============================================================================
  validate: (context: NodeExecutionContext): boolean | string => {
    const signalSystem = getSignalSystem();
    if (!signalSystem) {
      return 'Signal system not initialized';
    }

    const eventName = context.settings?.eventName;
    if (!eventName || typeof eventName !== 'string' || eventName.trim().length === 0) {
      return 'eventName is required';
    }

    return true;
  },

  // ============================================================================
  // HTML
  // ============================================================================
  generateHTML: (settings: Record<string, any>): string => {
    const eventName = settings?.eventName || 'custom.event';
    return `
      <div class="title">
        <span class="node-icon">📡</span> Event Listener
      </div>
      <div class="content">
        ${eventName}
      </div>
    `;
  },
};

registerNode(EventListenerNode);

export default EventListenerNode;
