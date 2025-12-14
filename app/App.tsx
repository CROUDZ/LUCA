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
import { SHOW_SPLASH_DEV } from './src/config/splashDev';

function App() {
  const [isAppReady, setIsAppReady] = useState(SHOW_SPLASH_DEV ? true : false);
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  useEffect(() => {
    // Initialiser le stockage des mods et charger les mods installés
    const initMods = async () => {
      await modStorage.initialize();
      const installedCount = modStorage.getInstalledCount();
      logger.debug(`📦 App: ${installedCount} mods loaded`);
    };

    initMods()
      .catch((err) => logger.error('Failed to init mods:', err))
      .finally(() => {
        // L'app est prête, mais on attend que le splash soit fini
        setIsAppReady(true);
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
      backgroundService.stop();
      stopMonitoringNativeTorch();
    };
  }, []);

  // En mode dev splash, on affiche le SplashScreen seul pour itération rapide.
  if (SHOW_SPLASH_DEV && !isSplashFinished) {
    return (
      <SafeAreaProvider>
        <AppThemeProvider>
          <SplashScreen onFinish={() => setIsSplashFinished(true)} />
        </AppThemeProvider>
      </SafeAreaProvider>
    );
  }

  // On affiche l'app seulement quand TOUT est prêt : app + splash terminé
  const showApp = isAppReady && isSplashFinished;

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        {!showApp && <SplashScreen onFinish={() => setIsSplashFinished(true)} />}
        {showApp && <AppNavigator />}
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
