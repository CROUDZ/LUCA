import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { logger } from './logger';
import { getSignalSystem } from '../engine/SignalSystem';

export interface PermissionResult {
  granted: boolean;
  status?: string;
  neverAskAgain?: boolean;
}

async function emitPermissionEvent(eventName: string, payload: Record<string, any> = {}) {
  try {
    const ss = getSignalSystem();
    if (ss) ss.emitEvent(eventName, { ...payload, timestamp: Date.now() });
  } catch (err) {
    logger.warn('[Permissions] Could not emit permission event', err);
  }
}

/**
 * Generic Android permission requester with safe fallbacks.
 * Returns a structured PermissionResult and emits events on changes.
 */
export async function requestAndroidPermission(
  permission: string,
  rationale?: { title?: string; message?: string }
): Promise<PermissionResult> {
  try {
    if (!PermissionsAndroid || typeof PermissionsAndroid.request !== 'function') {
      logger.warn(
        '[Permissions] PermissionsAndroid API missing – assuming granted in this environment'
      );
      await emitPermissionEvent('permission.granted', { permission, platform: Platform?.OS });
      return { granted: true, status: 'granted' };
    }

    const rationalePayload = (rationale ?? {
      title: 'Permission requise',
      message: "Cette application a besoin d'une permission pour fonctionner correctement.",
      buttonPositive: 'OK',
      buttonNegative: 'Refuser',
      buttonNeutral: 'Plus tard',
    }) as any;

    const result = await PermissionsAndroid.request(permission as any, rationalePayload);

    const grantedValue = PermissionsAndroid.RESULTS?.GRANTED ?? 'granted';
    const neverAsk = PermissionsAndroid.RESULTS?.NEVER_ASK_AGAIN ?? 'never_ask_again';

    if (result === grantedValue) {
      await emitPermissionEvent('permission.granted', { permission });
      return { granted: true, status: 'granted' };
    }

    if (result === neverAsk) {
      await emitPermissionEvent('permission.never_ask_again', { permission });
      return { granted: false, status: 'never_ask_again', neverAskAgain: true };
    }

    await emitPermissionEvent('permission.denied', { permission });
    return { granted: false, status: 'denied' };
  } catch (err) {
    logger.warn('[Permissions] requestAndroidPermission error', err);
    await emitPermissionEvent('permission.error', {
      permission,
      error: err instanceof Error ? err.message : String(err),
    });
    return { granted: false, status: 'error' };
  }
}

export async function checkAndroidPermission(permission: string): Promise<boolean> {
  try {
    if (!PermissionsAndroid || typeof PermissionsAndroid.check !== 'function') {
      logger.debug('[Permissions] PermissionsAndroid.check unavailable – assuming granted');
      return true;
    }
    const granted = await PermissionsAndroid.check(permission as any);
    return !!granted;
  } catch (err) {
    logger.warn('[Permissions] checkAndroidPermission failed', err);
    return false;
  }
}

/**
 * High-level helpers for camera permission used by flashlight nodes.
 */
export async function ensureCameraPermission(): Promise<boolean> {
  try {
    const isAndroid = Platform?.OS === 'android';
    if (!isAndroid) return true;

    const cameraPerm = PermissionsAndroid.PERMISSIONS?.CAMERA ?? 'android.permission.CAMERA';
    const result = await requestAndroidPermission(cameraPerm, {
      title: 'Permission Caméra',
      message: "LUCA a besoin d'accès à la caméra pour contrôler la lampe torche.",
    });

    if (result.granted) return true;

    if (result.neverAskAgain) {
      // Offer to open settings, but do not throw
      try {
        Alert.alert(
          'Permission requise',
          "La permission Caméra a été désactivée et ne sera plus demandée. Ouvrir les paramètres pour l'activer ?",
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Ouvrir', onPress: () => Linking?.openSettings?.() },
          ]
        );
        try {
          Linking?.openSettings?.();
        } catch (e) {
          logger.warn('[Permissions] Linking.openSettings failed', e);
        }
      } catch (e) {
        logger.warn('[Permissions] Could not show NEVER_ASK alert', e);
      }
    }

    return false;
  } catch (err) {
    logger.warn('[Permissions] ensureCameraPermission unexpected error', err);
    return false;
  }
}

export async function hasCameraPermission(): Promise<boolean> {
  try {
    if (Platform?.OS !== 'android') return true;
    const cameraPerm = PermissionsAndroid.PERMISSIONS?.CAMERA ?? 'android.permission.CAMERA';
    return await checkAndroidPermission(cameraPerm);
  } catch (err) {
    logger.warn('[Permissions] hasCameraPermission failed', err);
    return false;
  }
}

export async function ensureVibrationPermission(): Promise<boolean> {
  try {
    if (Platform?.OS !== 'android') return true;

    const vibrationPerm =
      (PermissionsAndroid.PERMISSIONS as Record<string, string> | undefined)?.VIBRATE ??
      'android.permission.VIBRATE';
    const alreadyGranted = await checkAndroidPermission(vibrationPerm);
    if (alreadyGranted) return true;

    const result = await requestAndroidPermission(vibrationPerm, {
      title: 'Permission Vibration',
      message: 'LUCA utilise la vibration du téléphone pour fournir des retours haptiques.',
    });

    if (result.granted) return true;

    if (result.neverAskAgain) {
      try {
        Alert.alert(
          'Permission requise',
          'La permission Vibration est désactivée et ne sera plus demandée. Voulez-vous ouvrir les paramètres pour la réactiver ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Ouvrir', onPress: () => Linking?.openSettings?.() },
          ]
        );
        try {
          Linking?.openSettings?.();
        } catch (e) {
          logger.warn('[Permissions] Linking.openSettings failed (vibration)', e);
        }
      } catch (e) {
        logger.warn('[Permissions] Could not show NEVER_ASK alert (vibration)', e);
      }
    }

    return false;
  } catch (err) {
    logger.warn('[Permissions] ensureVibrationPermission unexpected error', err);
    return false;
  }
}

export async function hasVibrationPermission(): Promise<boolean> {
  try {
    if (Platform?.OS !== 'android') return true;
    const vibrationPerm =
      (PermissionsAndroid.PERMISSIONS as Record<string, string> | undefined)?.VIBRATE ??
      'android.permission.VIBRATE';
    return await checkAndroidPermission(vibrationPerm);
  } catch (err) {
    logger.warn('[Permissions] hasVibrationPermission failed', err);
    return false;
  }
}

export default {
  requestAndroidPermission,
  checkAndroidPermission,
  ensureCameraPermission,
  hasCameraPermission,
  ensureVibrationPermission,
  hasVibrationPermission,
};
