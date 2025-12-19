import React, { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppThemeProvider, useAppTheme } from '../src/styles/theme';

// Use the real AsyncStorage mock provided in __mocks__ if available; otherwise
// fall back to a small in-test mock. This avoids replacing the module entirely
// which can create module resolution / duplicate-module issues in some Jest setups.
try {
  // If the module exists, require it so Jest will use the manual mock from __mocks__
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage');
} catch (e) {
  jest.mock('@react-native-async-storage/async-storage', () => {
    let storage: Record<string, string> = {};
    return {
      setItem: jest.fn(async (key: string, value: string) => {
        storage[key] = value;
      }),
      getItem: jest.fn(async (key: string) => {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      }),
      removeItem: jest.fn(async (key: string) => {
        delete storage[key];
      }),
      clear: jest.fn(async () => {
        storage = {};
      }),
      __getStore: () => storage,
    };
  });
}

// Spy on the real react-native mock's useColorScheme to control system preference
const rn = require('react-native');
jest.spyOn(rn, 'useColorScheme').mockImplementation(() => 'dark');

const HookHarness: React.FC<{ onChange: (value: ReturnType<typeof useAppTheme>) => void }> = ({
  onChange,
}: {
  onChange: (value: ReturnType<typeof useAppTheme>) => void;
}) => {
  const theme = useAppTheme();

  useEffect(() => {
    onChange(theme);
  }, [theme, onChange]);

  return null;
};

describe('AppThemeProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('resolves to system dark when no preference is stored', async () => {
    let last: ReturnType<typeof useAppTheme> | null = null;
    // (no debug logs)

    render(
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
    await AsyncStorage.setItem('@luca_theme_preference', 'light');

    let last: ReturnType<typeof useAppTheme> | null = null;

    render(
      <AppThemeProvider>
        <HookHarness onChange={(v) => (last = v)} />
      </AppThemeProvider>
    );

    await waitFor(() => {
      expect(last).not.toBeNull();
      expect(last!.theme.mode).toBe('light');
    });
  });

  it('hooks work in simple component', () => {
    const Comp = () => {
      React.useState(0);
      return null;
    };

    expect(() => render(<Comp />)).not.toThrow();
  });
});

export {};
