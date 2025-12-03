/**
 * Application principale - Éditeur de nœuds visuels LUCA
 */

import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppThemeProvider } from './src/styles/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { nodeRegistry } from './src/engine/NodeRegistry';
import { logger } from './src/utils/logger';
import {
  startMonitoringNativeTorch,
  stopMonitoringNativeTorch,
} from './src/engine/nodes/FlashLightConditionNode';

// Chargement de toutes les nodes
import './src/engine/nodes';

function App() {
  useEffect(() => {
    // Log des nodes chargées au démarrage
    const stats = nodeRegistry.getStats();
    logger.debug(`🚀 App: ${stats.total} nodes loaded across ${stats.categories} categories`);
    
    // Démarrer le monitoring de la torche (pour détecter les changements via l'OS)
    startMonitoringNativeTorch();

    return () => {
      stopMonitoringNativeTorch();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AppNavigator />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
