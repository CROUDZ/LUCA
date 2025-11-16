jest.resetModules();
jest.mock('react-native', () => ({ Alert: { alert: jest.fn((title: string, body: any, buttons: any) => {
  // Call the last button (confirm) to simulate user confirmation when called
  if (Array.isArray(buttons) && buttons.length > 0) {
    const confirm = buttons[buttons.length - 1];
    if (confirm && typeof confirm.onPress === 'function') {
      confirm.onPress();
    }
  }
}) } }));

const { initializeSignalSystem, resetSignalSystem } = require('../src/engine/SignalSystem');
const { triggerNode } = require('../src/engine/nodes/TriggerNode');
const { loadAllNodes } = require('../src/engine/NodeRegistry');
const { executeGraph } = require('../src/engine/engine');
const { getPingCount, resetPingCount } = require('../src/engine/nodes/PingNode');

describe('Confirm Node', () => {
  beforeEach(async () => {
    resetSignalSystem();
    resetPingCount();
  });

  afterEach(() => {
    resetSignalSystem();
  });

  test('propagates when autoConfirm true', async () => {
    const graph = {
      nodes: new Map([
        [1, { id: 1, name: 'Confirm', type: 'action.confirm', data: { autoConfirm: true }, inputs: [], outputs: [2] }],
        [2, { id: 2, name: 'Ping', type: 'action.ping', data: { showAlert: false }, inputs: [1], outputs: [] }],
      ]),
      edges: [{ from: 1, to: 2 }],
    };

    initializeSignalSystem(graph);
    loadAllNodes();
    await executeGraph(graph);

    triggerNode(1);

    await new Promise((r) => setTimeout(r, 40));

    expect(getPingCount()).toBeGreaterThanOrEqual(1);
  });
});

export {};
