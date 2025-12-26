/**
 * Application principale - Éditeur de nœuds visuels LUCA
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { logger } from './src/utils/logger';
import { modStorage } from './src/utils/modStorage';
import { backgroundService } from './src/utils/backgroundService';
import {
  startMonitoringNativeTorch,
  stopMonitoringNativeTorch,
} from './src/engine/nodes/FlashLightConditionNode';
import ColorScreenOverlay from './src/components/ColorScreenOverlay';
import './src/engine/nodes';
import SplashScreen from './src/components/SplashScreen';

function App() {
  const [isReady, setIsReady] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        await modStorage.initialize();
        backgroundService.start();
        startMonitoringNativeTorch();
      } catch (err) {
        logger.error('Init failed:', err);
      }
    };

    init();

    return () => {
      backgroundService.stop();
      stopMonitoringNativeTorch();
    };
  }, []);

  const handleSplashFinish = useCallback(() => setIsReady(true), []);

  if (!isReady) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <SplashScreen onFinish={handleSplashFinish} />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
        <ColorScreenOverlay />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
