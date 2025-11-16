/**
 * Engine - Parseur et évaluateur de graphe Drawflow
 * Convertit le JSON Drawflow en modèle de graphe et effectue tri topologique
 */

import type {
  Graph,
  GraphNode,
  DrawflowExport,
  DrawflowNodeData,
  NodeExecutionContext,
  NodeExecutionResult,
  EvaluationResult,
} from '../types';
import { nodeRegistry } from './NodeRegistry';
import { logger } from '../utils/logger';

/**
 * Parse un export Drawflow JSON vers un modèle de graphe
 */
export function parseDrawflowGraph(drawflowData: DrawflowExport): Graph {
  const graph: Graph = {
    nodes: new Map(),
    edges: [],
  };

  // Extraire les données (module "Home" par défaut)
  const moduleData = drawflowData.drawflow?.Home?.data || {};

  // Construire les nœuds
  for (const [nodeId, nodeData] of Object.entries(moduleData)) {
    const typedNodeData = nodeData as DrawflowNodeData;
    const node: GraphNode = {
      id: parseInt(nodeId, 10),
      name: typedNodeData.name || 'unknown',
      type: typedNodeData.data?.type || 'default',
      data: typedNodeData.data || {},
      inputs: [],
      outputs: [],
    };

    // Parser les outputs pour construire les edges
    const outputs = typedNodeData.outputs || {};
    for (const [_outputKey, outputData] of Object.entries(outputs)) {
      const connections = outputData.connections || [];
      for (const conn of connections) {
        const targetNodeId = parseInt(conn.node, 10);
        node.outputs.push(targetNodeId);
        graph.edges.push({ from: node.id, to: targetNodeId });
      }
    }

    graph.nodes.set(node.id, node);
  }

  // Remplir les inputs (reverse des edges)
  for (const edge of graph.edges) {
    const targetNode = graph.nodes.get(edge.to);
    if (targetNode && !targetNode.inputs.includes(edge.from)) {
      targetNode.inputs.push(edge.from);
    }
  }

  return graph;
}

/**
 * Tri topologique (Kahn's algorithm)
 * Retourne l'ordre d'évaluation des nœuds ou null si cycle détecté
 */
export function topologicalSort(graph: Graph): number[] | null {
  const sorted: number[] = [];
  const inDegree = new Map<number, number>();

  // Init in-degree
  for (const [nodeId] of graph.nodes) {
    inDegree.set(nodeId, 0);
  }
  for (const edge of graph.edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
  }

  // Queue des nœuds sans dépendances
  const queue: number[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) queue.push(nodeId);
  }

  // Process
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);

    const node = graph.nodes.get(nodeId);
    if (node) {
      for (const outputId of node.outputs) {
        const newDegree = (inDegree.get(outputId) || 0) - 1;
        inDegree.set(outputId, newDegree);
        if (newDegree === 0) queue.push(outputId);
      }
    }
  }

  // Si tous les nœuds ne sont pas traités, il y a un cycle
  return sorted.length === graph.nodes.size ? sorted : null;
}

/**
 * Exporte le graphe vers le format Drawflow (minimal)
 */
export function exportToDrawflow(graph: Graph): DrawflowExport {
  const data: Record<string, any> = {};

  for (const [nodeId, node] of graph.nodes) {
    const outputs: Record<string, any> = {};
    let outputIndex = 1;

    for (const targetId of node.outputs) {
      outputs[`output_${outputIndex}`] = {
        connections: [{ node: targetId.toString(), output: 'input_1' }],
      };
      outputIndex++;
    }

    const inputs: Record<string, any> = {};
    let inputIndex = 1;
    for (const sourceId of node.inputs) {
      inputs[`input_${inputIndex}`] = {
        connections: [{ node: sourceId.toString(), input: 'output_1' }],
      };
      inputIndex++;
    }

    data[nodeId.toString()] = {
      id: nodeId,
      name: node.name,
      data: node.data,
      class: `${node.type}-node`,
      html: `<div class="title">${node.name}</div>`,
      typenode: false,
      inputs,
      outputs,
      pos_x: Math.random() * 400 + 100,
      pos_y: Math.random() * 300 + 100,
    };
  }

  return {
    drawflow: {
      Home: { data },
    },
  };
}

