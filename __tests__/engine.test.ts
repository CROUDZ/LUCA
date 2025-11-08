/**
 * Tests améliorés pour l'engine de graphe
 */

import {
  parseDrawflowGraph,
  topologicalSort,
  exportToDrawflow,
  validateGraph,
  findSourceNodes,
  findOutputNodes,
} from '../src/engine/engine';
import exampleGraph from '../exampleGraph.json';
import type { DrawflowExport } from '../src/types';

describe('Engine - Graph Parser', () => {
  describe('parseDrawflowGraph', () => {
    test('should parse exampleGraph.json without errors', () => {
      expect(() => {
        const graph = parseDrawflowGraph(exampleGraph as DrawflowExport);
        expect(graph.nodes.size).toBeGreaterThan(0);
      }).not.toThrow();
    });

    test('should extract nodes from exampleGraph', () => {
      const graph = parseDrawflowGraph(exampleGraph as DrawflowExport);
      expect(graph.nodes.size).toBe(2); // texture + mix
      expect(graph.edges.length).toBe(1); // texture -> mix
    });

    test('should detect node types correctly', () => {
      const graph = parseDrawflowGraph(exampleGraph as DrawflowExport);
      const node1 = graph.nodes.get(1);
      const node2 = graph.nodes.get(2);

      expect(node1?.type).toBe('texture');
      expect(node2?.type).toBe('mix');
    });

    test('should build correct edges', () => {
      const graph = parseDrawflowGraph(exampleGraph as DrawflowExport);

      expect(graph.edges).toEqual([{ from: 1, to: 2 }]);
    });

    test('should handle empty graph', () => {
      const emptyGraph: DrawflowExport = {
        drawflow: {
          Home: {
            data: {},
          },
        },
      };

      const graph = parseDrawflowGraph(emptyGraph);
      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.length).toBe(0);
    });
  });

  describe('topologicalSort', () => {
    test('should perform topological sort on exampleGraph', () => {
      const graph = parseDrawflowGraph(exampleGraph as DrawflowExport);
      const order = topologicalSort(graph);

      expect(order).not.toBeNull();
      expect(order?.length).toBe(2);

      // Node 1 (texture) doit être avant Node 2 (mix)
      const node1Index = order?.indexOf(1);
      const node2Index = order?.indexOf(2);
      expect(node1Index).toBeLessThan(node2Index!);
    });

    test('should detect cycles in graph', () => {
      const cyclicGraph: DrawflowExport = {
        drawflow: {
          Home: {
            data: {
              '1': {
                id: 1,
                name: 'node1',
                data: { type: 'test' },
                class: 'test-node',
                html: '',
                typenode: false,
                inputs: {},
                outputs: {
                  output_1: {
                    connections: [{ node: '2', output: 'input_1' }],
                  },
                },
                pos_x: 0,
                pos_y: 0,
              },
              '2': {
                id: 2,
                name: 'node2',
                data: { type: 'test' },
                class: 'test-node',
                html: '',
                typenode: false,
                inputs: {},
                outputs: {
                  output_1: {
                    connections: [{ node: '1', output: 'input_1' }],
                  },
                },
                pos_x: 0,
                pos_y: 0,
              },
            },
          },
        },
      };

      const graph = parseDrawflowGraph(cyclicGraph);
      const order = topologicalSort(graph);
      expect(order).toBeNull();
    });

    test('should handle single node graph', () => {
      const singleNodeGraph: DrawflowExport = {
        drawflow: {
          Home: {
            data: {
              '1': {
                id: 1,
                name: 'single',
                data: { type: 'test' },
                class: 'test-node',
                html: '',
                typenode: false,
                inputs: {},
                outputs: {},
                pos_x: 0,
                pos_y: 0,
              },
            },
          },
        },
      };

      const graph = parseDrawflowGraph(singleNodeGraph);
      const order = topologicalSort(graph);
      expect(order).toEqual([1]);
    });
  });

  describe('validateGraph', () => {
    test('should validate correct graph', () => {
      const graph = parseDrawflowGraph(exampleGraph as DrawflowExport);
      const result = validateGraph(graph);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should detect cycles', () => {
      const cyclicGraph: DrawflowExport = {
        drawflow: {
          Home: {
            data: {
              '1': {
                id: 1,
                name: 'node1',
                data: { type: 'test' },
                class: 'test-node',
                html: '',
                typenode: false,
                inputs: {},
                outputs: {
                  output_1: {
                    connections: [{ node: '2', output: 'input_1' }],
                  },
                },
                pos_x: 0,
                pos_y: 0,
              },
              '2': {
                id: 2,
                name: 'node2',
                data: { type: 'test' },
                class: 'test-node',
                html: '',
                typenode: false,
                inputs: {},
                outputs: {
                  output_1: {
                    connections: [{ node: '1', output: 'input_1' }],
                  },
                },
                pos_x: 0,
                pos_y: 0,
              },
            },
          },
        },
      };

      const graph = parseDrawflowGraph(cyclicGraph);
      const result = validateGraph(graph);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cycle detected in graph');
    });
  });

  describe('findSourceNodes', () => {
    test('should find source nodes', () => {
      const graph = parseDrawflowGraph(exampleGraph as DrawflowExport);
      const sources = findSourceNodes(graph);

      expect(sources.length).toBe(1);
      expect(sources[0].id).toBe(1);
      expect(sources[0].type).toBe('texture');
    });
  });

  describe('findOutputNodes', () => {
    test('should find output nodes', () => {
      const graph = parseDrawflowGraph(exampleGraph as DrawflowExport);
      const outputs = findOutputNodes(graph);

      expect(outputs.length).toBe(1);
      expect(outputs[0].id).toBe(2);
      expect(outputs[0].type).toBe('mix');
    });
  });

  describe('exportToDrawflow', () => {
    test('should export graph back to Drawflow format', () => {
      const graph = parseDrawflowGraph(exampleGraph as DrawflowExport);
      const exported = exportToDrawflow(graph);

      expect(exported.drawflow).toBeDefined();
      expect(exported.drawflow.Home).toBeDefined();
      expect(exported.drawflow.Home.data).toBeDefined();
      expect(Object.keys(exported.drawflow.Home.data).length).toBe(2);
    });

    test('should preserve node data on round-trip', () => {
      const graph = parseDrawflowGraph(exampleGraph as DrawflowExport);
      const exported = exportToDrawflow(graph);
      const reimported = parseDrawflowGraph(exported);

      expect(reimported.nodes.size).toBe(graph.nodes.size);
      expect(reimported.edges.length).toBe(graph.edges.length);

      // Verify node types are preserved
      for (const [nodeId, node] of graph.nodes) {
        const reimportedNode = reimported.nodes.get(nodeId);
        expect(reimportedNode?.type).toBe(node.type);
        expect(reimportedNode?.name).toBe(node.name);
      }
    });
  });
});
