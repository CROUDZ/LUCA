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
  // Nettoyer les états des nodes condition
  flashlightNodeStates.forEach((state) => {
    if (state.timerHandle) {
      clearTimeout(state.timerHandle);
    }
    if (state.unsubscribe) {
      state.unsubscribe();
    }
  });
  flashlightNodeStates.clear();
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

// Stockage des états des nodes pour le mode continu
const flashlightNodeStates = new Map<number, {
  hasActiveSignal: boolean;
  lastSignalData: any;
  isOutputActive: boolean;
  timerHandle: ReturnType<typeof setTimeout> | null;
  unsubscribe: (() => void) | null;
}>();

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
  defaultSettings: { 
    invertSignal: false,
    switchMode: false,       // Mode switch (toggle à chaque changement)
    timerDuration: 0,        // Durée en secondes (0 = continu)
  },
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const ss = getSignalSystem();
      if (!ss) return { success: false, error: 'Signal system not initialized', outputs: {} };

      const nodeId = context.nodeId;
      const invert = context.settings?.invertSignal ?? false;
      const switchMode = context.settings?.switchMode ?? false;
      const timerDuration = context.settings?.timerDuration ?? 0;

      // Initialiser l'état de la node
      if (!flashlightNodeStates.has(nodeId)) {
        flashlightNodeStates.set(nodeId, {
          hasActiveSignal: false,
          lastSignalData: null,
          isOutputActive: false,
          timerHandle: null,
          unsubscribe: null,
        });
      }

      const state = flashlightNodeStates.get(nodeId)!;

      // Fonction pour activer la sortie
      const activateOutput = async () => {
        if (state.isOutputActive) return;
        
        state.isOutputActive = true;
        
        logger.info(`[FlashLightConditionNode] Node ${nodeId} OUTPUT ON (timer=${timerDuration}s, switch=${switchMode})`);
        
        await ss.setNodeState(nodeId, 'ON', {
          ...state.lastSignalData,
          flashlightState: getFlashlightState(),
        }, undefined, { forcePropagation: true });

        // Si mode timer (et pas mode switch), programmer l'arrêt
        if (timerDuration > 0 && !switchMode) {
          if (state.timerHandle) {
            clearTimeout(state.timerHandle);
          }
          state.timerHandle = setTimeout(() => {
            deactivateOutput();
          }, timerDuration * 1000);
        }
      };

      // Fonction pour désactiver la sortie
      const deactivateOutput = async () => {
        if (!state.isOutputActive) return;
        
        if (state.timerHandle) {
          clearTimeout(state.timerHandle);
          state.timerHandle = null;
        }
        
        state.isOutputActive = false;
        
        logger.info(`[FlashLightConditionNode] Node ${nodeId} OUTPUT OFF`);
        
        await ss.setNodeState(nodeId, 'OFF', {
          ...state.lastSignalData,
          flashlightState: getFlashlightState(),
        }, undefined, { forcePropagation: true });
      };

      // Fonction pour basculer la sortie (mode switch)
      const toggleOutput = async () => {
        if (state.isOutputActive) {
          await deactivateOutput();
        } else {
          await activateOutput();
        }
      };

      // Fonction appelée quand la condition est détectée
      const onConditionMet = async () => {
        if (!state.hasActiveSignal) return;

        logger.info(
          `[FlashLightConditionNode] Node ${nodeId} condition MET, switchMode=${switchMode}`
        );

        if (switchMode) {
          // Mode switch : basculer l'état
          await toggleOutput();
        } else if (!state.isOutputActive) {
          // Mode normal : activer si pas déjà actif
          await activateOutput();
        }
      };

      // Nettoyer l'ancien subscriber
      if (state.unsubscribe) {
        state.unsubscribe();
      }

      // S'abonner aux événements de changement d'état de la lampe torche
      state.unsubscribe = ss.subscribeToEvent('flashlight.changed', nodeId, async (data: any) => {
        const enabled = data?.enabled ?? false;
        const condition = invert ? !enabled : enabled;

        logger.info(
          `[FlashLightConditionNode] Node ${nodeId} flashlight changed: enabled=${enabled}, condition=${condition}`
        );

        if (condition) {
          // La condition est devenue vraie
          await onConditionMet();
        } else {
          // La condition est devenue fausse
          // En mode continu sans timer et sans switch, désactiver
          if (!switchMode && timerDuration === 0 && state.isOutputActive && state.hasActiveSignal) {
            logger.info(`[FlashLightConditionNode] Node ${nodeId} condition FALSE, deactivating (continuous mode)`);
            await deactivateOutput();
          }
        }
      });

      ss.registerHandler(nodeId, async (signal: Signal): Promise<SignalPropagation> => {
        logger.info(`[FlashLightConditionNode] Node ${nodeId} received signal: state=${signal.state}`);

        if (signal.state === 'OFF') {
          state.hasActiveSignal = false;
          state.lastSignalData = null;
          
          // Nettoyer le timer si actif
          if (state.timerHandle) {
            clearTimeout(state.timerHandle);
            state.timerHandle = null;
          }
          
          // Désactiver la sortie si elle était active
          if (state.isOutputActive) {
            state.isOutputActive = false;
            return {
              propagate: true,
              state: 'OFF',
              data: { ...signal.data, flashlightState: getFlashlightState() },
            };
          }
          
          return { propagate: true, state: 'OFF', data: signal.data };
        }

        // Signal ON : mémoriser et vérifier la condition
        state.hasActiveSignal = true;
        state.lastSignalData = signal.data;

        const current = getFlashlightState();
        const condition = invert ? !current : current;

        logger.info(
          `[FlashLightConditionNode] Node ${nodeId} signal ON received, checking condition: current=${current}, condition=${condition}`
        );

        if (condition) {
          // Condition déjà remplie au moment où le signal arrive
          state.isOutputActive = true;
          
          // Si mode timer (et pas switch), programmer l'arrêt
          if (timerDuration > 0 && !switchMode) {
            if (state.timerHandle) {
              clearTimeout(state.timerHandle);
            }
            state.timerHandle = setTimeout(() => {
              deactivateOutput();
            }, timerDuration * 1000);
          }
          
          return { 
            propagate: true, 
            state: 'ON',
            data: { ...signal.data, flashlightState: current } 
          };
        }

        // Condition non remplie : émettre un événement signal.blocked pour le visuel
        logger.info(`[FlashLightConditionNode] Node ${nodeId} signal ON pending, waiting for condition`);
        
        ss.emitEvent('signal.blocked', {
          nodeId,
          reason: 'condition_not_met',
          waitingFor: 'flashlight',
        });
        
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
    const switchMode = settings?.switchMode ?? false;
    const timerDuration = settings?.timerDuration ?? 0;
    
    let subtitle = invertSignal ? 'Signal inversé' : 'Signal direct';
    if (switchMode) {
      subtitle += ' • Mode Switch';
    } else if (timerDuration > 0) {
      subtitle += ` • Timer ${timerDuration}s`;
    } else {
      subtitle += ' • Continu';
    }
    
    const body = `
			<div class="flashlight-node${invertSignal ? ' inverted' : ''}${switchMode ? ' switch-mode' : ''}">
				<div class="condition-status">
					<span class="status-text">Propage si lampe ${invertSignal ? 'éteinte' : 'allumée'}</span>
				</div>
        
        <!-- Contrôles de configuration -->
        <div class="condition-settings">
          <!-- Mode Switch -->
          <div class="setting-row">
            <label class="setting-label">
              <span class="setting-text">Mode Switch</span>
              <span class="setting-hint">Bascule ON/OFF à chaque détection</span>
            </label>
            <label class="toggle-switch">
              <input type="checkbox" class="switch-mode-toggle" ${switchMode ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <!-- Timer Duration (visible uniquement si pas en mode switch) -->
          <div class="setting-row timer-setting" ${switchMode ? 'style="display:none;"' : ''}>
            <label class="setting-label">
              <span class="setting-text">Timer (secondes)</span>
              <span class="setting-hint">0 = continu tant que condition vraie</span>
            </label>
            <input type="number" class="timer-duration-input" value="${timerDuration}" min="0" max="300" step="0.5" placeholder="0">
          </div>
        </div>
			</div>
		`;

    return buildNodeCardHTML({
      title: 'FlashLight Condition',
      subtitle,
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
