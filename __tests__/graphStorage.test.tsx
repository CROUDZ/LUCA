import React, { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGraphStorage } from '../src/hooks/useGraphStorage';
import type { DrawflowExport } from '../src/types';
import { APP_CONFIG } from '../src/config/constants';

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

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

const sampleGraph: DrawflowExport = {
  drawflow: {
    Home: {
      data: {
        '1': {
          id: 1,
          name: 'Trigger',
          data: { settings: { threshold: 10 } },
          class: 'input-node',
          html: '<div>Trigger</div>',
          typenode: false,
          inputs: {},
          outputs: {},
          pos_x: 40,
          pos_y: 80,
        },
      },
    },
  },
};

const HookHarness: React.FC<{ onChange: (value: ReturnType<typeof useGraphStorage>) => void }> = ({
  onChange,
}) => {
  const storage = useGraphStorage();

  useEffect(() => {
    onChange(storage);
  }, [storage, onChange]);

  return null;
};

describe('useGraphStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('creates a save using the latest exported graph data', async () => {
    let latestHookValue: ReturnType<typeof useGraphStorage> | null = null;

    const onChange = (value: ReturnType<typeof useGraphStorage>) => {
      latestHookValue = value;
    };

    render(<HookHarness onChange={onChange} />);

    await waitFor(() => {
      expect(latestHookValue).not.toBeNull();
      expect(latestHookValue?.isLoading).toBe(false);
    });

    await act(async () => {
      const created = await latestHookValue!.createSave('Test Save', sampleGraph);
      expect(created).not.toBeNull();
      expect(created?.data).toEqual(sampleGraph);
    });

    await waitFor(() => {
      expect(latestHookValue?.saves.length).toBeGreaterThanOrEqual(1);
    });

    const stored = await AsyncStorage.getItem(APP_CONFIG.storage.key);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed[0].name).toBe('Test Save');
    expect(parsed[0].data).toEqual(sampleGraph);
  });
});
