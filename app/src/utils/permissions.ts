import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

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
    console.warn('[Permissions] Could not emit permission event', err);
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
      console.warn(
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
    console.warn('[Permissions] requestAndroidPermission error', err);
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
      console.log('[Permissions] PermissionsAndroid.check unavailable – assuming granted');
      return true;
    }
    const granted = await PermissionsAndroid.check(permission as any);
    return !!granted;
  } catch (err) {
    console.warn('[Permissions] checkAndroidPermission failed', err);
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
          console.warn('[Permissions] Linking.openSettings failed', e);
        }
      } catch (e) {
        console.warn('[Permissions] Could not show NEVER_ASK alert', e);
      }
    }

    return false;
  } catch (err) {
    console.warn('[Permissions] ensureCameraPermission unexpected error', err);
    return false;
  }
}

export async function hasCameraPermission(): Promise<boolean> {
  try {
    if (Platform?.OS !== 'android') return true;
    const cameraPerm = PermissionsAndroid.PERMISSIONS?.CAMERA ?? 'android.permission.CAMERA';
    return await checkAndroidPermission(cameraPerm);
  } catch (err) {
    console.warn('[Permissions] hasCameraPermission failed', err);
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
          console.warn('[Permissions] Linking.openSettings failed (vibration)', e);
        }
      } catch (e) {
        console.warn('[Permissions] Could not show NEVER_ASK alert (vibration)', e);
      }
    }

    return false;
  } catch (err) {
    console.warn('[Permissions] ensureVibrationPermission unexpected error', err);
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
    console.warn('[Permissions] hasVibrationPermission failed', err);
    return false;
  }
}

export async function ensureMicrophonePermission(): Promise<boolean> {
  try {
    if (Platform?.OS !== 'android') return true;

    const micPerm =
      (PermissionsAndroid.PERMISSIONS as Record<string, string> | undefined)?.RECORD_AUDIO ??
      'android.permission.RECORD_AUDIO';

    const alreadyGranted = await checkAndroidPermission(micPerm);
    if (alreadyGranted) return true;

    const result = await requestAndroidPermission(micPerm, {
      title: 'Permission Micro',
      message: 'LUCA a besoin du micro pour écouter le mot-clé vocal.',
    });

    if (result.granted) return true;

    if (result.neverAskAgain) {
      try {
        Alert.alert(
          'Permission micro requise',
          'Le micro est désactivé et ne sera plus demandé. Voulez-vous ouvrir les paramètres pour le réactiver ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Ouvrir', onPress: () => Linking?.openSettings?.() },
          ]
        );
        try {
          Linking?.openSettings?.();
        } catch (e) {
          console.warn('[Permissions] Linking.openSettings failed (micro)', e);
        }
      } catch (e) {
        console.warn('[Permissions] Could not show NEVER_ASK alert (micro)', e);
      }
    }

    return false;
  } catch (err) {
    console.warn('[Permissions] ensureMicrophonePermission unexpected error', err);
    return false;
  }
}

export async function hasMicrophonePermission(): Promise<boolean> {
  try {
    if (Platform?.OS !== 'android') return true;
    const micPerm =
      (PermissionsAndroid.PERMISSIONS as Record<string, string> | undefined)?.RECORD_AUDIO ??
      'android.permission.RECORD_AUDIO';
    return await checkAndroidPermission(micPerm);
  } catch (err) {
    console.warn('[Permissions] hasMicrophonePermission failed', err);
    return false;
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (Platform?.OS !== 'android') return true;

    // Android 13+ (API 33) nécessite la permission POST_NOTIFICATIONS
    if (Platform.Version < 33) return true;

    const notifPerm = 'android.permission.POST_NOTIFICATIONS';

    const alreadyGranted = await checkAndroidPermission(notifPerm);
    if (alreadyGranted) return true;

    const result = await requestAndroidPermission(notifPerm, {
      title: 'Permission Notifications',
      message: 'LUCA a besoin de la permission pour afficher des notifications.',
    });

    if (result.granted) return true;

    if (result.neverAskAgain) {
      try {
        Alert.alert(
          'Permission notifications requise',
          'Les notifications sont désactivées et ne seront plus demandées. Voulez-vous ouvrir les paramètres pour les réactiver ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Ouvrir', onPress: () => Linking?.openSettings?.() },
          ]
        );
      } catch (e) {
        console.warn('[Permissions] Could not show NEVER_ASK alert (notifications)', e);
      }
    }

    return false;
  } catch (err) {
    console.warn('[Permissions] ensureNotificationPermission unexpected error', err);
    return false;
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  try {
    if (Platform?.OS !== 'android') return true;
    if (Platform.Version < 33) return true;
    const notifPerm = 'android.permission.POST_NOTIFICATIONS';
    return await checkAndroidPermission(notifPerm);
  } catch (err) {
    console.warn('[Permissions] hasNotificationPermission failed', err);
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
  ensureMicrophonePermission,
  hasMicrophonePermission,
  ensureNotificationPermission,
  hasNotificationPermission,
};
