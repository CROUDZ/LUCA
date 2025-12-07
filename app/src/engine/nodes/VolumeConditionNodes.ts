import { registerNode } from '../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeMeta,
} from '../../types/node.types';
import { getSignalSystem, type Signal } from '../SignalSystem';
import { logger } from '../../utils/logger';
import { buildNodeCardHTML } from './templates/nodeCard';
import {
  ensureVolumeMonitoring,
  getLastVolumeButtonEvent,
  isVolumeButtonPressed,
  subscribeToVolumeButtons,
  type VolumeButtonEvent,
  type VolumeDirection,
} from '../../utils/volumeController';

interface AutoEmitConfig {
  direction: VolumeDirection;
  invert: boolean;
}

const autoEmitRegistry = new Map<number, AutoEmitConfig>();
let unsubscribeButtons: (() => void) | null = null;

function ensureAutoEmitListener() {
  if (unsubscribeButtons) return;
  ensureVolumeMonitoring();
  unsubscribeButtons = subscribeToVolumeButtons(handleVolumeButton);
}

async function emitAutoSignal(nodeId: number, event: VolumeButtonEvent) {
  const ss = getSignalSystem();
  if (!ss) return;

  try {
    await ss.emitSignal(nodeId, {
      fromEvent: 'volume.button',
      direction: event.direction,
      action: event.action,
      pressed: event.pressed,
      repeat: event.repeat,
      timestamp: event.timestamp,
      volume: event.volume,
      maxVolume: event.maxVolume,
      source: event.source,
    });
  } catch (error) {
    logger.warn(`[VolumeConditionNode] Failed auto emission for node ${nodeId}`, error);
  }
}

function handleVolumeButton(event: VolumeButtonEvent) {
  if (autoEmitRegistry.size === 0) return;
  autoEmitRegistry.forEach((config, nodeId) => {
    if (config.direction !== event.direction) return;
    const shouldEmit = config.invert ? !event.pressed : event.pressed;
    if (!shouldEmit) return;
    emitAutoSignal(nodeId, event);
  });
}

function createExecute(direction: VolumeDirection): NodeDefinition['execute'] {
  return async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    ensureAutoEmitListener();
    const ss = getSignalSystem();
    if (!ss) {
      return { success: false, error: 'Signal system not initialized', outputs: {} };
    }

    const autoEmit = context.settings?.autoEmitOnChange ?? true;
    const invert = context.settings?.invertSignal ?? false;
    const hasInputs = Boolean(context.inputsCount && context.inputsCount > 0);

    if (autoEmit && !hasInputs) {
      autoEmitRegistry.set(context.nodeId, { direction, invert });
      logger.info(
        `[VolumeConditionNode] Auto-emit enabled for node ${context.nodeId} (direction=${direction}, invert=${invert})`
      );
    } else {
      autoEmitRegistry.delete(context.nodeId);
    }

    ss.registerHandler(context.nodeId, async (signal: Signal) => {
      const pressed = isVolumeButtonPressed(direction);
      const condition = invert ? !pressed : pressed;
      if (condition) {
        return {
          propagate: true,
          data: {
            ...signal.data,
            volumeButton: direction,
            volumePressed: pressed,
            lastVolumeEvent: getLastVolumeButtonEvent(direction),
          },
        };
      }
      return { propagate: false, data: signal.data };
    });

    return { success: true, outputs: {} };
  };
}

function buildHTML(
  options: { name: string; description: string; color: string; icon: string },
  settings: Record<string, any>,
  nodeMeta?: NodeMeta
) {
  const invertSignal = settings?.invertSignal ?? false;
  const autoEmit = settings?.autoEmitOnChange !== false;
  const subtitle = invertSignal ? 'Signal inversé' : 'Signal direct';
  const statusText = autoEmit ? 'Auto-émission active' : 'Écoute uniquement';
  const statusClass = autoEmit ? 'auto-emit-status active' : 'auto-emit-status disabled';

  const body = `
    <div class="volume-node${invertSignal ? ' inverted' : ''}">
      <div class="${statusClass}">
        <span class="status-dot"></span>
        <span class="status-text">${statusText}</span>
      </div>
      <p class="node-card__description">${options.description}</p>
    </div>
  `;

  return buildNodeCardHTML({
    title: `${options.name} Condition`,
    subtitle,
    description: statusText,
    iconName: options.icon,
    category: nodeMeta?.category || 'Condition',
    accentColor: options.color,
    body,
  });
}

function createVolumeConditionNode(options: {
  id: string;
  name: string;
  description: string;
  direction: VolumeDirection;
  color: string;
  icon: string;
}): NodeDefinition {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    category: 'Condition',
    icon: options.icon,
    iconFamily: 'material',
    color: options.color,
    inputs: [
      {
        name: 'signal_in',
        type: 'any',
        label: 'Signal In',
        description: "Signal d'entrée filtré par le bouton de volume",
      },
    ],
    outputs: [
      {
        name: 'signal_out',
        type: 'any',
        label: 'Signal Out',
        description: 'Signal propagé lorsque la condition sur le bouton de volume est vraie',
      },
    ],
    defaultSettings: {
      autoEmitOnChange: true,
      invertSignal: false,
    },
    execute: createExecute(options.direction),
    validate: () => true,
    generateHTML: (settings: Record<string, any>, nodeMeta?: NodeMeta) =>
      buildHTML(options, settings, nodeMeta),
  };
}

const VolumeUpConditionNode = createVolumeConditionNode({
  id: 'condition.volume.up',
  name: 'Volume +',
  description: 'Propage si le bouton volume + est actif',
  direction: 'up',
  color: '#4CAF50',
  icon: 'volume-up',
});

const VolumeDownConditionNode = createVolumeConditionNode({
  id: 'condition.volume.down',
  name: 'Volume -',
  description: 'Propage si le bouton volume - est actif',
  direction: 'down',
  color: '#03A9F4',
  icon: 'volume-down',
});

registerNode(VolumeUpConditionNode);
registerNode(VolumeDownConditionNode);

export {
  VolumeUpConditionNode,
  VolumeDownConditionNode,
  autoEmitRegistry as __TESTING_AUTO_EMIT_REGISTRY,
};
