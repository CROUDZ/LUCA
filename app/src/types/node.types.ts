/**
 * Types pour le système de nodes modulaire
 */

// ============================================================================
// Types pour les inputs/outputs des nodes
// ============================================================================

export type NodeDataType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';

export interface NodePortDefinition {
  name: string;
  type: NodeDataType;
  label?: string;
  description?: string;
  required?: boolean;
  defaultValue?: any;
}

// ============================================================================
// Configuration et définition d'une node
// ============================================================================

export interface NodeConfig {
  // Données d'entrée de la node
  inputs: Record<string, any>;
  // Données internes de la node (configuration)
  settings?: Record<string, any>;
}

export interface NodeExecutionContext {
  // ID de la node en cours d'exécution
  nodeId: number;
  // Données d'entrée résolues
  inputs: Record<string, any>;
  // Nombre d'entrées configurées sur le noeud (présence de connexions)
  inputsCount?: number;
  // Settings de la node
  settings: Record<string, any>;
  // Fonction pour logger
  log?: (message: string) => void;
}

export interface NodeExecutionResult {
  // Données de sortie
  outputs: Record<string, any>;
  // Succès ou erreur
  success: boolean;
  // Message d'erreur éventuel
  error?: string;
}

// ============================================================================
// Template de node
// ============================================================================

export interface NodeDefinition {
  // Identification
  id: string;
  name: string;
  description: string;
  category: string;

  // Apparence
  icon: string;
  iconFamily: 'material' | 'fontawesome';
  color?: string;

  // Limites et contraintes
  maxInstances?: number; // Nombre maximum d'instances de CE TYPE de node dans le graphe (undefined = illimité)

  // Ports
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];

  // Configuration par défaut
  defaultSettings?: Record<string, any>;

  // Fonction d'exécution
  execute: (context: NodeExecutionContext) => Promise<NodeExecutionResult> | NodeExecutionResult;

  // Fonction de validation (optionnelle)
  validate?: (context: NodeExecutionContext) => boolean | string;

  // Fonction pour générer le HTML (optionnelle)
  // Le second paramètre contient les métadonnées du node (category, name, etc.)
  generateHTML?: (settings: Record<string, any>, nodeMeta?: NodeMeta) => string;
}

// Métadonnées passées à generateHTML pour permettre l'accès aux propriétés du node
export interface NodeMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  iconFamily: 'material' | 'fontawesome';
  color?: string;
}

// ============================================================================
// Registry
// ============================================================================

export interface NodeRegistryEntry {
  definition: NodeDefinition;
  registeredAt: number;
}
