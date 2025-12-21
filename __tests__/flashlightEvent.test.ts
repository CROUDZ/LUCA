jest.resetModules();

const { initializeSignalSystem, resetSignalSystem } = require('../src/engine/SignalSystem');
const { getPingCount, resetPingCount } = require('../src/engine/nodes/PingNode');
const { setFlashlightState } = require('../src/engine/nodes/FlashLightConditionNode');

describe('FlashLight event integration', () => {
  beforeEach(async () => {
    // Simple graph: EventListener -> Ping
    const graph = {
      nodes: new Map([
        [
          1,
          {
            id: 1,
            name: 'EventListener',
            type: 'events.listener',
            data: { eventName: 'flashlight.changed' },
            inputs: [],
            outputs: [2],
          },
        ],
        [2, { id: 2, name: 'Ping', type: 'action.ping', data: {}, inputs: [1], outputs: [] }],
      ]),
      edges: [{ from: 1, to: 2 }],
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

  it('FlashLight condition should propagate when trigger is active and flashlight is ON', async () => {
    // Graph: Trigger -> FlashLight condition -> Ping
    // Le nouveau système nécessite un trigger pour activer le flux
    resetSignalSystem();

    const graph = {
      nodes: new Map([
        [
          0,
          {
            id: 0,
            name: 'Trigger',
            type: 'input.trigger',
            data: { settings: { continuousMode: true } },
            inputs: [],
            outputs: [1],
          },
        ],
        [
          1,
          {
            id: 1,
            name: 'FlashLight',
            type: 'condition.flashlight',
            data: { settings: { invertSignal: false } },
            inputs: [0],
            outputs: [2],
          },
        ],
        [2, { id: 2, name: 'Ping', type: 'action.ping', data: {}, inputs: [1], outputs: [] }],
      ]),
      edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }],
    };

    initializeSignalSystem(graph);
    const { loadAllNodes } = require('../src/engine/NodeRegistry');
    loadAllNodes();
    const { executeGraph } = require('../src/engine/engine');
    await executeGraph(graph);
    resetPingCount();

    // D'abord activer le trigger pour que le signal soit actif
    const { triggerNode } = require('../src/engine/nodes/TriggerNode');
    triggerNode(0);
    
    await new Promise((resolve) => setTimeout(resolve, 50));
    
    // Puis activer la lampe (la condition devient vraie)
    await setFlashlightState(true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(getPingCount()).toBe(1);
  });
});

export {};
