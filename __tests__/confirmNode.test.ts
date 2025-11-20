import type { AppStateStatus } from 'react-native';

jest.resetModules();
jest.mock('react-native', () => {
  const listeners: Array<(state: AppStateStatus) => void> = [];

  const mock: any = {
    Alert: {
      alert: jest.fn((_title: string, _body: any, buttons: any) => {
        if (Array.isArray(buttons) && buttons.length > 0) {
          const confirm = buttons[buttons.length - 1];
          if (confirm && typeof confirm.onPress === 'function') {
            confirm.onPress();
          }
        }
      }),
    },
    AppState: {
      currentState: 'active' as AppStateStatus,
      addEventListener: jest.fn((_event: string, handler: (state: AppStateStatus) => void) => {
        listeners.push(handler);
        return {
          remove: () => {
            const index = listeners.indexOf(handler);
            if (index >= 0) {
              listeners.splice(index, 1);
            }
          },
        };
      }),
    },
    InteractionManager: {
      runAfterInteractions: (cb: () => void) => cb(),
    },
  };

  mock.__setAppState = (state: AppStateStatus) => {
    mock.AppState.currentState = state;
    listeners.forEach((listener) => listener(state));
  };

  mock.__reset = () => {
    mock.Alert.alert.mockClear();
    mock.AppState.addEventListener.mockClear();
    mock.AppState.currentState = 'active';
    listeners.splice(0, listeners.length);
  };

  return mock;
});

const reactNative: any = require('react-native');
const { Alert, __setAppState, __reset } = reactNative;

const { initializeSignalSystem, resetSignalSystem } = require('../src/engine/SignalSystem');
const { triggerNode } = require('../src/engine/nodes/TriggerNode');
const { loadAllNodes } = require('../src/engine/NodeRegistry');
const { executeGraph } = require('../src/engine/engine');
const { getPingCount, resetPingCount } = require('../src/engine/nodes/PingNode');

function buildGraph(confirmData: Record<string, any>) {
  return {
    nodes: new Map([
      [1, { id: 1, name: 'Trigger', type: 'input.trigger', data: { autoTrigger: false }, inputs: [], outputs: [2] }],
      [2, { id: 2, name: 'Confirm', type: 'action.confirm', data: confirmData, inputs: [1], outputs: [3] }],
      [3, { id: 3, name: 'Ping', type: 'action.ping', data: { showAlert: false }, inputs: [2], outputs: [] }],
    ]),
    edges: [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ],
  };
}

describe('Confirm Node', () => {
  beforeEach(async () => {
    resetSignalSystem();
    resetPingCount();
    __reset();
  });

  afterEach(() => {
    resetSignalSystem();
  });

  test('propagates when autoConfirm true', async () => {
    const graph = buildGraph({ autoConfirm: true });

    initializeSignalSystem(graph);
    loadAllNodes();
    await executeGraph(graph);

    triggerNode(1);

    await new Promise((r) => setTimeout(r, 40));

    expect(getPingCount()).toBeGreaterThanOrEqual(1);
  });

  test('waits for AppState to become active before showing Alert', async () => {
    __setAppState('background');
    const waitTimeoutMs = 60;

    const graph = buildGraph({ autoConfirm: false, activityWaitTimeoutMs: waitTimeoutMs });

    initializeSignalSystem(graph);
    loadAllNodes();
    await executeGraph(graph);

    triggerNode(1);

    await new Promise((r) => setTimeout(r, waitTimeoutMs / 3));
    expect(Alert.alert).not.toHaveBeenCalled();

    __setAppState('active');
    await new Promise((r) => setTimeout(r, waitTimeoutMs));

    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  test('does not open Alert when AppState stays inactive', async () => {
    __setAppState('background');
    const waitTimeoutMs = 40;

    const graph = buildGraph({ autoConfirm: false, activityWaitTimeoutMs: waitTimeoutMs });

    initializeSignalSystem(graph);
    loadAllNodes();
    await executeGraph(graph);

    triggerNode(1);

    await new Promise((r) => setTimeout(r, waitTimeoutMs + 30));

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(getPingCount()).toBe(0);
  });
});

export {};
