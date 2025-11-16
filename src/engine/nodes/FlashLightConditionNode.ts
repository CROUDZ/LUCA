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
import { PermissionsAndroid, Platform, Linking } from 'react-native';

let Torch: { switchState?: (on: boolean) => Promise<void> | void } | null = null;
try {
	Torch = require('react-native-torch');
} catch {
	Torch = null;
}

let flashlightEnabled = false;

export async function setFlashlightState(enabled: boolean): Promise<void> {
	flashlightEnabled = enabled;

	if (Torch && typeof Torch.switchState === 'function') {
		try {
			logger.info('[FlashLight] setFlashlightState called — syncing native torch');
			await ensureCameraPermission();
			const result = Torch.switchState(enabled);
			if (result instanceof Promise) await result;
		} catch (error) {
			logger.warn('[FlashLight] react-native-torch error or permission denied:', error);
		}
	}

	try {
		const ss = getSignalSystem();
		if (ss) {
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
		if (Platform.OS !== 'android') return true;

		const result = await PermissionsAndroid.request(
			PermissionsAndroid.PERMISSIONS.CAMERA,
			{
				title: "Permission caméra",
				message:
					"Cette application a besoin d'accès à la caméra pour contrôler la lampe torche.",
				buttonNeutral: 'Plus tard',
				buttonNegative: 'Refuser',
				buttonPositive: 'OK',
			}
		);

		if (result === PermissionsAndroid.RESULTS.GRANTED) {
			return true;
		}

		if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
			try {
				Linking.openSettings();
			} catch (e) {
				logger.warn('[FlashLight] Unable to open settings:', e);
			}
		}

		throw new Error('Permission CAMERA non accordée.');
	} catch (err) {
		logger.warn('[FlashLight] Permission check failed', err);
		throw err;
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
	},
	execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
		try {
			const signalSystem = getSignalSystem();

			if (signalSystem) {
	const autoEmit = context.settings?.autoEmitOnChange ?? false;
	const hasInputs = Boolean(context.inputsCount && context.inputsCount > 0);
	if (autoEmit && !hasInputs) {
					logger.debug(`[FlashLight Node ${context.nodeId}] Subscribing to flashlight.changed`);
					signalSystem.subscribeToEvent('flashlight.changed', context.nodeId, async (eventData) => {
						logger.debug(`[FlashLight Node ${context.nodeId}] Received flashlight.changed event`, eventData);
						if (eventData?.enabled) {
							await signalSystem.emitSignal(context.nodeId, { fromEvent: 'flashlight.changed', ...eventData });
						}
					});

					if (getFlashlightState()) {
						logger.debug(`[FlashLight Node ${context.nodeId}] Lamp already ON at subscribe time - emitting initial signal`);
						(async () => {
							await signalSystem.emitSignal(context.nodeId, { fromEvent: 'flashlight.initial', enabled: true });
						})();
					}

					logger.info(`[FlashLight Node ${context.nodeId}] autoEmitOnChange active - subscription registered for flashlight.changed`);
				}

				signalSystem.registerHandler(
					context.nodeId,
					async (signal: Signal): Promise<SignalPropagation> => {
						logger.debug(`[FlashLight Node ${context.nodeId}] Signal reçu:`, signal);

						const isFlashlightOn = getFlashlightState();

						if (isFlashlightOn) {
							logger.info(`[FlashLight Node ${context.nodeId}] ✓ Lampe torche ACTIVÉE - Signal propagé`);
							return {
								propagate: true,
								data: {
									...signal.data,
									flashlightChecked: true,
									flashlightState: true,
								},
							};
						} else {
							logger.info(`[FlashLight Node ${context.nodeId}] ✗ Lampe torche DÉSACTIVÉE - Signal bloqué`);
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
	generateHTML: (_settings: Record<string, any>): string => {
		return `
			<div class="title">
				<span class="node-icon">💡</span> FlashLight
			</div>
			<div class="content">
				Check torch status
			</div>
		`;
	},
};

registerNode(FlashLightConditionNode);

export default FlashLightConditionNode;
