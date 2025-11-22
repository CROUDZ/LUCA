// using commonjs require in tests
jest.resetModules();
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }));

const { initializeSignalSystem, resetSignalSystem, getSignalSystem } = require('../src/engine/SignalSystem');
const { triggerNode } = require('../src/engine/nodes/TriggerNode');
const { getPingCount, resetPingCount } = require('../src/engine/nodes/PingNode');
const { loadAllNodes } = require('../src/engine/NodeRegistry');
const { executeGraph } = require('../src/engine/engine');

import type { Graph } from '../src/types';

describe('IfElseNode', () => {
  let graph: Graph;

  beforeEach(async () => {
    resetPingCount();
  });

  afterEach(() => {
    resetSignalSystem();
  });

  async function setupGraph(nodes: Graph['nodes']) {
    graph = { nodes, edges: [] } as Graph;
    // Turn nodes map into suitable structure
    // edges are computed by engine.parseDrawflowGraph ordinarily; here we set based on outputs field
    graph.nodes.forEach((n) => {
      n.outputs = n.outputs || [];
      n.inputs = n.inputs || [];
    });

    initializeSignalSystem(graph);
    loadAllNodes();
    await executeGraph(graph);
  }

  it('should propagate when expression is true', async () => {
    const nodes = new Map([
      [1, { id: 1, name: 'Trigger', type: 'input.trigger', data: {}, inputs: [], outputs: [2] }],
  [2, { id: 2, name: 'IfElse', type: 'condition.if-else', data: { settings: { conditionType: 'expression', expression: 'signal.data.pass' } }, inputs: [1], outputs: [3] }],
      [3, { id: 3, name: 'Ping', type: 'action.ping', data: {}, inputs: [2], outputs: [] }],
    ]);

    await setupGraph(nodes);
  // Small sanity checks

    triggerNode(1, { pass: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getPingCount()).toBe(1);
  });

  it('should not propagate when expression is false', async () => {
    const nodes = new Map([
      [1, { id: 1, name: 'Trigger', type: 'input.trigger', data: {}, inputs: [], outputs: [2] }],
  [2, { id: 2, name: 'IfElse', type: 'condition.if-else', data: { settings: { conditionType: 'expression', expression: 'signal.data.pass' } }, inputs: [1], outputs: [3] }],
      [3, { id: 3, name: 'Ping', type: 'action.ping', data: {}, inputs: [2], outputs: [] }],
    ]);

    await setupGraph(nodes);

    triggerNode(1, { pass: false });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getPingCount()).toBe(0);
  });

  it('should propagate on comparison match', async () => {
    const nodes = new Map([
      [1, { id: 1, name: 'Trigger', type: 'input.trigger', data: {}, inputs: [], outputs: [2] }],
      [2, { id: 2, name: 'IfElse', type: 'condition.if-else', data: { settings: { conditionType: 'comparison', comparisonOperator: '==', comparisonValue: '42' } }, inputs: [1], outputs: [3] }],
      [3, { id: 3, name: 'Ping', type: 'action.ping', data: {}, inputs: [2], outputs: [] }],
    ]);

    await setupGraph(nodes);

    triggerNode(1, 42);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getPingCount()).toBe(1);
  });

  it('should use variable when conditionType is variable', async () => {
    const nodes = new Map([
      [1, { id: 1, name: 'Trigger', type: 'input.trigger', data: {}, inputs: [], outputs: [2] }],
      [2, { id: 2, name: 'IfElse', type: 'condition.if-else', data: { settings: { conditionType: 'variable', variableName: 'flag' } }, inputs: [1], outputs: [3] }],
      [3, { id: 3, name: 'Ping', type: 'action.ping', data: {}, inputs: [2], outputs: [] }],
    ]);

    await setupGraph(nodes);

    // set variable
    const ss = getSignalSystem();
    ss.setVariable('flag', true);

    triggerNode(1);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getPingCount()).toBe(1);
  });

  it('should invert signal when invertSignal is true', async () => {
    const nodes = new Map([
      [1, { id: 1, name: 'Trigger', type: 'input.trigger', data: {}, inputs: [], outputs: [2] }],
      [2, { id: 2, name: 'IfElse', type: 'condition.if-else', data: { settings: { conditionType: 'expression', expression: 'true', invertSignal: true } }, inputs: [1], outputs: [3] }],
      [3, { id: 3, name: 'Ping', type: 'action.ping', data: {}, inputs: [2], outputs: [] }],
    ]);

    await setupGraph(nodes);

    triggerNode(1);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getPingCount()).toBe(0);
  });

  it('should not load node when expression is unsafe', async () => {
    const nodes = new Map([
      [1, { id: 1, name: 'Trigger', type: 'input.trigger', data: {}, inputs: [], outputs: [2] }],
      [2, { id: 2, name: 'IfElse', type: 'condition.if-else', data: { settings: { conditionType: 'expression', expression: 'process.exit(1)' } }, inputs: [1], outputs: [3] }],
      [3, { id: 3, name: 'Ping', type: 'action.ping', data: {}, inputs: [2], outputs: [] }],
    ]);

    graph = { nodes, edges: [] } as Graph;
    initializeSignalSystem(graph);
    loadAllNodes();

    // executeGraph should mark the node as error and not register handler
    const result = await executeGraph(graph);
    // Expect the node 2 to have an error
    expect(result.errors.has(2)).toBe(true);
  });

});

export {};
