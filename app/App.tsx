/**
 * Application principale - Éditeur de nœuds visuels LUCA
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppThemeProvider } from './src/styles/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { nodeRegistry } from './src/engine/NodeRegistry';
import { logger } from './src/utils/logger';
import { modStorage } from './src/utils/modStorage';
import { backgroundService } from './src/utils/backgroundService';
import {
  startMonitoringNativeTorch,
  stopMonitoringNativeTorch,
} from './src/engine/nodes/FlashLightConditionNode';

// Chargement de toutes les nodes
import './src/engine/nodes';
import SplashScreen from './src/components/SplashScreen';

function App() {
  useEffect(() => {
    // Initialiser le stockage des mods et charger les mods installés
    const initMods = async () => {
      await modStorage.initialize();
      const installedCount = modStorage.getInstalledCount();
      logger.debug(`📦 App: ${installedCount} mods loaded`);
    };
    let cancelled = false;
    initMods()
      .catch((err) => logger.error('Failed to init mods:', err))
      .finally(() => {
        const MIN_SPLASH = 800;
        setTimeout(() => {
          if (!cancelled) setIsAppReady(true);
        }, MIN_SPLASH);
      });

    // Log des nodes chargées au démarrage
    const stats = nodeRegistry.getStats();
    logger.debug(`🚀 App: ${stats.total} nodes loaded across ${stats.categories} categories`);

    // Assurer l'exécution continue en arrière-plan
    try {
      backgroundService.start();
    } catch (err) {
      logger.error('Failed to start background service:', err);
    }
    
    // Démarrer le monitoring de la torche (pour détecter les changements via l'OS)
    startMonitoringNativeTorch();

    return () => {
      cancelled = true;
      backgroundService.stop();
      stopMonitoringNativeTorch();
    };
  }, []);

  // Splash: masquer le navigator jusqu'à ce que l'app soit prête
  const [isAppReady, setIsAppReady] = useState(false);

  // Note: splash readiness is handled in the init effect above

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        {!isAppReady ? (
          <SplashScreen onFinish={() => setIsAppReady(true)} />
        ) : (
          <AppNavigator />
        )}
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
