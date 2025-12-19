jest.mock('react-native', () => ({
  useColorScheme: () => 'dark',
}));

import React, { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react-native';
// We'll require the provider inside tests so we can control AsyncStorage mock when needed
import type AsyncStorageType from '@react-native-async-storage/async-storage';

const HookHarness: React.FC<{ onChange: (value: ReturnType<typeof useAppTheme>) => void }> = ({
  onChange,
}) => {
  const theme = useAppTheme();

  useEffect(() => {
    onChange(theme);
  }, [theme, onChange]);

  return null;
};

describe('AppThemeProvider', () => {
  beforeEach(async () => {
    // reset module registry to ensure any previous mocks don't leak
    jest.resetModules();
  });

  it('resolves to system dark when no preference is stored', async () => {
    // No AsyncStorage mocked: provider should fallback to system preference
    const { AppThemeProvider, useAppTheme } = require('../app/src/styles/theme');

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
    // Mock AsyncStorage to contain 'light' preference before loading the provider
    const mockStorage: Record<string, string> = { '@luca_theme_preference': 'light' };
    jest.doMock(
      '@react-native-async-storage/async-storage',
      () =>
        ({
          getItem: jest.fn(async (k: string) =>
            Object.prototype.hasOwnProperty.call(mockStorage, k) ? mockStorage[k] : null
          ),
          setItem: jest.fn(async (k: string, v: string) => {
            mockStorage[k] = v;
          }),
          removeItem: jest.fn(async (k: string) => {
            delete mockStorage[k];
          }),
          clear: jest.fn(async () => {
            for (const k of Object.keys(mockStorage)) delete mockStorage[k];
          }),
        }) as typeof AsyncStorageType
    );

    const { AppThemeProvider, useAppTheme } = require('../app/src/styles/theme');

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
