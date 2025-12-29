import { NativeModules, Platform, DeviceEventEmitter } from 'react-native';
const nativeService = (NativeModules as any)?.BackgroundService;

export type TriggerStateListener = (isRunning: boolean) => void;

class BackgroundServiceManager {
  private started = false;
  private notificationControlsEnabled = true;
  private triggerRunning = false;
  private triggerListeners: Set<TriggerStateListener> = new Set();
  private eventSubscription: any = null;

  start(): void {
    if (Platform.OS !== 'android') return;
    if (!nativeService?.start) {
      console.warn('[BackgroundService] Native module not available');
      return;
    }
    try {
      nativeService.start(this.notificationControlsEnabled);
      this.started = true;
      this.setupEventListener();
      console.log('[BackgroundService] Foreground service started');
    } catch (error) {
      console.warn('[BackgroundService] Failed to start service', error);
    }
  }

  stop(): void {
    if (Platform.OS !== 'android') return;
    if (!nativeService?.stop) return;
    try {
      this.removeEventListener();
      nativeService.stop();
      this.started = false;
      console.log('[BackgroundService] Service stopped');
    } catch (error) {
      console.warn('[BackgroundService] Failed to stop service', error);
    }
  }

  isRunning(): boolean {
    return this.started;
  }

  updateNotificationControls(enabled: boolean): void {
    this.notificationControlsEnabled = enabled;
    if (Platform.OS !== 'android') return;
    if (!nativeService?.updateNotificationControls) return;
    try {
      nativeService.updateNotificationControls(enabled);
      console.log(`[BackgroundService] Notification controls ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.warn('[BackgroundService] Failed to update notification controls', error);
    }
  }

  updateTriggerState(isRunning: boolean): void {
    this.triggerRunning = isRunning;
    if (Platform.OS !== 'android') return;
    if (!nativeService?.updateTriggerState) return;
    try {
      nativeService.updateTriggerState(isRunning);
    } catch (error) {
      console.warn('[BackgroundService] Failed to update trigger state', error);
    }
  }

  isTriggerRunning(): boolean {
    return this.triggerRunning;
  }

  onTriggerToggle(listener: TriggerStateListener): () => void {
    this.triggerListeners.add(listener);
    return () => {
      this.triggerListeners.delete(listener);
    };
  }

  private setupEventListener(): void {
    if (this.eventSubscription) return;
    try {
      this.eventSubscription = DeviceEventEmitter.addListener(
        'luca.trigger.toggle',
        (event: { action: 'play' | 'stop' }) => {
          const newState = event.action === 'play';
          this.triggerRunning = newState;
          this.triggerListeners.forEach((listener) => {
            try {
              listener(newState);
            } catch (e) {
              console.warn('[BackgroundService] Trigger listener error', e);
            }
          });
        }
      );
    } catch (error) {
      console.warn('[BackgroundService] Failed to setup event listener', error);
    }
  }

  private removeEventListener(): void {
    if (this.eventSubscription) {
      try {
        this.eventSubscription.remove();
      } catch (e) {
        // Ignore
      }
      this.eventSubscription = null;
    }
  }
}

export const backgroundService = new BackgroundServiceManager();
