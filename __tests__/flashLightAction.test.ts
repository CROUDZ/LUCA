jest.resetModules();

// Mock react-native basic pieces to avoid permission checks in tests
jest.doMock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Linking: { openSettings: jest.fn() },
  PermissionsAndroid: {
    PERMISSIONS: { CAMERA: 'android.permission.CAMERA' },
    RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
    request: jest.fn(async () => 'granted'),
    check: jest.fn(async () => true),
  },
}));

const {
  initializeSignalSystem,
  resetSignalSystem,
  getSignalSystem,
} = require('../src/engine/SignalSystem');
const { triggerNode } = require('../src/engine/nodes/TriggerNode');
const { loadAllNodes } = require('../src/engine/NodeRegistry');
const { executeGraph } = require('../src/engine/engine');
const { getPingCount, resetPingCount } = require('../src/engine/nodes/PingNode');
const {
  setFlashlightState,
  getFlashlightState,
} = require('../src/engine/nodes/FlashLightConditionNode');

describe('FlashLightActionNode', () => {
  beforeEach(() => {
    resetSignalSystem();
    resetPingCount();
  });

  afterEach(() => {
    resetSignalSystem();
    const { resetFlashlightState } = require('../src/engine/nodes/FlashLightConditionNode');
    resetFlashlightState();
  });

  it('should set flashlight state when mode=set and propagate signal', async () => {
    const graph = {
      nodes: new Map([
        [1, { id: 1, name: 'Trigger', type: 'input.trigger', data: {}, inputs: [], outputs: [2] }],
        [
          2,
          {
            id: 2,
            name: 'FlashLightAction',
            type: 'action.flashlight',
            data: { mode: 'set', value: true, propagateSignal: true },
            inputs: [1],
            outputs: [3],
          },
        ],
        [
          3,
          {
            id: 3,
            name: 'Ping',
            type: 'action.ping',
            data: { showAlert: false },
            inputs: [2],
            outputs: [],
          },
        ],
      ]),
      edges: [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
      ],
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
        [
          2,
          {
            id: 2,
            name: 'FlashLightAction',
            type: 'action.flashlight',
            data: { mode: 'toggle', propagateSignal: false },
            inputs: [1],
            outputs: [3],
          },
        ],
        [
          3,
          {
            id: 3,
            name: 'Ping',
            type: 'action.ping',
            data: { showAlert: false },
            inputs: [2],
            outputs: [],
          },
        ],
      ]),
      edges: [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
      ],
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
    const RN = require('react-native');
    const originalPlatform = { ...RN.Platform };
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

    const permissionsUtils = require('../src/utils/permissions');
    const ensureSpy = jest
      .spyOn(permissionsUtils, 'ensureCameraPermission')
      .mockResolvedValue(false);
    const requestSpy = jest
      .spyOn(permissionsUtils, 'requestAndroidPermission')
      .mockResolvedValue({ granted: false, status: 'denied' });

    const graph = {
      nodes: new Map([
        [1, { id: 1, name: 'Trigger', type: 'input.trigger', data: {}, inputs: [], outputs: [2] }],
        [
          2,
          {
            id: 2,
            name: 'FlashLightAction',
            type: 'action.flashlight',
            data: { mode: 'toggle', propagateSignal: true },
            inputs: [1],
            outputs: [3],
          },
        ],
        [
          3,
          {
            id: 3,
            name: 'Ping',
            type: 'action.ping',
            data: { showAlert: false },
            inputs: [2],
            outputs: [],
          },
        ],
      ]),
      edges: [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
      ],
    };

    resetSignalSystem();
    resetPingCount();
    initializeSignalSystem(graph);

    let permissionFailureEmitted = false;
    const ss = getSignalSystem();
    ss?.subscribeToEvent('flashlight.permission.failed', 2, () => {
      permissionFailureEmitted = true;
    });

    loadAllNodes();
    await executeGraph(graph);

    await setFlashlightState(false);

    triggerNode(1);

    await new Promise((r) => setTimeout(r, 100));

    expect(getFlashlightState()).toBe(true);
    expect(getPingCount()).toBeGreaterThanOrEqual(1);
    expect(permissionFailureEmitted).toBe(true);
    expect(RN.Alert?.alert).toHaveBeenCalled();

    ensureSpy.mockRestore();
    requestSpy.mockRestore();
    RN.Platform = originalPlatform;
    RN.PermissionsAndroid = originalPermissions as any;
    RN.Linking = originalLinking as any;
    RN.Alert = originalAlert as any;
  });
});

export {};
