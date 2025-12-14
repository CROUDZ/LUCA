/**
 * FlashLightConditionNode
 * Node conditionnel qui propage le signal seulement si la lampe torche est activée.
 */

import { registerNode } from '../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeMeta,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';
import { logger } from '../../utils/logger';
import { buildNodeCardHTML } from './templates/nodeCard';
import {
  NativeModules,
  DeviceEventEmitter,
  NativeEventEmitter,
  type EmitterSubscription,
} from 'react-native';
import permissions from '../../utils/permissions';

let Torch: { switchState?: (on: boolean) => Promise<void> | void } | null = null;
try {
  Torch = require('react-native-torch');
} catch {
  Torch = null;
}

let flashlightEnabled = false;
let deviceTorchSubscription: EmitterSubscription | null = null;
let nativeTorchSubscription: EmitterSubscription | null = null;

function normalizeTorchPayload(payload: unknown): boolean {
  if (typeof payload === 'boolean') return payload;
  if (payload && typeof payload === 'object' && 'enabled' in (payload as Record<string, any>)) {
    return Boolean((payload as Record<string, any>).enabled);
  }
  return false;
}

export function clearFlashlightAutoEmitRegistry() {
  // No-op - auto-emission removed
}

// Testing helper
export function getAutoEmitRegistrySize() {
  return 0; // Auto-emission removed
}

async function emitAutoSignalsForFlashlight(_enabled: boolean) {
  // Auto-emission removed - this is now a no-op
  // Signals only propagate when triggered by the user via the Trigger node
}

function emitPermissionFailure(
  reason: string,
  source = 'flashlight.node',
  extra: Record<string, any> = {}
) {
  try {
    const ss = getSignalSystem();
    ss?.emitEvent('flashlight.permission.failed', {
      reason,
      source,
      timestamp: Date.now(),
      ...extra,
    });
  } catch (e) {
    logger.warn('[FlashLight] Failed to emit permission failure event', e);
  }
}

function handleNativeTorchEvent(payload: unknown) {
  const enabled = normalizeTorchPayload(payload);
  syncFlashlightFromNative(enabled).catch((error: unknown) => {
    logger.warn('[FlashLight] Failed to sync flashlight state from native event', error);
  });
}

function ensureNativeTorchListeners() {
  const torchModule = (NativeModules as any)?.TorchModule;

  if (
    !deviceTorchSubscription &&
    DeviceEventEmitter &&
    typeof DeviceEventEmitter.addListener === 'function'
  ) {
    try {
      deviceTorchSubscription = DeviceEventEmitter.addListener(
        'flashlight.system.changed',
        handleNativeTorchEvent
      );
      logger.debug('[FlashLight] Listening to DeviceEventEmitter flashlight.system.changed');
    } catch (error) {
      logger.debug('[FlashLight] DeviceEventEmitter unavailable for flashlight sync', error);
    }
  }

  if (!nativeTorchSubscription && torchModule) {
    try {
      const emitter = new NativeEventEmitter(torchModule);
      nativeTorchSubscription = emitter.addListener(
        'flashlight.system.changed',
        handleNativeTorchEvent
      );
      logger.debug('[FlashLight] Listening to NativeEventEmitter flashlight.system.changed');
    } catch (error) {
      logger.debug('[FlashLight] NativeEventEmitter unable to attach for torch sync', error);
    }
  }
}

export function startMonitoringNativeTorch() {
  ensureNativeTorchListeners();
}

export function stopMonitoringNativeTorch() {
  try {
    if (deviceTorchSubscription && typeof deviceTorchSubscription.remove === 'function') {
      deviceTorchSubscription.remove();
    } else if (
      deviceTorchSubscription &&
      typeof (DeviceEventEmitter as any).removeListener === 'function'
    ) {
      (DeviceEventEmitter as any).removeListener(
        'flashlight.system.changed',
        handleNativeTorchEvent
      );
    }
  } catch (e) {
    logger.debug('[FlashLight] Could not remove DeviceEventEmitter listener', e);
  }

  try {
    if (nativeTorchSubscription && typeof nativeTorchSubscription.remove === 'function') {
      nativeTorchSubscription.remove();
    }
  } catch (e) {
    logger.debug('[FlashLight] Could not remove NativeEventEmitter listener', e);
  }

  deviceTorchSubscription = null;
  nativeTorchSubscription = null;
}

