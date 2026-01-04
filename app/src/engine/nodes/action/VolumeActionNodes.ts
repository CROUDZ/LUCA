/**
 * VolumeActionNode - Node d'action pour contrôler le volume
 */

import { registerNode } from '../../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../../types/node.types';
import { getSignalSystem, type Signal } from '../../SignalSystem';
import { setSystemVolume } from '../../../utils/volumeController';
import { buildNodeCardHTML } from '../nodeCard';

const VolumeActionNode: NodeDefinition = {
  id: 'action.volume',
  name: 'Volume',
  description: 'Définit le volume du système à un pourcentage spécifique',
  category: 'Action',
  doc: `excerpt: Règle le volume sonore de votre téléphone.
---
Ce bloc vous permet de régler automatiquement le volume du son à un niveau spécifique. Vous pouvez choisir n'importe quel volume entre 0% (silencieux) et 100% (maximum).

**Comment l'utiliser :**
1. Entrez le pourcentage de volume souhaité (par exemple 50% pour demi-volume)
2. Activez "Afficher UI système" si vous voulez voir l'indicateur de volume qui s'affiche normalement quand vous réglez le volume
3. Le bloc se charge du reste !`,

  icon: 'volume-up',
  iconFamily: 'material',
  defaultSettings: {
    volumePercent: 50,
    showSystemUI: false,
  },

  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    const ss = getSignalSystem();
    if (!ss) {
      return { success: false, error: 'Signal system not initialized', outputs: {} };
    }

    console.log(`[VolumeActionNode] Executing node ${context.nodeId} with settings:`, context.settings);
    
    // Lire les paramètres depuis les settings (qui contiennent les valeurs de l'UI)
    const volumePercentSetting = Number(context.settings?.volumePercent ?? 50);
    const volumePercent =
      Number.isFinite(volumePercentSetting) && volumePercentSetting >= 0 && volumePercentSetting <= 100
        ? Math.round(volumePercentSetting)
        : 50;

    const showUI = context.settings?.showSystemUI === true;

    ss.registerHandler(context.nodeId, async (signal: Signal) => {
      if (signal.state === 'OFF') {
        return {
          propagate: true,
          state: 'OFF',
          data: { ...signal.data, volumeActionExecuted: false },
        };
      }

      try {
        const volumeInfo = await setSystemVolume(volumePercent, showUI);
        console.log(
          `[VolumeActionNode] Set volume to ${volumePercent}% → ${volumeInfo?.volume}/${volumeInfo?.maxVolume}`
        );
        return {
          propagate: true,
          data: {
            ...signal.data,
            volumeInfo,
            volumePercent,
            volumeActionExecuted: true,
            timestamp: Date.now(),
          },
        };
      } catch (error) {
        console.error('[VolumeActionNode] Failed to set volume', error);
        return {
          propagate: true,
          data: {
            ...signal.data,
            volumeActionExecuted: false,
            volumeError: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    });

    console.log(
      `[VolumeActionNode] Handler registered for node ${context.nodeId} (volumePercent=${volumePercent}, showUI=${showUI})`
    );

    return { success: true, outputs: {} };
  },

  validate: (): boolean | string => true,

  generateHTML: (settings: Record<string, any>, nodeMeta?: Record<string, any>) => {
    const volumePercent = Number.isFinite(Number(settings?.volumePercent))
      ? Number(settings.volumePercent)
      : 50;
    const showSystemUI = settings?.showSystemUI === true;

    return buildNodeCardHTML({
      title: 'Set Volume',
      iconName: 'volume_up',
      category: 'Action',
      nodeId: nodeMeta?.id,
      inputs: [
        {
          type: 'number',
          name: 'volumePercent',
          label: 'Volume (%)',
          value: volumePercent,
          min: 0,
          max: 100,
          step: 1,
        },
        {
          type: 'switch',
          name: 'showSystemUI',
          label: 'Afficher UI système',
          value: showSystemUI,
        },
      ],
    });
  },
};

registerNode(VolumeActionNode);

export default VolumeActionNode;
