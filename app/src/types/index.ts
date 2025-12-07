/**
 * Types centralisés pour l'application LUCA
 */

// Export des types de nodes
export * from './node.types';

// ============================================================================
// Types de messages WebView
// ============================================================================

export type WebViewMessageType =
  | 'READY'
  | 'EXPORT'
  | 'IMPORTED'
  | 'REQUEST_IMPORT'
  | 'LOAD_GRAPH'
  | 'ADD_NODE'
  | 'CLEAR'
  | 'REQUEST_EXPORT'
  | 'NODE_ADDED'
  | 'NODE_REMOVED'
  | 'NODES_LIST'
  | 'NODE_SETTING_CHANGED';

export interface WebViewMessage<T = any> {
  type: WebViewMessageType;
  payload: T;
}

export interface ReadyPayload {
  timestamp: number;
}

export interface AddNodePayload {
  nodeType: string;
  x?: number;
  y?: number;
  data?: Record<string, any>;
}

// ============================================================================
// Types de graphe Drawflow
// ============================================================================

export interface DrawflowConnection {
  node: string;
  input?: string;
  output?: string;
}

export interface DrawflowIO {
  connections: DrawflowConnection[];
}

export interface DrawflowNodeData {
  id: number;
  name: string;
  data: Record<string, any>;
  class: string;
  html: string;
  typenode: boolean;
  inputs: Record<string, DrawflowIO>;
  outputs: Record<string, DrawflowIO>;
  pos_x: number;
  pos_y: number;
}

export interface DrawflowModule {
  data: Record<string, DrawflowNodeData>;
}

export interface DrawflowExport {
  drawflow: {
    Home: DrawflowModule;
  };
}

// ============================================================================
// Types de nœuds
// ============================================================================

export type NodeIconFamily = 'material' | 'fontawesome';

export interface NodeType {
  id: string;
  name: string;
  icon: string;
  iconFamily: NodeIconFamily;
  description: string;
  category?: string;
}

// ============================================================================
// Types de sauvegarde
// ============================================================================

export interface SavedGraph {
  id: string;
  name: string;
  data: DrawflowExport;
  timestamp: number;
  description?: string;
  tags?: string[];
}

export interface Save {
  id: string;
  name: string;
  data: DrawflowExport;
  timestamp: number;
}

export interface SaveMetadata {
  version: string;
  appVersion: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Types de l'engine
// ============================================================================

export interface GraphNode {
  id: number;
  name: string;
  type: string;
  data: Record<string, any>;
  inputs: number[];
  outputs: number[];
}

export interface GraphEdge {
  from: number;
  to: number;
  fromOutput?: string;
  toInput?: string;
}

export interface Graph {
  nodes: Map<number, GraphNode>;
  edges: GraphEdge[];
}

export interface EvaluationContext {
  values: Map<number, any>;
  errors: Map<number, Error>;
}

export interface EvaluationResult {
  success: boolean;
  values: Map<number, any>;
  errors: Map<number, Error>;
  executionOrder: number[];
}

// ============================================================================
// Types d'erreur
// ============================================================================

export enum ErrorCode {
  WEBVIEW_NOT_READY = 'WEBVIEW_NOT_READY',
  PARSE_ERROR = 'PARSE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  GRAPH_CYCLE = 'GRAPH_CYCLE',
  INVALID_NODE = 'INVALID_NODE',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp: number;
}

// ============================================================================
// Types de configuration
// ============================================================================

export interface AppConfig {
  storage: {
    key: string;
    autoSaveInterval: number;
  };
  webview: {
    htmlUri: string;
    messageTimeout: number;
  };
  zoom: {
    min: number;
    max: number;
    step: number;
    default: number;
  };
  nodes: {
    defaultPosition: {
      x: number;
      y: number;
    };
    randomOffsetRange: number;
  };
}
