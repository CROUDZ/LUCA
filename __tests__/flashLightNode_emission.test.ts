import { initializeSignalSystem, resetSignalSystem, getSignalSystem } from '../src/engine/SignalSystem';
import FlashLightConditionNode, {
	setFlashlightState,
	clearFlashlightAutoEmitRegistry,
	syncFlashlightFromNative,
} from '../src/engine/nodes/FlashLightConditionNode';
import type { Graph } from '../src/types';

jest.mock('react-native', () => ({
	NativeModules: {},
}));

jest.mock('../src/utils/permissions', () => ({
	__esModule: true,
	default: {
		ensureCameraPermission: jest.fn().mockResolvedValue(true),
		hasCameraPermission: jest.fn().mockResolvedValue(true),
	},
}));

describe('FlashLightConditionNode auto-émission', () => {
	afterEach(() => {
		resetSignalSystem();
		clearFlashlightAutoEmitRegistry();
		// reset internal module state so tests are deterministic
		const { resetFlashlightState } = require('../src/engine/nodes/FlashLightConditionNode');
		resetFlashlightState();
		jest.clearAllMocks();
	});

	it('propage un signal lorsqu\'un événement flashlight.changed est émis', async () => {
		const graph: Graph = {
			nodes: new Map([
				[
					1,
					{
						id: 1,
						name: 'FlashLight',
						type: 'condition.flashlight',
						data: { type: 'condition.flashlight', settings: { autoEmitOnChange: true } },
						inputs: [],
						outputs: [2],
					},
				],
				[
					2,
					{
						id: 2,
						name: 'Receiver',
						type: 'test.receiver',
						data: { type: 'test.receiver' },
						inputs: [1],
						outputs: [],
					},
				],
			]),
			edges: [{ from: 1, to: 2 }],
		};

		initializeSignalSystem(graph);
		const ss = getSignalSystem();
		if (!ss) throw new Error('SignalSystem not initialized');

		const receiverHandler = jest.fn().mockResolvedValue({ propagate: false });
		ss.registerHandler(2, receiverHandler);

		await FlashLightConditionNode.execute({
			nodeId: 1,
			inputs: {},
			inputsCount: 0,
			settings: { autoEmitOnChange: true, invertSignal: false },
			log: jest.fn(),
		});

		await setFlashlightState(true, true);
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(receiverHandler).toHaveBeenCalled();
	});

		it('propage un signal lorsqu\'un changement natif est détecté', async () => {
			const graph: Graph = {
				nodes: new Map([
					[
						1,
						{
							id: 1,
							name: 'FlashLight',
							type: 'condition.flashlight',
							data: { type: 'condition.flashlight', settings: { autoEmitOnChange: true } },
							inputs: [],
							outputs: [2],
						},
					],
					[
						2,
						{
							id: 2,
							name: 'Receiver',
							type: 'test.receiver',
							data: { type: 'test.receiver' },
							inputs: [1],
							outputs: [],
						},
					],
				]),
				edges: [{ from: 1, to: 2 }],
			};

			initializeSignalSystem(graph);
			const ss = getSignalSystem();
			if (!ss) throw new Error('SignalSystem not initialized');

			const receiverHandler = jest.fn().mockResolvedValue({ propagate: false });
			ss.registerHandler(2, receiverHandler);

			await FlashLightConditionNode.execute({
				nodeId: 1,
				inputs: {},
				inputsCount: 0,
				settings: { autoEmitOnChange: true, invertSignal: false },
				log: jest.fn(),
			});

			await FlashLightConditionNode.execute({
				nodeId: 1,
				inputs: {},
				inputsCount: 0,
				settings: { autoEmitOnChange: true, invertSignal: false },
				log: jest.fn(),
			});
			await setFlashlightState(false, true);
			// registry sanity check before sync
			const { getAutoEmitRegistrySize } = require('../src/engine/nodes/FlashLightConditionNode');
			expect(getAutoEmitRegistrySize()).toBeGreaterThanOrEqual(1);
			await syncFlashlightFromNative(true);
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(receiverHandler).toHaveBeenCalled();
		});
});
