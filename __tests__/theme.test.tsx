import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, waitFor } from '@testing-library/react-native';
import React, { useEffect } from 'react';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __store: store,
    getItem: jest.fn(async (k: string) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: jest.fn(async (k: string) => {
      delete store[k];
    }),
    clear: jest.fn(async () => {
      for (const key of Object.keys(store)) delete store[key];
    }),
  };
});

describe('AppThemeProvider', () => {
  beforeEach(() => {
    const store = (AsyncStorage as any).__store as Record<string, string>;
    for (const key of Object.keys(store)) delete store[key];
    jest.clearAllMocks();
  });

  it('resolves to system dark when no preference is stored', async () => {
    const { AppThemeProvider, useAppTheme } = require('../app/src/styles/theme');

    const HookHarness: React.FC<{ onChange: (value: ReturnType<typeof useAppTheme>) => void }> = ({
      onChange,
    }) => {
      const theme = useAppTheme();

      useEffect(() => {
        onChange(theme);
      }, [theme, onChange]);

      return null;
    };

    // No AsyncStorage mocked: provider should fallback to system preference
    let last: ReturnType<typeof useAppTheme> | null = null;

    render(
      // @ts-ignore - type compatibility in test harness
      <AppThemeProvider>
        <HookHarness onChange={(v) => (last = v)} />
      </AppThemeProvider>
    );

    await waitFor(() => {
      expect(last).not.toBeNull();
      expect(last!.theme.mode).toBe('dark');
    });
  });

  it('respects stored preference over system', async () => {
    // Pre-populate AsyncStorage mock before loading the provider
    const store = (AsyncStorage as any).__store as Record<string, string>;
    store['@luca_theme_preference'] = 'light';

    const { AppThemeProvider, useAppTheme } = require('../app/src/styles/theme');

    const HookHarness: React.FC<{ onChange: (value: ReturnType<typeof useAppTheme>) => void }> = ({
      onChange,
    }) => {
      const theme = useAppTheme();

      useEffect(() => {
        onChange(theme);
      }, [theme, onChange]);

      return null;
    };

    let last: ReturnType<typeof useAppTheme> | null = null;

    render(
      // @ts-ignore - type compatibility in test harness
      <AppThemeProvider>
        <HookHarness onChange={(v) => (last = v)} />
      </AppThemeProvider>
    );

    await waitFor(() => {
      expect(last).not.toBeNull();
      expect(last!.theme.mode).toBe('light');
    });
  });
});
