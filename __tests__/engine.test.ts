/**
 * Test minimal pour vérifier que exampleGraph.json est parseable
 */

import { parseDrawflowGraph, topologicalSort } from '../src/engine/engine';
import exampleGraph from '../exampleGraph.json';

describe('Engine - Graph Parser', () => {
  test('should parse exampleGraph.json without errors', () => {
    expect(() => {
      const graph = parseDrawflowGraph(exampleGraph);
      expect(graph.nodes.size).toBeGreaterThan(0);
    }).not.toThrow();
  });

  test('should extract nodes from exampleGraph', () => {
    const graph = parseDrawflowGraph(exampleGraph);
    expect(graph.nodes.size).toBe(2); // texture + mix
    expect(graph.edges.length).toBe(1); // texture -> mix
  });

  test('should perform topological sort on exampleGraph', () => {
    const graph = parseDrawflowGraph(exampleGraph);
    const order = topologicalSort(graph);
    
    expect(order).not.toBeNull();
    expect(order?.length).toBe(2);
    
    // Node 1 (texture) doit être avant Node 2 (mix)
    const node1Index = order?.indexOf(1);
    const node2Index = order?.indexOf(2);
    expect(node1Index).toBeLessThan(node2Index!);
  });

  test('should detect node types correctly', () => {
    const graph = parseDrawflowGraph(exampleGraph);
    const node1 = graph.nodes.get(1);
    const node2 = graph.nodes.get(2);
    
    expect(node1?.type).toBe('texture');
    expect(node2?.type).toBe('mix');
  });

  test('should build correct edges', () => {
    const graph = parseDrawflowGraph(exampleGraph);
    
    expect(graph.edges).toEqual([
      { from: 1, to: 2 }
    ]);
  });
});
