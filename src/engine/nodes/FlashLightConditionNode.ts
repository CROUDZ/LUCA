/**
 * FlashLightConditionNode - Node de condition qui vérifie l'état de la lampe torche
 *
 * Catégorie: Condition
 *
 * Cette node surveille l'état de la lampe torche du téléphone et propage
 * le signal uniquement lorsque la lampe torche est activée.
 */

import { registerNode } from '../NodeRegistry';
import type {
	NodeDefinition,
	NodeExecutionContext,
	NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';
import { logger } from '../../utils/logger';
import { DeviceEventEmitter, NativeEventEmitter, NativeModules } from 'react-native';
import { PermissionsAndroid, Platform, Linking, Alert } from 'react-native';

let Torch: { switchState?: (on: boolean) => Promise<void> | void } | null = null;
				try {
	Torch = require('react-native-torch');
} catch {
	Torch = null;
}

let flashlightEnabled = false;
let lastNativePermissionWarningAt = 0;

function emitPermissionFailure(reason: string, source: string, extra: Record<string, any> = {}): void {
	try {
		const ss = getSignalSystem();
		ss?.emitEvent('flashlight.permission.failed', {
			reason,
			source,
			timestamp: Date.now(),
			...extra,
		});
	} catch (eventErr) {
		logger.warn('[FlashLight] Unable to emit flashlight.permission.failed', eventErr);
	}
}

export async function setFlashlightState(enabled: boolean, skipNative: boolean = false, emitEvent: boolean = true): Promise<void> {
	flashlightEnabled = enabled;

	// If we are trying to call the native torch, always ensure permission first
	// so the OS popup will be shown even if callers forgot to request it.
	if (!skipNative) {
		try {
			const ok = await ensureCameraPermission();
			logger.debug('[FlashLight] Permission check before native toggle:', ok);
			if (!ok) {
				logger.warn('[FlashLight] Permission not granted - skipping native torch call');
				emitPermissionFailure('ensure_before_toggle', 'setFlashlightState');
				// Do not call native torch; only update JS state and return.
				// Still allow event emission below so graph can react.
			} 
		} catch (e) {
			logger.warn('[FlashLight] Permission request error before native toggle', e);
		}
	}
	if (!skipNative) {
		const nativeTorch = (NativeModules as any)?.TorchModule;
		const hasNativeTorch = Boolean(nativeTorch && typeof nativeTorch.switchTorch === 'function');
		const hasLegacyTorch = Boolean(Torch && typeof Torch.switchState === 'function');
		let hardwareHandled = false;

		try {
			if (hasNativeTorch) {
				logger.info('[FlashLight] setFlashlightState → TorchModule.switchTorch');
				nativeTorch.switchTorch(enabled);
				hardwareHandled = true;
			} else if (hasLegacyTorch) {
				logger.info('[FlashLight] setFlashlightState → react-native-torch.switchState');
				const result = Torch!.switchState!(enabled);
				if (result instanceof Promise) await result;
				hardwareHandled = true;
			}
		} catch (error) {
			logger.warn('[FlashLight] Torch toggle threw error', error);
		}

		if (!hardwareHandled) {
			logger.warn('[FlashLight] No native torch implementation available');
			emitPermissionFailure('no_torch_implementation', 'setFlashlightState');
		}
	}

	try {
		const ss = getSignalSystem();
		if (ss && emitEvent) {
			logger.info(`[FlashLight] Emitting flashlight.changed (enabled=${enabled})`);
			ss.emitEvent('flashlight.changed', { enabled, timestamp: Date.now() });
		}
	} catch (err) {
		logger.warn('[FlashLight] could not emit flashlight.changed event', err);
	}

	logger.info(`[FlashLight] État de la lampe torche: ${enabled ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);

	try {
		const ss2 = getSignalSystem();
		if (ss2) {
			const stats = ss2.getStats();
			logger.debug('[FlashLight] Signal system stats after change:', stats);
		}
	} catch (e) {
		logger.warn('[FlashLight] Unable to fetch SignalSystem stats for debug', e);
	}
}

// Listen to native events (Android) to keep JS state in sync.
try {
	if ((DeviceEventEmitter as any)?.addListener) {
		logger.debug('[FlashLight] DeviceEventEmitter available');
		logger.debug('[FlashLight] Using DeviceEventEmitter for native torch events');
		DeviceEventEmitter.addListener('flashlight.system.changed', (payload: any) => {
			try {
				const enabled = Boolean(payload?.enabled);
				if (getFlashlightState() !== enabled) {
					setFlashlightState(enabled).catch(() => {});
				}
			} catch (err) {
				logger.warn('[FlashLight] Error handling flashlight.system.changed event', err);
			}
		});

		DeviceEventEmitter.addListener('flashlight.permission.native_missing', (payload: any) => {
			(async () => {
				try {
					const now = Date.now();
					if (now - lastNativePermissionWarningAt < 5000) {
						return;
					}
					lastNativePermissionWarningAt = now;

					logger.warn('[FlashLight] Native torch reported missing permission', payload);
					emitPermissionFailure(payload?.reason ?? 'native_missing', 'native', payload ?? {});

					const granted = await ensureCameraPermission();
					if (!granted) {
						Alert.alert(
							'Permission requise',
							"La permission Caméra est désactivée pour LUCA. Ouvrez les paramètres pour l'activer et permettre le contrôle de la lampe.",
							[
								{ text: 'Annuler', style: 'cancel' },
								{ text: 'Ouvrir les paramètres', onPress: () => Linking.openSettings() },
							]
						);
						try {
							Linking.openSettings();
						} catch (linkErr) {
							logger.warn('[FlashLight] Unable to open settings automatically', linkErr);
						}
					}
				} catch (err) {
					logger.warn('[FlashLight] Error handling flashlight.permission.native_missing event', err);
				}
			})();
		});
	}

	try {
		logger.debug('[FlashLight] NativeModules.TorchModule present:', !!(NativeModules as any).TorchModule);
		if (NativeModules && (NativeModules as any).TorchModule) {
			logger.debug('[FlashLight] TorchModule found in NativeModules — attaching NativeEventEmitter');
			const emitter = new NativeEventEmitter((NativeModules as any).TorchModule);
			emitter.addListener('flashlight.system.changed', (payload: any) => {
				try {
					const enabled = Boolean(payload?.enabled);
					if (getFlashlightState() !== enabled) {
						setFlashlightState(enabled).catch(() => {});
					}
				} catch (err) {
					logger.warn('[FlashLight] Error handling flashlight.system.changed event from NativeEventEmitter', err);
				}
			});
		}
	} catch (e) {
		logger.debug('[FlashLight] NativeModules.TorchModule not present or emitter failed', e);
	}
} catch (e) {
	logger.debug('[FlashLight] DeviceEventEmitter not available for native torch events', e);
}

export async function ensureCameraPermission(): Promise<boolean> {
	try {
		const isAndroid = Platform?.OS === 'android';
		if (!isAndroid) {
			logger.debug('[FlashLight] ensureCameraPermission skipped (non-Android or Platform unavailable)');
			return true;
		}

		if (!PermissionsAndroid || typeof PermissionsAndroid.request !== 'function') {
			logger.warn('[FlashLight] PermissionsAndroid API missing – assuming permission granted (likely non-native env)');
			return true;
		}

		const cameraPermission = PermissionsAndroid.PERMISSIONS?.CAMERA ?? 'android.permission.CAMERA';
		logger.info('[FlashLight] ensureCameraPermission: requesting permission via PermissionsAndroid');

		const result = await PermissionsAndroid.request(cameraPermission, {
			title: "Permission caméra",
			message: "Cette application a besoin d'accès à la caméra pour contrôler la lampe torche.",
			buttonNeutral: 'Plus tard',
			buttonNegative: 'Refuser',
			buttonPositive: 'OK',
		});

		if (typeof PermissionsAndroid.check === 'function') {
			const check = await PermissionsAndroid.check(cameraPermission);
			logger.info('[FlashLight] ensureCameraPermission pre-check:', check);
		} else {
			logger.info('[FlashLight] ensureCameraPermission pre-check skipped (PermissionsAndroid.check missing)');
		}

		logger.info('[FlashLight] ensureCameraPermission result:', result);
		const grantedValue = PermissionsAndroid.RESULTS?.GRANTED ?? 'granted';
		const neverAskValue = PermissionsAndroid.RESULTS?.NEVER_ASK_AGAIN ?? 'never_ask_again';

		if (result === grantedValue) {
			return true;
		}

		emitPermissionFailure(result ?? 'unknown', 'ensureCameraPermission');

		if (result === neverAskValue) {
			try {
				Alert.alert(
					'Permission requise',
					`La permission Caméra a été désactivée et ne sera plus demandée.\n\nOuvrir les paramètres pour activer la permission ?`,
					[
						{ text: 'Annuler', style: 'cancel' },
						{ text: 'Ouvrir', onPress: () => Linking?.openSettings?.() },
					]
				);
				try {
					Linking?.openSettings?.();
				} catch (e) {
					logger.warn('[FlashLight] Linking.openSettings call failed:', e);
				}
			} catch (e) {
				logger.warn('[FlashLight] Unable to open settings:', e);
			}
			return false;
		}

		return false;
	} catch (err) {
		logger.warn('[FlashLight] Permission check failed', err);
		emitPermissionFailure('permission_check_error', 'ensureCameraPermission', {
			error: err instanceof Error ? err.message : String(err),
		});
		return false;
	}
}

export async function hasCameraPermission(): Promise<boolean> {
	try {
		const isAndroid = Platform?.OS === 'android';
		if (!isAndroid) {
			return true;
		}

		if (!PermissionsAndroid || typeof PermissionsAndroid.check !== 'function') {
			logger.warn('[FlashLight] PermissionsAndroid.check unavailable – assuming permission granted');
			return true;
		}

		const cameraPermission = PermissionsAndroid.PERMISSIONS?.CAMERA ?? 'android.permission.CAMERA';
		const granted = await PermissionsAndroid.check(cameraPermission);
		return !!granted;
	} catch (err) {
		logger.warn('[FlashLight] hasCameraPermission failed', err);
		return false;
	}
}

export function getFlashlightState(): boolean {
	return flashlightEnabled;
}

const FlashLightConditionNode: NodeDefinition = {
	id: 'condition.flashlight',
	name: 'FlashLight',
	description: 'Propage le signal uniquement si la lampe torche du téléphone est activée',
	category: 'Condition',
	icon: 'flashlight-on',
	iconFamily: 'material',
	color: '#FFC107',
	inputs: [
		{
			name: 'signal_in',
			type: 'any',
			label: 'Signal In',
			description: "Signal d'entrée",
			required: false,
		},
	],
	outputs: [
		{
			name: 'signal_out',
			type: 'any',
			label: 'Signal Out',
			description: 'Signal de sortie (propagé si lampe activée)',
		},
	],
	defaultSettings: {
		checkInterval: 100,
		autoEmitOnChange: true,
		invertSignal: false,
	},
	execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
		try {
			const signalSystem = getSignalSystem();

			logger.debug(`[FlashLight Node ${context.nodeId}] Settings:`, context.settings);
			logger.debug(`[FlashLight Node ${context.nodeId}] invertSignal = ${context.settings?.invertSignal}`);

			if (signalSystem) {
	const autoEmit = context.settings?.autoEmitOnChange ?? false;
	const hasInputs = Boolean(context.inputsCount && context.inputsCount > 0);
			if (autoEmit && !hasInputs) {
					logger.debug(`[FlashLight Node ${context.nodeId}] Subscribing to flashlight.changed`);
					signalSystem.subscribeToEvent('flashlight.changed', context.nodeId, async (eventData) => {
						logger.debug(`[FlashLight Node ${context.nodeId}] Received flashlight.changed event`, eventData);
						const invertSignal = context.settings?.invertSignal ?? false;
						// Respecter l'inversion pour l'émission automatique
						const shouldEmit = invertSignal ? !eventData?.enabled : eventData?.enabled;
						if (shouldEmit) {
							await signalSystem.emitSignal(context.nodeId, {
								fromEvent: 'flashlight.changed',
								...eventData,
							});
						}
					});

					// Gérer l'émission initiale selon l'état actuel de la lampe et l'inversion
					const initialOn = getFlashlightState();
					const invert = context.settings?.invertSignal ?? false;
					const initialShouldEmit = invert ? !initialOn : initialOn;
					if (initialShouldEmit) {
						logger.debug(`[FlashLight Node ${context.nodeId}] Emitting initial flashlight signal (invert=${invert})`);
						(async () => {
							await signalSystem.emitSignal(context.nodeId, {
								fromEvent: 'flashlight.initial',
								enabled: initialOn,
							});
						})();
					}

					logger.info(`[FlashLight Node ${context.nodeId}] autoEmitOnChange active - subscription registered for flashlight.changed`);
				}

				signalSystem.registerHandler(
					context.nodeId,
					async (signal: Signal): Promise<SignalPropagation> => {
						logger.debug(`[FlashLight Node ${context.nodeId}] Signal reçu:`, signal);

						const isFlashlightOn = getFlashlightState();
						const invertSignal = context.settings?.invertSignal ?? false;
						
						// Applique l'inversion si nécessaire
						const conditionMet = invertSignal ? !isFlashlightOn : isFlashlightOn;

						if (conditionMet) {
							logger.info(`[FlashLight Node ${context.nodeId}] ✓ Condition remplie (invert=${invertSignal}, state=${isFlashlightOn}) - Signal propagé`);
							return {
								propagate: true,
								data: {
									...signal.data,
									flashlightChecked: true,
									flashlightState: isFlashlightOn,
									inverted: invertSignal,
								},
							};
						} else {
							logger.info(`[FlashLight Node ${context.nodeId}] ✗ Condition non remplie (invert=${invertSignal}, state=${isFlashlightOn}) - Signal bloqué`);
							return {
								propagate: false,
								data: signal.data,
							};
						}
					}
				);

				logger.info(`[FlashLight Node ${context.nodeId}] Condition handler registered`);
			}

			return {
				success: true,
				outputs: {
					signal_out: 'FlashLight condition registered',
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				outputs: {},
			};
		}
	},
	validate: (_context: NodeExecutionContext): boolean | string => {
		const signalSystem = getSignalSystem();
		if (!signalSystem) {
			return 'Signal system not initialized';
		}
		return true;
	},
	generateHTML: (settings: Record<string, any>): string => {
		const invertSignal = settings?.invertSignal ?? false;
		return `
			<div class="title">
				<span class="node-icon">💡</span> FlashLight
			</div>
			<div class="content">
				Check torch status
			</div>
			<div class="condition-invert-control">
				<label class="switch-label">
					<input type="checkbox" class="invert-signal-toggle" ${invertSignal ? 'checked' : ''} />
					<span class="switch-slider"></span>
					<span class="switch-text">Invert Signal</span>
				</label>
			</div>
		`;
	},
};

registerNode(FlashLightConditionNode);

export default FlashLightConditionNode;
