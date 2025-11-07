/**
 * Engine - Parseur et évaluateur de graphe Drawflow
 * Convertit le JSON Drawflow en modèle de graphe et effectue tri topologique
 */

export interface Node {
  id: number;
  name: string;
  type: string;
  data: any;
  inputs: number[];  // IDs des nœuds sources
  outputs: number[]; // IDs des nœuds cibles
}

export interface Graph {
  nodes: Map<number, Node>;
  edges: Array<{ from: number; to: number }>;
}

/**
 * Parse un export Drawflow JSON vers un modèle de graphe
 */
export function parseDrawflowGraph(drawflowData: any): Graph {
  const graph: Graph = {
    nodes: new Map(),
    edges: [],
  };

  // Extraire les données (module "Home" par défaut)
  const moduleData = drawflowData.drawflow?.Home?.data || {};

  // Construire les nœuds
  for (const [nodeId, nodeData] of Object.entries(moduleData)) {
    const node: Node = {
      id: parseInt(nodeId, 10),
      name: (nodeData as any).name || 'unknown',
      type: (nodeData as any).data?.type || 'default',
      data: (nodeData as any).data || {},
      inputs: [],
      outputs: [],
    };

    // Parser les outputs pour construire les edges
    const outputs = (nodeData as any).outputs || {};
    for (const [_outputKey, outputData] of Object.entries(outputs)) {
      const connections = (outputData as any).connections || [];
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
export function exportToDrawflow(graph: Graph): any {
  const data: any = {};

  for (const [nodeId, node] of graph.nodes) {
    const outputs: any = {};
    let outputIndex = 1;
    
    for (const targetId of node.outputs) {
      outputs[`output_${outputIndex}`] = {
        connections: [{ node: targetId.toString(), output: 'input_1' }],
      };
      outputIndex++;
    }

    const inputs: any = {};
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
 * Exemple d'utilisation:
 * 
 * import exampleGraph from '../exampleGraph.json';
 * const graph = parseDrawflowGraph(exampleGraph);
 * const order = topologicalSort(graph);
 * console.log('Evaluation order:', order);
 */
