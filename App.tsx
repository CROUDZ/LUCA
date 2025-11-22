/**
 * Application principale - Éditeur de nœuds
 */

import React, { useEffect } from 'react';
import { nodeRegistry } from './src/engine/NodeRegistry';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import de toutes les nodes via l'index
// Cela charge automatiquement DemoNode, FlashLightConditionNode, PingNode et TriggerNode
import './src/engine/nodes';
import { startMonitoringNativeTorch, stopMonitoringNativeTorch } from './src/engine/nodes/FlashLightConditionNode';

function App() {
  // Afficher les stats des nodes au démarrage
  useEffect(() => {
    // Use the centralized logger to avoid spamming console in non-dev
    import('./src/utils/logger').then(({ logger }) => {
      logger.debug('🚀 App: Checking loaded nodes...');
      const stats = nodeRegistry.getStats();
      logger.debug(`✅ Loaded ${stats.total} nodes across ${stats.categories} categories`);
      logger.debug('📊 Nodes by category:', stats.byCategory);
      logger.debug('📝 All nodes:', nodeRegistry.getAllNodes().map((n) => n.name).join(', '));

      // Afficher les détails de chaque node
      const allNodes = nodeRegistry.getAllNodes();
      allNodes.forEach((node) => {
        logger.debug(`  - ${node.id} (${node.name}) - Category: ${node.category}`);
      });
    });
    // Start monitoring native torch state globally so that manual toggles (OS quick settings)
    // trigger auto-emission even when NodeEditorScreen is not mounted.
    startMonitoringNativeTorch();

    return () => {
      stopMonitoringNativeTorch();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
