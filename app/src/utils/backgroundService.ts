import { NativeModules, Platform } from 'react-native';
import { logger } from './logger';

const nativeService = (NativeModules as any)?.BackgroundService;

class BackgroundServiceManager {
  private started = false;

  start(): void {
    if (Platform.OS !== 'android') return;
    if (!nativeService?.start) {
      logger.warn('[BackgroundService] Native module not available');
      return;
    }
    try {
      nativeService.start();
      this.started = true;
      logger.info('[BackgroundService] Foreground service started');
    } catch (error) {
      logger.warn('[BackgroundService] Failed to start service', error);
    }
  }

  stop(): void {
    if (Platform.OS !== 'android') return;
    if (!nativeService?.stop) return;
    try {
      nativeService.stop();
      this.started = false;
      logger.info('[BackgroundService] Service stopped');
    } catch (error) {
      logger.warn('[BackgroundService] Failed to stop service', error);
    }
  }

  isRunning(): boolean {
    return this.started;
  }
}

export const backgroundService = new BackgroundServiceManager();
