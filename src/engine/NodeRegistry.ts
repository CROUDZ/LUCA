/**
 * NodeRegistry - Gestionnaire centralisé des types de nodes
 */

import type { NodeDefinition } from '../types/node.types';
import { nodeInstanceTracker } from './NodeInstanceTracker';
import { logger } from '../utils/logger';

class NodeRegistry {
  private nodes: Map<string, NodeDefinition> = new Map();
  private categories: Set<string> = new Set();

  /**
   * Enregistrer une node dans le registry
   */
  register(definition: NodeDefinition): void {
    if (this.nodes.has(definition.id)) {
      logger.warn(`⚠️ Node "${definition.id}" already registered, overwriting...`);
    }

    this.nodes.set(definition.id, definition);

    if (definition.category) {
      this.categories.add(definition.category);
    }

  logger.debug(`✅ Registered node: ${definition.id} (${definition.name})`);
  }

  /**
   * Obtenir une node par son ID
   */
  getNode(id: string): NodeDefinition | undefined {
    return this.nodes.get(id);
  }

  /**
   * Obtenir toutes les nodes enregistrées
   */
  getAllNodes(): NodeDefinition[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Obtenir les nodes par catégorie
   */
  getNodesByCategory(category: string): NodeDefinition[] {
    return this.getAllNodes().filter((node) => node.category === category);
  }

  /**
   * Obtenir toutes les catégories
   */
  getCategories(): string[] {
    return Array.from(this.categories).sort();
  }

  /**
   * Vérifier si une node existe
   */
  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  /**
   * Obtenir le nombre de nodes enregistrées
   */
  getCount(): number {
    return this.nodes.size;
  }

  /**
   * Réinitialiser le registry (utile pour les tests)
   */
  clear(): void {
    this.nodes.clear();
    this.categories.clear();
  }

  /**
   * Vérifier si on peut ajouter une instance d'une node
   * @param nodeTypeId - ID du type de node
   * @returns { canAdd: boolean, reason?: string, currentCount?: number, maxInstances?: number }
   */
  canAddNode(nodeTypeId: string): {
    canAdd: boolean;
    reason?: string;
    currentCount?: number;
    maxInstances?: number;
  } {
    const nodeDefinition = this.getNode(nodeTypeId);

    if (!nodeDefinition) {
      return {
        canAdd: false,
        reason: `Node type "${nodeTypeId}" not found in registry`,
      };
    }

    // Si pas de limite, on peut toujours ajouter
    if (nodeDefinition.maxInstances === undefined) {
      return { canAdd: true };
    }

    // Utiliser le tracker pour obtenir le compte actuel
    const currentCount = nodeInstanceTracker.getCount(nodeTypeId);

    logger.debug(`🔍 canAddNode check for "${nodeTypeId}":`, {
      currentCount,
      maxInstances: nodeDefinition.maxInstances,
    });

    // Vérifier si on peut en ajouter une de plus
    if (currentCount >= nodeDefinition.maxInstances) {
      return {
        canAdd: false,
        reason: `Maximum instances reached (${nodeDefinition.maxInstances})`,
        currentCount,
        maxInstances: nodeDefinition.maxInstances,
      };
    }

    return {
      canAdd: true,
      currentCount,
      maxInstances: nodeDefinition.maxInstances,
    };
  }

  /**
   * Obtenir des statistiques sur le registry
   */
  getStats() {
    const stats: Record<string, number> = {};
    for (const category of this.categories) {
      stats[category] = this.getNodesByCategory(category).length;
    }
    return {
      total: this.nodes.size,
      categories: this.categories.size,
      byCategory: stats,
    };
  }
}

// Instance singleton
export const nodeRegistry = new NodeRegistry();

/**
 * Fonction utilitaire pour enregistrer une node
 */
export function registerNode(definition: NodeDefinition): void {
  nodeRegistry.register(definition);
}

/**
 * Charger toutes les nodes
 * Cette fonction doit être appelée au démarrage de l'app
 */
export function loadAllNodes(): void {
  logger.debug('📦 Loading all nodes...');

  // Import automatique de tous les fichiers dans le dossier nodes/
  // Note: React Native nécessite des imports explicites, on ne peut pas faire de require.context
  // Donc on va importer manuellement depuis un fichier index.ts dans nodes/

  try {
    // Import du fichier index qui charge toutes les nodes
    // Le chemin doit être relatif à ce fichier
    require('./nodes/index');

    const stats = nodeRegistry.getStats();
  logger.debug(`✅ Loaded ${stats.total} nodes across ${stats.categories} categories`);
  logger.debug('📊 Nodes by category:', stats.byCategory);

    // Afficher toutes les nodes chargées
    const allNodes = nodeRegistry.getAllNodes();
  logger.debug('📝 Nodes loaded:', allNodes.map((n) => n.id).join(', '));
  } catch (error) {
  logger.error('❌ Error loading nodes:', error);
  logger.error('Error details:', error);
  }
}

export default nodeRegistry;
