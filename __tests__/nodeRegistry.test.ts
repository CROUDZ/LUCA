/**
 * Tests pour le NodeRegistry
 */

import { nodeRegistry, loadAllNodes, registerNode } from '../src/engine/NodeRegistry';
import type { NodeDefinition } from '../src/types/node.types';

describe('NodeRegistry', () => {
  beforeEach(() => {
    // Réinitialiser le registry avant chaque test
    nodeRegistry.clear();
  });

  describe('Registration', () => {
    it('should register a node', () => {
      const testNode: NodeDefinition = {
        id: 'test.node',
        name: 'Test Node',
        description: 'A test node',
        category: 'Test',
        icon: 'test',
        iconFamily: 'material',
        inputs: [],
        outputs: [],
        execute: () => ({ outputs: {}, success: true }),
      };

      registerNode(testNode);

      expect(nodeRegistry.hasNode('test.node')).toBe(true);
      expect(nodeRegistry.getCount()).toBe(1);
    });

    it('should get a registered node', () => {
      const testNode: NodeDefinition = {
        id: 'test.node',
        name: 'Test Node',
        description: 'A test node',
        category: 'Test',
        icon: 'test',
        iconFamily: 'material',
        inputs: [],
        outputs: [],
        execute: () => ({ outputs: {}, success: true }),
      };

      registerNode(testNode);

      const retrieved = nodeRegistry.getNode('test.node');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Node');
    });

    it('should return undefined for non-existent node', () => {
      const retrieved = nodeRegistry.getNode('non.existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Categories', () => {
    it('should track categories', () => {
      const testNode1: NodeDefinition = {
        id: 'test.node1',
        name: 'Test Node 1',
        description: 'A test node',
        category: 'Category1',
        icon: 'test',
        iconFamily: 'material',
        inputs: [],
        outputs: [],
        execute: () => ({ outputs: {}, success: true }),
      };

      const testNode2: NodeDefinition = {
        id: 'test.node2',
        name: 'Test Node 2',
        description: 'Another test node',
        category: 'Category2',
        icon: 'test',
        iconFamily: 'material',
        inputs: [],
        outputs: [],
        execute: () => ({ outputs: {}, success: true }),
      };

      registerNode(testNode1);
      registerNode(testNode2);

      const categories = nodeRegistry.getCategories();
      expect(categories).toContain('Category1');
      expect(categories).toContain('Category2');
      expect(categories.length).toBe(2);
    });

    it('should get nodes by category', () => {
      const testNode1: NodeDefinition = {
        id: 'test.node1',
        name: 'Test Node 1',
        description: 'A test node',
        category: 'Math',
        icon: 'test',
        iconFamily: 'material',
        inputs: [],
        outputs: [],
        execute: () => ({ outputs: {}, success: true }),
      };

      const testNode2: NodeDefinition = {
        id: 'test.node2',
        name: 'Test Node 2',
        description: 'Another test node',
        category: 'Math',
        icon: 'test',
        iconFamily: 'material',
        inputs: [],
        outputs: [],
        execute: () => ({ outputs: {}, success: true }),
      };

      const testNode3: NodeDefinition = {
        id: 'test.node3',
        name: 'Test Node 3',
        description: 'A different node',
        category: 'Text',
        icon: 'test',
        iconFamily: 'material',
        inputs: [],
        outputs: [],
        execute: () => ({ outputs: {}, success: true }),
      };

      registerNode(testNode1);
      registerNode(testNode2);
      registerNode(testNode3);

      const mathNodes = nodeRegistry.getNodesByCategory('Math');
      expect(mathNodes.length).toBe(2);
      expect(mathNodes.every((node) => node.category === 'Math')).toBe(true);

      const textNodes = nodeRegistry.getNodesByCategory('Text');
      expect(textNodes.length).toBe(1);
    });
  });

  describe('Stats', () => {
    it('should return correct stats', () => {
      const testNode1: NodeDefinition = {
        id: 'test.node1',
        name: 'Test Node 1',
        description: 'A test node',
        category: 'Math',
        icon: 'test',
        iconFamily: 'material',
        inputs: [],
        outputs: [],
        execute: () => ({ outputs: {}, success: true }),
      };

      const testNode2: NodeDefinition = {
        id: 'test.node2',
        name: 'Test Node 2',
        description: 'Another test node',
        category: 'Text',
        icon: 'test',
        iconFamily: 'material',
        inputs: [],
        outputs: [],
        execute: () => ({ outputs: {}, success: true }),
      };

      registerNode(testNode1);
      registerNode(testNode2);

      const stats = nodeRegistry.getStats();
      expect(stats.total).toBe(2);
      expect(stats.categories).toBe(2);
      expect(stats.byCategory['Math']).toBe(1);
      expect(stats.byCategory['Text']).toBe(1);
    });
  });

  describe('Clear', () => {
    it('should clear all nodes', () => {
      const testNode: NodeDefinition = {
        id: 'test.node',
        name: 'Test Node',
        description: 'A test node',
        category: 'Test',
        icon: 'test',
        iconFamily: 'material',
        inputs: [],
        outputs: [],
        execute: () => ({ outputs: {}, success: true }),
      };

      registerNode(testNode);
      expect(nodeRegistry.getCount()).toBe(1);

      nodeRegistry.clear();
      expect(nodeRegistry.getCount()).toBe(0);
      expect(nodeRegistry.getCategories().length).toBe(0);
    });
  });
});

describe('Node Execution', () => {
  beforeEach(() => {
    nodeRegistry.clear();
  });

  it('should execute a simple node', () => {
    const testNode: NodeDefinition = {
      id: 'test.simple',
      name: 'Simple Test',
      description: 'A simple test node',
      category: 'Test',
      icon: 'test',
      iconFamily: 'material',
      inputs: [{ name: 'value', type: 'number', label: 'Value' }],
      outputs: [{ name: 'result', type: 'number', label: 'Result' }],
      execute: (context) => {
        const result = context.inputs.value * 2;
        return { outputs: { result }, success: true };
      },
    };

    registerNode(testNode);

    const node = nodeRegistry.getNode('test.simple');
    expect(node).toBeDefined();

    const result = node!.execute({
      nodeId: 1,
      inputs: { value: 5 },
      settings: {},
    });

    expect(result.success).toBe(true);
    expect(result.outputs.result).toBe(10);
  });

  it('should handle node execution errors', () => {
    const testNode: NodeDefinition = {
      id: 'test.error',
      name: 'Error Test',
      description: 'A test node that errors',
      category: 'Test',
      icon: 'test',
      iconFamily: 'material',
      inputs: [],
      outputs: [],
      execute: () => {
        return { outputs: {}, success: false, error: 'Test error' };
      },
    };

    registerNode(testNode);

    const node = nodeRegistry.getNode('test.error');
    const result = node!.execute({
      nodeId: 1,
      inputs: {},
      settings: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Test error');
  });

  it('should validate node inputs', () => {
    const testNode: NodeDefinition = {
      id: 'test.validate',
      name: 'Validate Test',
      description: 'A test node with validation',
      category: 'Test',
      icon: 'test',
      iconFamily: 'material',
      inputs: [{ name: 'value', type: 'number', label: 'Value', required: true }],
      outputs: [],
      validate: (context) => {
        if (!context.inputs.value) {
          return 'Value is required';
        }
        if (context.inputs.value < 0) {
          return 'Value must be positive';
        }
        return true;
      },
      execute: () => ({ outputs: {}, success: true }),
    };

    registerNode(testNode);

    const node = nodeRegistry.getNode('test.validate');

    // Test validation failure
    const validation1 = node!.validate!({
      nodeId: 1,
      inputs: {},
      settings: {},
    });
    expect(validation1).toBe('Value is required');

    const validation2 = node!.validate!({
      nodeId: 1,
      inputs: { value: -5 },
      settings: {},
    });
    expect(validation2).toBe('Value must be positive');

    // Test validation success
    const validation3 = node!.validate!({
      nodeId: 1,
      inputs: { value: 10 },
      settings: {},
    });
    expect(validation3).toBe(true);
  });
});
