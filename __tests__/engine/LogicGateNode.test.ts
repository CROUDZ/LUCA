import {
  initializeSignalSystem,
  resetSignalSystem,
  getSignalSystem,
} from '../../app/src/engine/SignalSystem';
import LogicGateNode, {
  resetLogicGateState,
  resetAllLogicGateStates,
} from '../../app/src/engine/nodes/LogicGateNode';
import type { Graph } from '../../app/src/types';

afterEach(() => {
  resetSignalSystem();
  resetAllLogicGateStates();
});

function createGraph() {
  const nodes = new Map<number, any>();

  nodes.set(1, { id: 1, name: 'sourceA', type: 'input', data: {}, inputs: [], outputs: [2] });
  nodes.set(4, { id: 4, name: 'sourceB', type: 'input', data: {}, inputs: [], outputs: [2] });
  nodes.set(2, {
    id: 2,
    name: 'logic',
    type: 'condition.logic-gate',
    data: {},
    inputs: [1, 4],
    outputs: [3],
  });
  nodes.set(3, { id: 3, name: 'sink', type: 'output', data: {}, inputs: [2], outputs: [] });

  return { nodes, edges: [] } as Graph;
}

async function initAndRegister(gateSettings: Record<string, any>) {
  const graph = createGraph();
  initializeSignalSystem(graph);

  await LogicGateNode.execute({
    nodeId: 2,
    inputs: {},
    inputsCount: 2,
    settings: gateSettings,
    log: () => {},
  });

  const ss = getSignalSystem();
  if (!ss) throw new Error('SignalSystem not initialized');

  const received: Array<{ state: string; data?: any }> = [];

  ss.registerHandler(3, (signal) => {
    received.push({ state: signal.state, data: signal.data });
    return { propagate: true, state: signal.state, data: signal.data };
  });

  return { ss, received };
}

test('AND gate: ON when both inputs true, OFF when one turns off', async () => {
  const { ss, received } = await initAndRegister({
    gateType: 'AND',
    inputCount: 2,
    resetAfterEval: true,
  });

  await ss.activateNode(1, { inputKey: 'input_a', inputValue: true }, undefined, {
    forcePropagation: true,
  });
  await ss.activateNode(4, { inputKey: 'input_b', inputValue: true }, undefined, {
    forcePropagation: true,
  });

  await new Promise((r) => setTimeout(r, 50));

  expect(received.some((r) => r.state === 'ON')).toBe(true);

  await ss.deactivateNode(1);
  await new Promise((r) => setTimeout(r, 50));

  // Debug: record messages and node state
  // debug: received contents available in `received` if needed
  expect(ss.getNodeState(3)).toBe('OFF');
  expect(received.some((r) => r.state === 'OFF')).toBe(true);
});

test('OR gate: ON if any input true', async () => {
  const { ss, received } = await initAndRegister({
    gateType: 'OR',
    inputCount: 2,
    resetAfterEval: true,
  });

  await ss.activateNode(1, { inputKey: 'input_a', inputValue: false }, undefined, {
    forcePropagation: true,
  });
  await ss.activateNode(4, { inputKey: 'input_b', inputValue: true }, undefined, {
    forcePropagation: true,
  });

  await new Promise((r) => setTimeout(r, 20));

  expect(received.some((r) => r.state === 'ON')).toBe(true);
});

test('XOR gate: ON only when exactly one input true', async () => {
  const { ss, received } = await initAndRegister({
    gateType: 'XOR',
    inputCount: 2,
    resetAfterEval: true,
  });

  await ss.activateNode(1, { inputKey: 'input_a', inputValue: true }, undefined, {
    forcePropagation: true,
  });
  await ss.activateNode(4, { inputKey: 'input_b', inputValue: true }, undefined, {
    forcePropagation: true,
  });

  await new Promise((r) => setTimeout(r, 20));

  expect(received.filter((r) => r.state === 'ON').length).toBe(0);
});

test('XNOR gate: ON when inputs are equal (true,true => ON)', async () => {
  const { ss, received } = await initAndRegister({
    gateType: 'XNOR',
    inputCount: 2,
    resetAfterEval: true,
  });

  await ss.activateNode(1, { inputKey: 'input_a', inputValue: true }, undefined, {
    forcePropagation: true,
  });
  await ss.activateNode(4, { inputKey: 'input_b', inputValue: true }, undefined, {
    forcePropagation: true,
  });

  await new Promise((r) => setTimeout(r, 20));

  expect(received.some((r) => r.state === 'ON')).toBe(true);
});

test('NAND gate: OFF when both true (no ON propagation)', async () => {
  const { ss, received } = await initAndRegister({
    gateType: 'NAND',
    inputCount: 2,
    resetAfterEval: true,
  });

  await ss.activateNode(1, { inputKey: 'input_a', inputValue: true }, undefined, {
    forcePropagation: true,
  });
  await ss.activateNode(4, { inputKey: 'input_b', inputValue: true }, undefined, {
    forcePropagation: true,
  });

  await new Promise((r) => setTimeout(r, 20));

  expect(received.filter((r) => r.state === 'ON').length).toBe(0);
});

test('NOR gate: ON when all inputs false', async () => {
  const { ss, received } = await initAndRegister({
    gateType: 'NOR',
    inputCount: 2,
    resetAfterEval: true,
  });

  await ss.activateNode(1, { inputKey: 'input_a', inputValue: false }, undefined, {
    forcePropagation: true,
  });
  await ss.activateNode(4, { inputKey: 'input_b', inputValue: false }, undefined, {
    forcePropagation: true,
  });

  await new Promise((r) => setTimeout(r, 20));

  expect(received.some((r) => r.state === 'ON')).toBe(true);
});

test('NOT gate: single input inversion', async () => {
  const { ss, received } = await initAndRegister({
    gateType: 'NOT',
    inputCount: 1,
    resetAfterEval: true,
  });

  await ss.activateNode(1, { inputKey: 'input_a', inputValue: false }, undefined, {
    forcePropagation: true,
  });
  await new Promise((r) => setTimeout(r, 20));
  expect(received.some((r) => r.state === 'ON')).toBe(true);

  resetLogicGateState(2);
  received.length = 0;

  await ss.activateNode(1, { inputKey: 'input_a', inputValue: true }, undefined, {
    forcePropagation: true,
  });
  await new Promise((r) => setTimeout(r, 20));
  expect(received.filter((r) => r.state === 'ON').length).toBe(0);
});
