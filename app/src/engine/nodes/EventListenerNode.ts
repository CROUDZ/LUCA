import { registerNode } from '../NodeRegistry';
import { getSignalSystem } from '../SignalSystem';
import { logger } from '../../utils/logger';
import type { NodeDefinition, NodeExecutionContext, NodeExecutionResult, NodeMeta } from '../../types/node.types';
import { buildNodeCardHTML } from './templates/nodeCard';

const DEFAULT_EVENT = 'flashlight.changed';

const EventListenerNode: NodeDefinition = {
  id: 'events.listener',
  name: 'Event Listener',
  description: "Écoute un événement SignalSystem et propage un signal",
  category: 'Control',
  icon: 'notifications',
  iconFamily: 'material',
  color: '#03A9F4',
  inputs: [],
  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: 'Signal émis lorsque l\'événement est capté',
    },
  ],
  defaultSettings: {
    eventName: DEFAULT_EVENT,
  },
  settingsFields: [
    {
      name: 'eventName',
      label: "Nom de l'événement",
      type: 'text' as const,
      defaultValue: DEFAULT_EVENT,
      description: 'Nom de lévénement SignalSystem à écouter',
    },
  ],
  validate: () => true,
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    const ss = getSignalSystem();
    if (!ss) return { success: false, outputs: {}, error: 'SignalSystem non initialisé' };

    const eventName = (context.settings?.eventName || DEFAULT_EVENT) as string;

    try {
      ss.subscribeToEvent(eventName, context.nodeId, async (payload) => {
        logger.debug(`[EventListener ${context.nodeId}] Event reçu: ${eventName}`);
        await ss.emitSignalImmediate(context.nodeId, {
          event: eventName,
          payload,
        });
      });
    } catch (e) {
      logger.warn(`[EventListener ${context.nodeId}] Impossible de souscrire à ${eventName}`, e);
      return { success: false, outputs: {}, error: String(e) };
    }

    return { success: true, outputs: {} };
  },
  generateHTML: (settings: Record<string, any>, meta?: NodeMeta) => {
    const accentColor = '#03A9F4';
    const category = meta?.category || 'Control';
    const eventName = settings.eventName || DEFAULT_EVENT;

    return buildNodeCardHTML({
      title: 'Event Listener',
      subtitle: eventName,
      iconName: 'notifications',
      category,
      accentColor,
      description: "Propage un signal lorsque l'événement survient",
      body: `
        <div style="padding: 8px 0;">
          <label style="display: block; font-size: 12px; margin-bottom: 4px; opacity: 0.8;">
            Nom de l'événement
          </label>
          <input 
            type="text" 
            class="event-listener-input" 
            value="${eventName}" 
            placeholder="flashlight.changed" 
            style="width: 100%; padding: 6px 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.05); color: white; font-family: monospace; font-size: 13px;"
          />
        </div>
      `,
    });
  },
};

registerNode(EventListenerNode);

export default EventListenerNode;
