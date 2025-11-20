jest.resetModules();

// Mock react-native basic pieces to avoid permission checks in tests
jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));

const { initializeSignalSystem, resetSignalSystem } = require('../src/engine/SignalSystem');
const { triggerNode } = require('../src/engine/nodes/TriggerNode');
const { loadAllNodes } = require('../src/engine/NodeRegistry');
const { executeGraph } = require('../src/engine/engine');
const { getPingCount, resetPingCount } = require('../src/engine/nodes/PingNode');
const { setFlashlightState, getFlashlightState } = require('../src/engine/nodes/FlashLightConditionNode');

describe('FlashLightActionNode', () => {
		beforeEach(() => {
		resetSignalSystem();
		resetPingCount();
	});

	afterEach(() => {
		resetSignalSystem();
	});

	it('should set flashlight state when mode=set and propagate signal', async () => {
		const graph = {
			nodes: new Map([
				[1, { id: 1, name: 'Trigger', type: 'input.trigger', data: {}, inputs: [], outputs: [2] }],
				[2, { id: 2, name: 'FlashLightAction', type: 'action.flashlight', data: { mode: 'set', value: true, propagateSignal: true }, inputs: [1], outputs: [3] }],
				[3, { id: 3, name: 'Ping', type: 'action.ping', data: { showAlert: false }, inputs: [2], outputs: [] }],
			]),
			edges: [{ from: 1, to: 2 }, { from: 2, to: 3 }],
		};

		initializeSignalSystem(graph);
		loadAllNodes();
		await executeGraph(graph);

		// Initial state false
		await setFlashlightState(false);

		// Fire the trigger
		triggerNode(1);

		await new Promise((r) => setTimeout(r, 100));

		expect(getFlashlightState()).toBe(true);
		expect(getPingCount()).toBeGreaterThanOrEqual(1);
	});

	it('should toggle flashlight when mode=toggle and not propagate if propagate disabled', async () => {
		const graph = {
			nodes: new Map([
				[1, { id: 1, name: 'Trigger', type: 'input.trigger', data: {}, inputs: [], outputs: [2] }],
				[2, { id: 2, name: 'FlashLightAction', type: 'action.flashlight', data: { mode: 'toggle', propagateSignal: false }, inputs: [1], outputs: [3] }],
				[3, { id: 3, name: 'Ping', type: 'action.ping', data: { showAlert: false }, inputs: [2], outputs: [] }],
			]),
			edges: [{ from: 1, to: 2 }, { from: 2, to: 3 }],
		};

		initializeSignalSystem(graph);
		loadAllNodes();
		await executeGraph(graph);

		// Initial state false
		await setFlashlightState(false);

		// Fire the trigger
		triggerNode(1);

		await new Promise((r) => setTimeout(r, 100));

		// Toggled to true
		expect(getFlashlightState()).toBe(true);

		// Not propagated because propagateSignal=false
		expect(getPingCount()).toBe(0);
	});

		it('should work on Android even when CAMERA permission denied', async () => {
			// Reset mocks so we can mock Platform as android for this test
			// Run this part inside an isolated module registry so the test can tweak the react-native mock
			await jest.isolateModules(async () => {
				const RN = require('react-native');
				const originalPlatform = RN.Platform ? { ...RN.Platform } : { OS: 'ios' };
				const originalPermissions = RN.PermissionsAndroid ? { ...RN.PermissionsAndroid } : undefined;
				const originalLinking = RN.Linking ? { ...RN.Linking } : undefined;
				const originalAlert = RN.Alert ? { ...RN.Alert } : undefined;
				RN.Platform.OS = 'android';
				RN.PermissionsAndroid = {
					PERMISSIONS: { CAMERA: 'android.permission.CAMERA' },
					RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
					request: jest.fn(async () => 'denied'),
					check: jest.fn(async () => false),
				};
				RN.Linking = { openSettings: jest.fn() };
				RN.Alert = { alert: jest.fn() };

				jest.doMock('react-native-torch', () => ({ switchState: jest.fn() }), { virtual: true });

				// Re-import modules after having mocked
				const SS2 = require('../src/engine/SignalSystem');
				const TriggerNodeMods2 = require('../src/engine/nodes/TriggerNode');
				const NodeRegistry2 = require('../src/engine/NodeRegistry');
				const Engine2 = require('../src/engine/engine');
				const Ping2 = require('../src/engine/nodes/PingNode');
				const FlashLightCondition2 = require('../src/engine/nodes/FlashLightConditionNode');

				SS2.resetSignalSystem();
				Ping2.resetPingCount();

				const graph = {
				nodes: new Map([
					[1, { id: 1, name: 'Trigger', type: 'input.trigger', data: {}, inputs: [], outputs: [2] }],
					[2, { id: 2, name: 'FlashLightAction', type: 'action.flashlight', data: { mode: 'toggle', propagateSignal: true }, inputs: [1], outputs: [3] }],
					[3, { id: 3, name: 'Ping', type: 'action.ping', data: { showAlert: false }, inputs: [2], outputs: [] }],
				]),
				edges: [{ from: 1, to: 2 }, { from: 2, to: 3 }],
			};

				SS2.initializeSignalSystem(graph);

				// Subscribe to permission failure event before nodes are executed so
				// the listener is in place when the handler requests permission.
				let permissionFailureEmitted = false;
				const ss = SS2.getSignalSystem();
				if (ss) {
					ss.subscribeToEvent('flashlight.permission.failed', 2, () => {
						permissionFailureEmitted = true;
					});
				}

				NodeRegistry2.loadAllNodes();
				await Engine2.executeGraph(graph);

				// Ensure initial false
				await FlashLightCondition2.setFlashlightState(false);

				TriggerNodeMods2.triggerNode(1);

				await new Promise((r) => setTimeout(r, 100));

				// Despite permission denied, our JS state updates and event is emitted
				expect(FlashLightCondition2.getFlashlightState()).toBe(true);
				expect(Ping2.getPingCount()).toBeGreaterThanOrEqual(1);

				// And the permission failure event should have been emitted
				expect(permissionFailureEmitted).toBe(true);

				RN.Platform = originalPlatform;
				RN.PermissionsAndroid = originalPermissions as any;
				RN.Linking = originalLinking as any;
				if (originalAlert) {
					RN.Alert = originalAlert as any;
				}
			});

			});
});

export {};

