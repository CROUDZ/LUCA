/**
 * ThemeContext - Provider et hooks pour le thème LUCA
 */

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

import type { ThemePreference, ThemeMode, AppTheme, ThemeContextValue } from './types';
import { getColors } from './colors';

// Clé de stockage pour AsyncStorage
const THEME_STORAGE_KEY = '@luca_theme_preference';

// Interface pour AsyncStorage (compatible avec les tests)
type AsyncStorageShape = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

/**
 * Récupère AsyncStorage de manière sûre (compatible tests)
 */
const getAsyncStorage = (): AsyncStorageShape | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-async-storage/async-storage');
    const storage = mod?.default ?? mod;
    if (storage?.getItem && storage?.setItem) return storage as AsyncStorageShape;
  } catch {
    // Storage non disponible (environnement de test)
  }
  return undefined;
};

/**
 * Récupère le mode système de manière sûre
 */
const getSystemMode = (): ThemeMode => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rn = require('react-native');
    const sc = typeof rn.useColorScheme === 'function' ? rn.useColorScheme() : undefined;
    return sc === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

/**
 * Résout le mode effectif selon la préférence et le système
 */
const resolveMode = (preference: ThemePreference, system: ThemeMode): ThemeMode => {
  if (preference === 'system') return system;
  return preference;
};

// Contexte du thème
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  /** Mode initial forcé (utile pour les tests) */
  initialMode?: ThemeMode;
}

/**
 * Provider du thème LUCA
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialMode }) => {
  const systemMode = getSystemMode();
  const [preference, setPreferenceState] = useState<ThemePreference>(
    initialMode ? initialMode : 'system'
  );

  // Charger la préférence persistée au montage
  useEffect(() => {
    if (initialMode) return; // Skip si mode forcé

    let mounted = true;
    (async () => {
      const AsyncStorage = getAsyncStorage();
      if (!AsyncStorage) return;
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!mounted) return;
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
          setPreferenceState(stored);
        }
      } catch {
        // Ignorer et garder la valeur par défaut
      }
    })();
    return () => {
      mounted = false;
    };
  }, [initialMode]);

  // Calculer le mode effectif
  const effectiveMode = resolveMode(preference, systemMode);

  // Construire le thème
  const theme = useMemo<AppTheme>(
    () => ({
      name: 'LUCA',
      mode: effectiveMode,
      colors: getColors(effectiveMode),
    }),
    [effectiveMode]
  );

  // Changer la préférence
  const setPreference = useCallback(async (p: ThemePreference) => {
    const AsyncStorage = getAsyncStorage();
    if (AsyncStorage) {
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, p);
      } catch {
        // Ignorer - mise à jour en mémoire quand même
      }
    }
    setPreferenceState(p);
  }, []);

  // Basculer entre dark et light
  const toggle = useCallback(async () => {
    const next = preference === 'dark' ? 'light' : 'dark';
    await setPreference(next);
  }, [preference, setPreference]);

  // Valeur du contexte
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      preference,
      setPreference,
      toggle,
      isDark: effectiveMode === 'dark',
    }),
    [theme, preference, setPreference, toggle, effectiveMode]
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
};

/**
 * Hook pour accéder au thème complet
 * @throws Error si utilisé hors du ThemeProvider
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

/**
 * Hook raccourci pour savoir si le mode sombre est actif
 */
export const useIsDark = (): boolean => {
  const { isDark } = useTheme();
  return isDark;
};

/**
 * Hook raccourci pour accéder aux couleurs uniquement
 */
export const useColors = () => {
  const { theme } = useTheme();
  return theme.colors;
};

// Alias pour rétrocompatibilité
export const AppThemeProvider = ThemeProvider;
export const useAppTheme = useTheme;
