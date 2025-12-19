import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { basePalette } from './global';
import { hexToRgba, mixColors } from './colorUtils';

export type ThemePreference = 'system' | 'dark' | 'light';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  primary: string;
  primarySoft: string;
  primaryMuted: string;
  primaryContrast: string;
  secondary: string;
  secondarySoft: string;
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;
  overlay: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  shadow: string;
  focus: string;
  chip: string;
  chipDisabled: string;
  inputBackground: string;
}

export interface AppTheme {
  name: 'LUCA';
  mode: ThemeMode;
  colors: ThemeColors;
}

interface ThemeContextValue {
  theme: AppTheme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => Promise<void>;
  toggle: () => Promise<void>;
}

const buildDarkColors = (): ThemeColors => {
  const shared = {
    primary: basePalette.primary,
    primarySoft: basePalette.primarySoft,
    primaryMuted: basePalette.primaryMuted,
    primaryContrast: basePalette.primaryContrast,
    secondary: basePalette.secondary,
    secondarySoft: basePalette.secondarySoft,
    success: basePalette.success,
    warning: basePalette.warning,
    error: basePalette.error,
    info: basePalette.info,
  };

  return {
    ...shared,
    background: basePalette.backgroundDark,
    backgroundSecondary: basePalette.backgroundMuted,
    surface: basePalette.surfaceDark,
    surfaceElevated: basePalette.surfaceSemiDark,
    overlay: hexToRgba('#000000', 0.5),
    text: basePalette.textOnDark,
    textSecondary: basePalette.textSecondaryOnDark,
    textMuted: hexToRgba(basePalette.textSecondaryOnDark, 0.65),
    border: basePalette.borderDark,
    borderStrong: mixColors(basePalette.borderDark, basePalette.primary, 0.4),
    shadow: basePalette.shadowDark,
    focus: hexToRgba(basePalette.secondary, 0.35),
    chip: hexToRgba(basePalette.primarySoft, 0.18),
    chipDisabled: hexToRgba(basePalette.textSecondaryOnDark, 0.25),
    inputBackground: basePalette.surfaceDark,
  };
};

const buildLightColors = (): ThemeColors => {
  const shared = {
    primary: basePalette.primary,
    primarySoft: basePalette.primarySoft,
    primaryMuted: basePalette.primaryMuted,
    primaryContrast: basePalette.primaryContrast,
    secondary: basePalette.secondary,
    secondarySoft: basePalette.secondarySoft,
    success: basePalette.success,
    warning: basePalette.warning,
    error: basePalette.error,
    info: basePalette.info,
  };

  return {
    ...shared,
    background: basePalette.backgroundLight,
    backgroundSecondary: basePalette.backgroundSoft,
    surface: basePalette.surfaceLight,
    surfaceElevated: basePalette.surfaceMutedLight,
    overlay: hexToRgba('#000000', 0.04),
    text: basePalette.textOnLight,
    textSecondary: basePalette.textSecondaryOnLight,
    textMuted: hexToRgba(basePalette.textSecondaryOnLight, 0.65),
    border: basePalette.borderLight,
    borderStrong: mixColors(basePalette.borderLight, basePalette.primary, 0.25),
    shadow: basePalette.shadowLight,
    focus: hexToRgba(basePalette.secondary, 0.15),
    chip: hexToRgba(basePalette.primarySoft, 0.08),
    chipDisabled: hexToRgba(basePalette.textSecondaryOnLight, 0.2),
    inputBackground: basePalette.surfaceLight,
  };
};

const THEME_STORAGE_KEY = '@luca_theme_preference';

type AsyncStorageShape = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

// Grab AsyncStorage at runtime while being compatible with tests that mock or omit it
const getAsyncStorage = (): AsyncStorageShape | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-async-storage/async-storage');
    const storage = mod?.default ?? mod;
    if (storage?.getItem && storage?.setItem) return storage as AsyncStorageShape;
  } catch (e) {
    // ignore - storage unavailable in some environments (e.g., tests)
  }
  return undefined;
};

const resolveMode = (preference: ThemePreference, system: ThemeMode): ThemeMode => {
  if (preference === 'system') return system;
  return preference === 'dark' ? 'dark' : 'light';
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  // require useColorScheme at runtime so tests that mock 'react-native' can control it
  let system: ThemeMode = 'light';
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rn = require('react-native');
    const sc = typeof rn.useColorScheme === 'function' ? rn.useColorScheme() : undefined;
    system = sc === 'dark' ? 'dark' : 'light';
  } catch (e) {
    // If react-native cannot be required (tests environment), default to light
    system = 'light';
  }
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Load persisted preference once (try to require AsyncStorage at runtime so tests without it still run)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const AsyncStorage = getAsyncStorage();
      if (!AsyncStorage) return;
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!mounted) return;
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
          setPreferenceState(stored as ThemePreference);
        }
      } catch (e) {
        // ignore and keep default
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const effectiveMode = resolveMode(preference, system);

  const theme = useMemo<AppTheme>(() => {
    const colors = effectiveMode === 'dark' ? buildDarkColors() : buildLightColors();
    return { name: 'LUCA', mode: effectiveMode, colors };
  }, [effectiveMode]);

  const setPreference = async (p: ThemePreference) => {
    const AsyncStorage = getAsyncStorage();
    if (AsyncStorage) {
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, p);
      } catch (e) {
        // ignore - fallback to in-memory update below
      }
    }
    // Always update in-memory state so UI reflects the choice immediately
    setPreferenceState(p);
  };

  const toggle = async () => {
    const next = preference === 'dark' ? 'light' : 'dark';
    await setPreference(next);
  };

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, preference, setPreference, toggle } },
    children
  );
};

export const useAppTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used within AppThemeProvider');
  return context;
};

export const useIsDark = (): boolean => {
  const { theme } = useAppTheme();
  return theme.mode === 'dark';
};
