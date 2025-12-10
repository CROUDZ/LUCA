/**
 * Tests d'intégration pour LogicGateNode avec le système de signaux
 */

jest.resetModules();
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }));

import type { Graph } from '../app/src/types';

const { initializeSignalSystem, resetSignalSystem } = require('../src/engine/SignalSystem');
const { triggerNode } = require('../src/engine/nodes/TriggerNode');
const { getPingCount, resetPingCount } = require('../src/engine/nodes/PingNode');
const { resetAllLogicGateStates } = require('../src/engine/nodes/LogicGateNode');
const { loadAllNodes } = require('../src/engine/NodeRegistry');
const { executeGraph } = require('../src/engine/engine');

interface InputSignal {
  sourceId: number;
  value: boolean;
}

type GraphBuilder = (gateType: string) => Graph;

function buildLogicGateGraph(gateType: string): Graph {
  const nodes = new Map<number, any>();

  nodes.set(1, {
    id: 1,
    name: 'Trigger A',
    type: 'input.trigger',
    data: { settings: { continuousMode: false } },
    inputs: [],
    outputs: [3],
  });

  nodes.set(2, {
    id: 2,
    name: 'Trigger B',
    type: 'input.trigger',
    data: { settings: { continuousMode: false } },
    inputs: [],
    outputs: [3],
  });

  nodes.set(3, {
    id: 3,
    name: 'Logic Gate',
    type: 'condition.logic-gate',
    data: {
      settings: {
        gateType,
        inputCount: 2,
        resetAfterEval: true,
      },
    },
    inputs: [1, 2],
    outputs: [4],
  });

  nodes.set(4, {
    id: 4,
    name: 'Ping',
    type: 'action.ping',
    data: {
      settings: {
        showAlert: false,
        propagateSignal: false,
      },
    },
    inputs: [3],
    outputs: [],
  });

  return {
    nodes,
    edges: [
      { from: 1, to: 3 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
    ],
  };
}

function buildSingleInputGraph(gateType: string): Graph {
  const nodes = new Map<number, any>();

  nodes.set(1, {
    id: 1,
    name: 'Trigger',
    type: 'input.trigger',
    data: { settings: { continuousMode: false } },
    inputs: [],
    outputs: [3],
  });

  nodes.set(3, {
    id: 3,
    name: 'Logic Gate',
    type: 'condition.logic-gate',
    data: {
      settings: {
        gateType,
        resetAfterEval: true,
      },
    },
    inputs: [1],
    outputs: [4],
  });

  nodes.set(4, {
    id: 4,
    name: 'Ping',
    type: 'action.ping',
    data: {
      settings: {
        showAlert: false,
        propagateSignal: false,
      },
    },
    inputs: [3],
    outputs: [],
  });

  return {
    nodes,
    edges: [
      { from: 1, to: 3 },
      { from: 3, to: 4 },
    ],
  };
}

async function setupGraph(
  gateType: string,
  builder: GraphBuilder = buildLogicGateGraph
): Promise<void> {
  const graph = builder(gateType);
  initializeSignalSystem(graph);
  loadAllNodes();
  await executeGraph(graph);
  resetPingCount();
}

async function emitInputs(inputs: InputSignal[]): Promise<void> {
  for (const input of inputs) {
    triggerNode(input.sourceId, {
      inputValue: input.value,
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  await new Promise((resolve) => setTimeout(resolve, 60));
}

describe('LogicGateNode signal propagation', () => {
  afterEach(() => {
    resetSignalSystem();
    resetPingCount();
    resetAllLogicGateStates();
  });

  it('propagates only when AND inputs are true', async () => {
    await setupGraph('AND');

    await emitInputs([
      { sourceId: 1, value: true },
      { sourceId: 2, value: false },
    ]);

    expect(getPingCount()).toBe(0);

    await emitInputs([
      { sourceId: 1, value: true },
      { sourceId: 2, value: true },
    ]);

    expect(getPingCount()).toBe(1);
  });

  it('updates behavior when gateType changes to OR', async () => {
    await setupGraph('OR');

    await emitInputs([
      { sourceId: 1, value: true },
      { sourceId: 2, value: false },
    ]);

    expect(getPingCount()).toBe(1);
  });

  it('handles XOR logic with mutual exclusivity', async () => {
    await setupGraph('XOR');

    await emitInputs([
      { sourceId: 1, value: true },
      { sourceId: 2, value: true },
    ]);

    expect(getPingCount()).toBe(0);

    await emitInputs([
      { sourceId: 1, value: false },
      { sourceId: 2, value: true },
    ]);

    expect(getPingCount()).toBe(1);
  });

  it('propagates with single input when configured on OR', async () => {
    await setupGraph('OR', buildSingleInputGraph);

    await emitInputs([{ sourceId: 1, value: true }]);

    expect(getPingCount()).toBe(1);
  });

  it('does not propagate with single input on AND', async () => {
    await setupGraph('AND', buildSingleInputGraph);

    await emitInputs([{ sourceId: 1, value: true }]);

    expect(getPingCount()).toBe(0);
  });
});
