/**
 * NodeInstanceTracker - Suit le nombre d'instances de chaque type de node
 * Solution simple et synchrone pour les limites maxInstances
 */

class NodeInstanceTracker {
  private instances: Map<string, number> = new Map();

  /**
   * Ajouter une instance d'un type de node
   */
  addInstance(nodeType: string): void {
    const current = this.instances.get(nodeType) || 0;
    this.instances.set(nodeType, current + 1);
    console.log(`📊 NodeInstanceTracker: ${nodeType} count: ${current + 1}`);
  }

  /**
   * Retirer une instance d'un type de node
   */
  removeInstance(nodeType: string): void {
    const current = this.instances.get(nodeType) || 0;
    if (current > 0) {
      this.instances.set(nodeType, current - 1);
      console.log(`📊 NodeInstanceTracker: ${nodeType} count: ${current - 1}`);
    }
  }

  /**
   * Obtenir le nombre d'instances d'un type
   */
  getCount(nodeType: string): number {
    return this.instances.get(nodeType) || 0;
  }

  /**
   * Réinitialiser un type ou tout
   */
  reset(nodeType?: string): void {
    if (nodeType) {
      this.instances.set(nodeType, 0);
      console.log(`🔄 NodeInstanceTracker: Reset ${nodeType}`);
    } else {
      this.instances.clear();
      console.log('🔄 NodeInstanceTracker: Reset all');
    }
  }

  /**
   * Obtenir tous les compteurs
   */
  getAll(): Record<string, number> {
    const result: Record<string, number> = {};
    this.instances.forEach((count, type) => {
      result[type] = count;
    });
    return result;
  }

  /**
   * Reconstruire le tracker à partir d'un graphe exporté
   */
  rebuildFromGraph(graphData: any): void {
    this.reset();
    
    if (!graphData?.drawflow?.Home?.data) {
      console.log('🔄 NodeInstanceTracker: No graph data to rebuild from');
      return;
    }

    const nodes = graphData.drawflow.Home.data;
    const typeCounts: Record<string, number> = {};

    // Compter chaque type de nœud
    Object.values(nodes).forEach((node: any) => {
      const nodeType = node?.data?.type;
      if (nodeType) {
        typeCounts[nodeType] = (typeCounts[nodeType] || 0) + 1;
      }
    });

    // Mettre à jour le tracker
    Object.entries(typeCounts).forEach(([nodeType, count]) => {
      this.instances.set(nodeType, count);
      console.log(`🔄 NodeInstanceTracker: Rebuilt ${nodeType} count: ${count}`);
    });

    console.log('✅ NodeInstanceTracker: Rebuild complete', this.getAll());
  }
}

// Instance singleton
export const nodeInstanceTracker = new NodeInstanceTracker();
