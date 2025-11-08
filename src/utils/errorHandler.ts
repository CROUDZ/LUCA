/**
 * Utilitaires de gestion d'erreurs centralisés
 */

import { Alert } from 'react-native';
import type { AppError, ErrorCode } from '../types';
import { ERROR_MESSAGES } from '../config/constants';

/**
 * Créer une erreur applicative typée
 */
export function createAppError(code: ErrorCode, message?: string, details?: any): AppError {
  return {
    code,
    message: message || ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR,
    details,
    timestamp: Date.now(),
  };
}

/**
 * Logger une erreur dans la console avec formatage
 */
export function logError(error: AppError | Error, context?: string): void {
  const prefix = context ? `[${context}]` : '';

  if ('code' in error) {
    console.error(`❌ ${prefix} AppError [${error.code}]:`, error.message, error.details || '');
  } else {
    console.error(`❌ ${prefix} Error:`, error.message, error.stack || '');
  }
}

/**
 * Afficher une erreur à l'utilisateur via Alert
 */
export function showErrorAlert(error: AppError | Error, title: string = 'Error'): void {
  const message = 'code' in error ? error.message : error.message;
  Alert.alert(title, message);
}

/**
 * Gérer une erreur de manière complète (log + alert optionnel)
 */
export function handleError(
  error: AppError | Error,
  context?: string,
  showAlert: boolean = true
): void {
  logError(error, context);

  if (showAlert) {
    showErrorAlert(error);
  }
}

/**
 * Wrapper pour les opérations async avec gestion d'erreur
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorCode: ErrorCode,
  context?: string,
  showAlert: boolean = true
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const appError = createAppError(
      errorCode,
      error instanceof Error ? error.message : String(error),
      error
    );
    handleError(appError, context, showAlert);
    return null;
  }
}

/**
 * Wrapper pour les opérations synchrones avec gestion d'erreur
 */
export function withErrorHandlingSync<T>(
  operation: () => T,
  errorCode: ErrorCode,
  context?: string,
  showAlert: boolean = true
): T | null {
  try {
    return operation();
  } catch (error) {
    const appError = createAppError(
      errorCode,
      error instanceof Error ? error.message : String(error),
      error
    );
    handleError(appError, context, showAlert);
    return null;
  }
}

/**
 * Utilitaire pour confirmer une action destructive
 */
export function confirmDestructiveAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText: string = 'Confirm',
  cancelText: string = 'Cancel'
): void {
  Alert.alert(title, message, [
    {
      text: cancelText,
      style: 'cancel',
    },
    {
      text: confirmText,
      style: 'destructive',
      onPress: onConfirm,
    },
  ]);
}
