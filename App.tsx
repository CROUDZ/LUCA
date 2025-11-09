/**
 * Application principale - Éditeur de nœuds
 */

import React, { useEffect } from 'react';
import NodeEditorScreen from './src/screens/NodeEditorScreen';
import { nodeRegistry } from './src/engine/NodeRegistry';

// Import de la node de démonstration complète
import './src/engine/nodes/DemoNode';

function App() {
  // Afficher les stats des nodes au démarrage
  useEffect(() => {
    console.log('🚀 App: Checking loaded nodes...');
    const stats = nodeRegistry.getStats();
    console.log(`✅ Loaded ${stats.total} nodes across ${stats.categories} categories`);
    console.log('📊 Nodes by category:', stats.byCategory);
    console.log('📝 All nodes:', nodeRegistry.getAllNodes().map(n => n.name).join(', '));
  }, []);

  return <NodeEditorScreen />;
}

export default App;
