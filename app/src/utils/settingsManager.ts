import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

const SETTINGS_KEY = '@luca_app_settings';

export interface AppSettings {
  backgroundServiceEnabled: boolean;
  notificationControlsEnabled: boolean;
}

const defaultSettings: AppSettings = {
  backgroundServiceEnabled: true,
  notificationControlsEnabled: true,
};

class SettingsManager {
  private settings: AppSettings = { ...defaultSettings };
  private initialized = false;
  private listeners: Set<(settings: AppSettings) => void> = new Set();

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        this.settings = { ...defaultSettings, ...JSON.parse(stored) };
      }
      this.initialized = true;
      logger.debug('[Settings] Initialized', this.settings);
    } catch (error) {
      logger.warn('[Settings] Failed to load settings', error);
      this.settings = { ...defaultSettings };
      this.initialized = true;
    }
  }

  getSettings(): AppSettings {
    return { ...this.settings };
  }

  async updateSettings(partial: Partial<AppSettings>): Promise<void> {
    this.settings = { ...this.settings, ...partial };
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      logger.debug('[Settings] Saved', this.settings);
      this.notifyListeners();
    } catch (error) {
      logger.warn('[Settings] Failed to save settings', error);
    }
  }

  subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const snapshot = this.getSettings();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (e) {
        logger.warn('[Settings] Listener error', e);
      }
    });
  }
}

export const settingsManager = new SettingsManager();
