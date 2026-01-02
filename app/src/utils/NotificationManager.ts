/**
 * NotificationManager - Gestionnaire de notifications Android
 *
 * Gère les vraies notifications Android système
 * Supporte les notifications toast et les notifications standard
 */

import { Alert, Platform, ToastAndroid, NativeModules } from 'react-native';
import { ensureNotificationPermission } from './permissions';

const { NotificationModule } = NativeModules;

export type NotificationType = 'standard' | 'toast';

interface NotificationOptions {
  title?: string;
  message: string;
  duration?: number; // pour toast (courte par défaut)
}

class NotificationManager {
  private static instance: NotificationManager;

  private constructor() {}

  /**
   * Obtient l'instance singleton du gestionnaire
   */
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Affiche une notification standard (vraie notification Android)
   */
  async showStandard(title: string, message: string): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        // Fallback pour iOS
        Alert.alert(title, message);
        return true;
      }

      // Demander la permission si nécessaire
      const hasPermission = await ensureNotificationPermission();
      if (!hasPermission) {
        console.warn('[NotificationManager] Permission de notification refusée');
        // Fallback sur toast si pas de permission
        this.showToast(message);
        return false;
      }

      // Vérifier si le module natif est disponible
      if (!NotificationModule || typeof NotificationModule.showNotification !== 'function') {
        console.warn('[NotificationManager] Module natif non disponible, utilisation du toast');
        this.showToast(message);
        return false;
      }

      // Afficher la vraie notification Android
      await NotificationModule.showNotification(title, message);
      return true;
    } catch (error) {
      console.error('[NotificationManager] Erreur showStandard:', error);
      // Fallback sur toast en cas d'erreur
      this.showToast(message);
      return false;
    }
  }

  /**
   * Affiche une notification Toast (notification courte en bas de l'écran)
   */
  showToast(message: string, duration: 'short' | 'long' = 'short'): void {
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        message,
        duration === 'short' ? ToastAndroid.SHORT : ToastAndroid.LONG
      );
    } else {
      // Fallback pour iOS
      Alert.alert('Notification', message);
    }
  }

  /**
   * Affiche une notification selon le type spécifié
   */
  async show(type: NotificationType, options: NotificationOptions): Promise<void> {
    const title = options.title || 'Notification';
    const message = options.message;

    switch (type) {
      case 'standard':
        await this.showStandard(title, message);
        break;

      case 'toast':
        this.showToast(message, (options.duration && options.duration > 3000) ? 'long' : 'short');
        break;

      default:
        console.warn(`[NotificationManager] Type de notification inconnu: ${type}`);
        this.showToast(message);
    }
  }

  /**
   * Affiche une notification de succès
   */
  async showSuccess(message: string, title: string = 'Succès'): Promise<void> {
    await this.show('standard', { title, message });
  }

  /**
   * Affiche une notification d'erreur
   */
  async showError(message: string, title: string = 'Erreur'): Promise<void> {
    await this.show('standard', { title, message });
  }

  /**
   * Affiche une notification d'information
   */
  showInfo(message: string, title: string = 'Information'): void {
    this.show('toast', { message });
  }

  /**
   * Vérifie si les notifications sont activées
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') return true;
      if (!NotificationModule || typeof NotificationModule.areNotificationsEnabled !== 'function') {
        return false;
      }
      return await NotificationModule.areNotificationsEnabled();
    } catch (error) {
      console.warn('[NotificationManager] Erreur areNotificationsEnabled:', error);
      return false;
    }
  }
}

export default NotificationManager.getInstance();
