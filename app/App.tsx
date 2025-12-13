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
    initMods()
      .catch((err) => logger.error('Failed to init mods:', err));

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
      backgroundService.stop();
      stopMonitoringNativeTorch();
    };
  }, []);

  // Splash: masquer le navigator jusqu'à ce que l'app soit prête
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    // On considère l'app prête après quelques initialisations
    let cancelled = false;
    (async () => {
      try {
        // Attendre modStorage au cas où il n'a pas terminé
        await modStorage.initialize();
      } catch (err) {
        logger.error('Error during app init:', err);
      }

      // minimum wait to ensure splash is visible briefly
      const MIN_SPLASH = 800;
      setTimeout(() => {
        if (!cancelled) setIsAppReady(true);
      }, MIN_SPLASH);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
