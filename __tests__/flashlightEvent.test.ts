jest.resetModules();
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }));

const { initializeSignalSystem, resetSignalSystem } = require('../src/engine/SignalSystem');
const { getPingCount, resetPingCount } = require('../src/engine/nodes/PingNode');
const { setFlashlightState } = require('../src/engine/nodes/FlashLightConditionNode');

describe('FlashLight event integration', () => {
  beforeEach(async () => {
    // Simple graph: EventListener -> Ping
    const graph = {
      nodes: new Map([
        [1, { id: 1, name: 'EventListener', type: 'events.listener', data: { eventName: 'flashlight.changed' }, inputs: [], outputs: [2] }],
        [2, { id: 2, name: 'Ping', type: 'action.ping', data: {}, inputs: [1], outputs: [] }],
      ]),
      edges: [ { from: 1, to: 2 } ],
    };

    initializeSignalSystem(graph);
    // Load all nodes and execute graph so handlers are registered
    const { loadAllNodes } = require('../src/engine/NodeRegistry');
    loadAllNodes();
    const { executeGraph } = require('../src/engine/engine');
    await executeGraph(graph);

    resetPingCount();
  });

  afterEach(() => {
    resetSignalSystem();
  });

  it('should trigger ping when flashlight changed event is emitted', async () => {
    // Ensure no pings
    expect(getPingCount()).toBe(0);

    await setFlashlightState(true);

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(getPingCount()).toBe(1);
  });

  it('FlashLight node should auto-emit when autoEmitOnChange is set (useful for flashlight -> Ping)', async () => {
    // Graph: FlashLight node (autoEmitOnChange) -> Ping
    resetSignalSystem();

    const graph = {
      nodes: new Map([
        [1, { id: 1, name: 'FlashLight', type: 'condition.flashlight', data: { autoEmitOnChange: true }, inputs: [], outputs: [2] }],
        [2, { id: 2, name: 'Ping', type: 'action.ping', data: {}, inputs: [1], outputs: [] }],
      ]),
      edges: [{ from: 1, to: 2 }],
    };

    initializeSignalSystem(graph);
    const { loadAllNodes } = require('../src/engine/NodeRegistry');
    loadAllNodes();
    const { executeGraph } = require('../src/engine/engine');
    await executeGraph(graph);

    // Activer la lampe (doit produire un signal depuis la node FlashLight)
    await setFlashlightState(true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(getPingCount()).toBe(1);
  });
});

export {};
