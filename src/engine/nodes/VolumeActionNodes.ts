import { registerNode } from '../NodeRegistry';
import type { NodeDefinition, NodeExecutionContext, NodeExecutionResult } from '../../types/node.types';
import { getSignalSystem, type Signal } from '../SignalSystem';
import { logger } from '../../utils/logger';
import { adjustSystemVolume, getVolumeInfo, type VolumeDirection } from '../../utils/volumeController';

function createVolumeActionNode(options: {
  id: string;
  name: string;
  description: string;
  direction: VolumeDirection;
  icon: string;
  color: string;
}): NodeDefinition {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    category: 'Action',
    icon: options.icon,
    iconFamily: 'material',
    color: options.color,
    inputs: [
      {
        name: 'signal_in',
        type: 'any',
        label: 'Signal In',
        description: "Signal d'entrée qui déclenche l'ajustement du volume",
      },
    ],
    outputs: [
      {
        name: 'signal_out',
        type: 'any',
        label: 'Signal Out',
        description: 'Signal propagé après ajustement du volume',
      },
    ],
    defaultSettings: {
      steps: 1,
      showSystemUI: false,
      propagateSignal: true,
    },
    execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
      const ss = getSignalSystem();
      if (!ss) {
        return { success: false, error: 'Signal system not initialized', outputs: {} };
      }

      const stepsSetting = Number(context.settings?.steps ?? 1);
      const steps = Number.isFinite(stepsSetting) && stepsSetting > 0 ? Math.round(stepsSetting) : 1;
      const showUI = context.settings?.showSystemUI === true;
      const propagateSignal = context.settings?.propagateSignal !== false;

      ss.registerHandler(context.nodeId, async (signal: Signal) => {
        try {
          const volumeInfo = await adjustSystemVolume(options.direction, steps, showUI);
          logger.info(
            `[VolumeActionNode] Adjusted volume (${options.direction}) ` +
              `${volumeInfo ? `→ ${volumeInfo.volume}/${volumeInfo.maxVolume}` : '(no data)'}`
          );
          return {
            propagate: propagateSignal,
            data: {
              ...signal.data,
              volumeAction: options.direction,
              volumeInfo: volumeInfo ?? (await getVolumeInfo()),
            },
          };
        } catch (error) {
          logger.error(`[VolumeActionNode] Failed to adjust volume (${options.direction})`, error);
          return { propagate: false, data: signal.data };
        }
      });

      logger.info(
        `[VolumeActionNode] Handler registered for node ${context.nodeId} (direction=${options.direction}, steps=${steps}, showUI=${showUI})`
      );

      return { success: true, outputs: {} };
    },
    validate: () => true,
    generateHTML: (settings: Record<string, any>) => {
      const steps = Number(settings?.steps ?? 1);
      const showUI = settings?.showSystemUI === true;
      const propagateSignal = settings?.propagateSignal !== false;
      return `
        <div class="node-info-grid">
          <div class="node-info-item">
            <span class="node-info-label">Direction</span>
            <span class="node-info-value">${options.name}</span>
          </div>
          <div class="node-info-item">
            <span class="node-info-label">Pas</span>
            <span class="node-info-value">${steps} cran(s)</span>
          </div>
          <div class="node-info-item">
            <span class="node-info-label">UI système</span>
            <span class="node-info-badge ${showUI ? 'node-info-badge--success' : 'node-info-badge--warning'}">${
              showUI ? 'Visible' : 'Masquée'
            }</span>
          </div>
          <div class="node-info-item">
            <span class="node-info-label">Propagation</span>
            <span class="node-info-badge ${propagateSignal ? 'node-info-badge--success' : 'node-info-badge--warning'}">${
              propagateSignal ? 'Active' : 'Bloquée'
            }</span>
          </div>
        </div>
      `;
    },
  };
}

const VolumeUpActionNode = createVolumeActionNode({
  id: 'action.volume.up',
  name: 'Volume +',
  description: 'Augmente le volume lorsque le node reçoit un signal',
  direction: 'up',
  icon: 'volume-up',
  color: '#FF9800',
});

const VolumeDownActionNode = createVolumeActionNode({
  id: 'action.volume.down',
  name: 'Volume -',
  description: 'Baisse le volume lorsque le node reçoit un signal',
  direction: 'down',
  icon: 'volume-down',
  color: '#FF7043',
});

registerNode(VolumeUpActionNode);
registerNode(VolumeDownActionNode);

export { VolumeUpActionNode, VolumeDownActionNode };
