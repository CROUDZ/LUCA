/**
 * EventEmitterNode - Node d'émission d'événements
 *
 * Catégorie: Events
 *
 * Cette node émet des événements personnalisés qui peuvent être captés
 * par d'autres nodes EventListener dans le graphe.
 * Permet une communication découplée entre nodes.
 *
 * Fonctionnement:
 * - Reçoit un signal
 * - Émet un événement avec le nom configuré
 * - Propage le signal normalement
 */

import { registerNode } from '../NodeRegistry';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';

const EventEmitterNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'events.emitter',
  name: 'Event Emitter',
  description: 'Émet un événement personnalisé',
  category: 'Events',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'sensors',
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
      name: 'event_data',
      type: 'any',
      label: 'Event Data',
      description: 'Données à envoyer avec l\'événement',
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
    eventName: 'customEvent',
    includeSignalData: true, // Inclure les données du signal dans l'événement
    useVariableData: false,
    dataVariableName: '',
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
            const eventName = settings.eventName || 'customEvent';

            logger.debug(`[EventEmitter Node ${context.nodeId}] Émission événement: ${eventName}`);

            try {
              // Construire les données de l'événement
              let eventData: any = {};

              if (context.inputs.event_data !== undefined) {
                eventData = context.inputs.event_data;
              } else if (settings.useVariableData && settings.dataVariableName) {
                eventData = signalSystem.getVariable(settings.dataVariableName);
              } else if (settings.includeSignalData) {
                eventData = signal.data;
              }

              // Émettre l'événement
              signalSystem.emitEvent(eventName, eventData);

              return {
                propagate: true,
                data: {
                  ...signal.data,
                  eventEmitted: eventName,
                  eventData,
                },
              };
            } catch (error) {
              logger.error(`[EventEmitter Node ${context.nodeId}] Erreur:`, error);
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
    const eventName = settings.eventName || 'customEvent';
    
    return `
      <div class="node-content">
        <div class="node-title">Event Emitter</div>
        <div class="node-subtitle">${eventName}</div>
      </div>
    `;
  },
};

// Enregistrer la node
registerNode(EventEmitterNode);

export default EventEmitterNode;
