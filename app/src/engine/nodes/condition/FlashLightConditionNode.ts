/**
 * FlashLightConditionNode
 * Node conditionnel qui propage le signal seulement si la lampe torche est activée.
 *
 * Utilise le ConditionHandler centralisé pour la gestion des modes (continu, timer, switch).
 */

import { registerConditionNode } from '../ConditionHandler';
import { getSignalSystem } from '../../SignalSystem';
import {
  NativeModules,
  DeviceEventEmitter,
  NativeEventEmitter,
  type EmitterSubscription,
} from 'react-native';
import permissions from '../../../utils/permissions';

let Torch: { switchState?: (on: boolean) => Promise<void> | void } | null = null;
try {
  const torchModule = require('react-native-torch');
  Torch = torchModule?.default ?? torchModule;
} catch {
  Torch = null;
}

const resolveTorch = () => {
  if (Torch) return Torch;
  try {
    const torchModule = require('react-native-torch');
    Torch = torchModule?.default ?? torchModule;
    return Torch;
  } catch {
    return null;
  }
};

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
  // Kept for backward compatibility
}

// Testing helper
export function getAutoEmitRegistrySize() {
  return 0;
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
    console.warn('[FlashLight] Failed to emit permission failure event', e);
  }
}

function handleNativeTorchEvent(payload: unknown) {
  const enabled = normalizeTorchPayload(payload);
  syncFlashlightFromNative(enabled).catch((error: unknown) => {
    console.warn('[FlashLight] Failed to sync flashlight state from native event', error);
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
      console.log('[FlashLight] Listening to DeviceEventEmitter flashlight.system.changed');
    } catch (error) {
      console.log('[FlashLight] DeviceEventEmitter unavailable for flashlight sync', error);
    }
  }

  if (!nativeTorchSubscription && torchModule) {
    try {
      const emitter = new NativeEventEmitter(torchModule);
      nativeTorchSubscription = emitter.addListener(
        'flashlight.system.changed',
        handleNativeTorchEvent
      );
      console.log('[FlashLight] Listening to NativeEventEmitter flashlight.system.changed');
    } catch (error) {
      console.log('[FlashLight] NativeEventEmitter unable to attach for torch sync', error);
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
    console.log('[FlashLight] Could not remove DeviceEventEmitter listener', e);
  }

  try {
    if (nativeTorchSubscription && typeof nativeTorchSubscription.remove === 'function') {
      nativeTorchSubscription.remove();
    }
  } catch (e) {
    console.log('[FlashLight] Could not remove NativeEventEmitter listener', e);
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
        console.warn('[FlashLight] Permission not granted; skipping native toggle');
        emitPermissionFailure('permission_denied', 'setFlashlightState');
      } else {
        const nativeTorch = (NativeModules as any)?.TorchModule;
        if (nativeTorch && typeof nativeTorch.switchTorch === 'function') {
          nativeTorch.switchTorch(enabled);
        } else if (nativeTorch && typeof nativeTorch.switchState === 'function') {
          const res = nativeTorch.switchState(enabled);
          if (res instanceof Promise) await res;
        } else {
          const torch = resolveTorch();
          if (torch && typeof torch.switchState === 'function') {
            const res = torch.switchState(enabled);
            if (res instanceof Promise) await res;
          } else {
            // No torch implementation available
            console.warn('[FlashLight] No native torch implementation available');
            emitPermissionFailure('no_torch_implementation', 'setFlashlightState');
          }
        }
      }
    } catch (e) {
      console.warn('[FlashLight] Error toggling native torch', e);
      emitPermissionFailure('toggle_error', 'setFlashlightState', { error: String(e) });
    }
  }

  try {
    const ss = getSignalSystem();
    console.log(`[FlashLight] setFlashlightState enabled=${enabled} skipNative=${skipNative}`);
    ss?.emitEvent('flashlight.changed', { enabled, timestamp: Date.now() });
  } catch (e) {
    console.warn('[FlashLight] Could not emit flashlight.changed', e);
  }
}

export async function syncFlashlightFromNative(enabled: boolean): Promise<void> {
  const normalized = Boolean(enabled);
  if (flashlightEnabled === normalized) {
    console.log('[FlashLight] Native torch state already synced (enabled=%s)', normalized);
    return;
  }

  console.log(`[FlashLight] Syncing flashlight state from native event: enabled=${normalized}`);
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

// ============================================================================
// DÉFINITION DE LA NODE VIA FACTORY
// ============================================================================


const FlashLightConditionNode = registerConditionNode({
  id: 'condition.flashlight',
  name: 'FlashLight Condition',
  description: 'Propage le signal uniquement si la lampe torche est activée',
  doc: `excerpt: Vérifie si la lampe torche est activée.
---
Ce bloc vérifie l'état de la lampe torche de votre téléphone. Si elle est allumée, il laisse passer le signal. Si elle est éteinte, il l'arrête.

**Comment l'utiliser :**
1. Connectez ce bloc à d'autres blocs dans votre flux
2. Il vérifiera automatiquement si la lampe torche est allumée ou éteinte
3. Le signal ne passera que si la lampe est allumée
4. Parfait pour créer des actions conditionnelles !`,
  icon: 'flashlight-on',

  // État de la condition
  checkCondition: () => getFlashlightState(),
  getSignalData: () => ({ flashlightState: getFlashlightState() }),
  waitingForLabel: 'flashlight',

  // Abonnement à l'événement flashlight.changed
  eventSubscription: {
    eventName: 'flashlight.changed',
    getConditionFromEvent: (data: any) => data?.enabled ?? false,
  },
});

export default FlashLightConditionNode;
