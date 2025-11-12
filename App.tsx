/**
 * Application principale - Éditeur de nœuds
 */

import React, { useEffect } from 'react';
import { nodeRegistry } from './src/engine/NodeRegistry';
import AppNavigator from './src/navigation/AppNavigator';

// Import de toutes les nodes via l'index
// Cela charge automatiquement DemoNode, FlashLightNode, PingNode et TriggerNode
import './src/engine/nodes';

function App() {
  // Afficher les stats des nodes au démarrage
  useEffect(() => {
    console.log('🚀 App: Checking loaded nodes...');
    const stats = nodeRegistry.getStats();
    console.log(`✅ Loaded ${stats.total} nodes across ${stats.categories} categories`);
    console.log('📊 Nodes by category:', stats.byCategory);
    console.log(
      '📝 All nodes:',
      nodeRegistry
        .getAllNodes()
        .map((n) => n.name)
        .join(', ')
    );

    // Afficher les détails de chaque node
    const allNodes = nodeRegistry.getAllNodes();
    allNodes.forEach((node) => {
      console.log(`  - ${node.id} (${node.name}) - Category: ${node.category}`);
    });
  }, []);

  return <AppNavigator />;
}

export default App;