/**
 * Valider un graphe (vérifier qu'il n'y a pas de cycles)
 */
export function validateGraph(graph: Graph): { valid: boolean; error?: string } {
  const order = topologicalSort(graph);

  if (order === null) {
    return { valid: false, error: 'Cycle detected in graph' };
  }

  if (order.length !== graph.nodes.size) {
    return { valid: false, error: 'Graph contains disconnected nodes' };
  }

  return { valid: true };
}

/**
 * Trouver les nœuds sources (sans inputs)
 */
export function findSourceNodes(graph: Graph): GraphNode[] {
  const sources: GraphNode[] = [];

  for (const node of graph.nodes.values()) {
    if (node.inputs.length === 0) {
      sources.push(node);
    }
  }

  return sources;
}

/**
 * Trouver les nœuds de sortie (sans outputs)
 */
export function findOutputNodes(graph: Graph): GraphNode[] {
  const outputs: GraphNode[] = [];

  for (const node of graph.nodes.values()) {
    if (node.outputs.length === 0) {
      outputs.push(node);
    }
  }

  return outputs;
}

/**
 * Exécuter le graphe en utilisant le NodeRegistry
 */
export async function executeGraph(graph: Graph): Promise<EvaluationResult> {
  const result: EvaluationResult = {
    success: true,
    values: new Map(),
    errors: new Map(),
    executionOrder: [],
  };

  // Obtenir l'ordre d'exécution (tri topologique)
  const order = topologicalSort(graph);

  if (!order) {
    result.success = false;
    return result;
  }

  result.executionOrder = order;

  // Exécuter chaque node dans l'ordre
  for (const nodeId of order) {
    const node = graph.nodes.get(nodeId);
    if (!node) continue;

    // Récupérer la définition de la node depuis le registry
    const nodeDefinition = nodeRegistry.getNode(node.type);

    if (!nodeDefinition) {
      result.errors.set(nodeId, new Error(`Node type "${node.type}" not found in registry`));
      result.success = false;
      continue;
    }

    try {
      // Préparer les inputs de la node
      const inputs: Record<string, any> = {};

      for (const inputNodeId of node.inputs) {
        const inputValue = result.values.get(inputNodeId);
        if (inputValue !== undefined) {
          // Pour simplifier, on utilise la première sortie
          inputs[`input_${inputNodeId}`] = inputValue;
        }
      }

      // Créer le contexte d'exécution
      const context: NodeExecutionContext = {
        nodeId: node.id,
        inputs,
        inputsCount: node.inputs.length,
        // Merge user-provided node data with nodeDefinition.defaultSettings
        // This ensures nodes that rely on defaults (ex: FlashLight autoEmitOnChange)
        // behave consistently when no explicit setting is provided.
        settings: {
          ...(nodeDefinition.defaultSettings || {}),
          ...(node.data || {}),
        },
        log: (message: string) => {
          logger.debug(`[Node ${nodeId}] ${message}`);
        },
      };

      // Valider si une fonction de validation existe
      if (nodeDefinition.validate) {
        const validation = nodeDefinition.validate(context);
        if (validation !== true) {
          throw new Error(typeof validation === 'string' ? validation : 'Validation failed');
        }
      }

      // Exécuter la node
      const executionResult: NodeExecutionResult = await Promise.resolve(
        nodeDefinition.execute(context)
      );

      if (!executionResult.success) {
        throw new Error(executionResult.error || 'Execution failed');
      }

      // Stocker les résultats
      // Pour simplifier, on stocke la première sortie
      const outputValue = executionResult.outputs[Object.keys(executionResult.outputs)[0]];
      result.values.set(nodeId, outputValue);
    } catch (error) {
      result.errors.set(nodeId, error as Error);
      result.success = false;
      logger.error(`Error executing node ${nodeId}:`, error);
    }
  }

  return result;
}
