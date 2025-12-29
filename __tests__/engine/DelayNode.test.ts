import {
  initializeSignalSystem,
  resetSignalSystem,
  getSignalSystem,
} from '../../app/src/engine/SignalSystem';
import DelayNode from '../../app/src/engine/nodes/DelayNode';
import type { Graph } from '../../app/src/types';

afterEach(() => {
  resetSignalSystem();
});

function createGraph() {
  const nodes = new Map<number, any>();

  nodes.set(1, { id: 1, name: 'source', type: 'input', data: {}, inputs: [], outputs: [2] });
  nodes.set(2, { id: 2, name: 'delay', type: 'flow.delay', data: {}, inputs: [1], outputs: [3] });
  nodes.set(3, { id: 3, name: 'sink', type: 'output', data: {}, inputs: [2], outputs: [] });

  return { nodes, edges: [] } as Graph;
}

async function initDelayNode(delayMs = 100) {
  const graph = createGraph();
  initializeSignalSystem(graph);

  await DelayNode.execute({
    nodeId: 2,
    inputs: {},
    inputsCount: 1,
    settings: { delayMs },
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

test('Delay: ON cancelled if OFF arrives before timeout', async () => {
  const { ss, received } = await initDelayNode(100);

  await ss.activateNode(1, { test: 'x' }, undefined, { forcePropagation: true });
  // Small delay to ensure the Delay node scheduled its timeout
  await new Promise((r) => setTimeout(r, 10));

  await ss.deactivateNode(1);

  // Wait longer than delay to ensure any scheduled propagation would have happened
  await new Promise((r) => setTimeout(r, 200));

  expect(received.filter((r) => r.state === 'ON').length).toBe(0);
  // OFF should have propagated immediately
  expect(received.some((r) => r.state === 'OFF')).toBe(true);
});

test('Delay: ON propagated after timeout if not cancelled', async () => {
  const { ss, received } = await initDelayNode(50);

  await ss.activateNode(1, { test: 'y' }, undefined, { forcePropagation: true });

  await new Promise((r) => setTimeout(r, 100));

  expect(received.some((r) => r.state === 'ON')).toBe(true);
});