export async function setFlashlightState(
  enabled: boolean,
  skipNative: boolean = false,
  _emitEvent: boolean = true
): Promise<void> {
  ensureNativeTorchListeners();
  flashlightEnabled = enabled;

  // Try to toggle native torch only when requested and when permission is granted.
  if (!skipNative) {
    try {
      const ok = await permissions.ensureCameraPermission();
      if (!ok) {
        logger.warn('[FlashLight] Permission not granted; skipping native toggle');
        emitPermissionFailure('permission_denied', 'setFlashlightState');
      } else {
        const nativeTorch = (NativeModules as any)?.TorchModule;
        if (nativeTorch && typeof nativeTorch.switchTorch === 'function') {
          nativeTorch.switchTorch(enabled);
        } else {
          if (Torch && typeof Torch.switchState === 'function') {
            const res = Torch.switchState(enabled);
            if (res instanceof Promise) await res;
          } else {
            // No torch implementation available
            logger.warn('[FlashLight] No native torch implementation available');
            emitPermissionFailure('no_torch_implementation', 'setFlashlightState');
          }
        }
      }
    } catch (e) {
      logger.warn('[FlashLight] Error toggling native torch', e);
      emitPermissionFailure('toggle_error', 'setFlashlightState', { error: String(e) });
    }
  }

  try {
    const ss = getSignalSystem();
    logger.info(`[FlashLight] setFlashlightState enabled=${enabled} skipNative=${skipNative}`);
    ss?.emitEvent('flashlight.changed', { enabled, timestamp: Date.now() });
  } catch (e) {
    logger.warn('[FlashLight] Could not emit flashlight.changed', e);
  }

  await emitAutoSignalsForFlashlight(enabled);
}

export async function syncFlashlightFromNative(enabled: boolean): Promise<void> {
  const normalized = Boolean(enabled);
  if (flashlightEnabled === normalized) {
    logger.debug('[FlashLight] Native torch state already synced (enabled=%s)', normalized);
    return;
  }

  logger.info(`[FlashLight] Syncing flashlight state from native event: enabled=${normalized}`);
  await setFlashlightState(normalized, true);
}

export function resetFlashlightState(): void {
  flashlightEnabled = false;
  clearFlashlightAutoEmitRegistry();
  stopMonitoringNativeTorch();
}

export function getFlashlightState(): boolean {
  return flashlightEnabled;
}

export async function ensureCameraPermission(): Promise<boolean> {
  return permissions.ensureCameraPermission();
}

export async function hasCameraPermission(): Promise<boolean> {
  return permissions.hasCameraPermission();
}

const FLASHLIGHT_CONDITION_COLOR = '#FFC107';

const FlashLightConditionNode: NodeDefinition = {
  id: 'condition.flashlight',
  name: 'FlashLight',
  description: 'Propage le signal uniquement si la lampe torche est activée',
  category: 'Condition',
  icon: 'flashlight-on',
  iconFamily: 'material',
  color: FLASHLIGHT_CONDITION_COLOR,
  inputs: [
    {
      name: 'signal_in',
      type: 'any',
      label: 'Signal In',
      description: "Signal d'entrée à filtrer",
      required: false,
    },
  ],
  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: 'Signal propagé si la condition lampe torche est vraie',
    },
  ],
  defaultSettings: { invertSignal: false },
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const ss = getSignalSystem();
      if (!ss) return { success: false, error: 'Signal system not initialized', outputs: {} };

      ss.registerHandler(context.nodeId, async (signal: Signal): Promise<SignalPropagation> => {
        if (signal.continuous && signal.state === 'stop') {
          return {
            propagate: true,
            data: { ...signal.data, flashlightState: getFlashlightState() },
          };
        }

        const current = getFlashlightState();
        const invert = context.settings?.invertSignal ?? false;
        const condition = invert ? !current : current;
        if (condition) {
          return { propagate: true, data: { ...signal.data, flashlightState: current } };
        }
        return { propagate: false, data: signal.data };
      });

      return { success: true, outputs: {} };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e), outputs: {} };
    }
  },
  validate: (): boolean | string => {
    const ss = getSignalSystem();
    return ss ? true : 'Signal system not initialized';
  },
  generateHTML: (settings: Record<string, any>, nodeMeta?: NodeMeta): string => {
    const invertSignal = settings?.invertSignal ?? false;
    const body = `
			<div class="flashlight-node${invertSignal ? ' inverted' : ''}">
				<div class="condition-status">
					<span class="status-text">Propage si lampe ${invertSignal ? 'éteinte' : 'allumée'}</span>
				</div>
			</div>
		`;

    return buildNodeCardHTML({
      title: 'FlashLight Condition',
      subtitle: invertSignal ? 'Signal inversé' : 'Signal direct',
      description: `Propage si lampe ${invertSignal ? 'éteinte' : 'allumée'}`,
      iconName: 'flashlight_on',
      category: nodeMeta?.category || 'Condition',
      accentColor: FLASHLIGHT_CONDITION_COLOR,
      chips: [],
      body,
    });
  },
};

registerNode(FlashLightConditionNode);

export default FlashLightConditionNode;
