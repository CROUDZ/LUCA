import React from 'react';

// Mock AsyncStorage used by hooks
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
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockSetTheme = jest.fn();
const mockToggle = jest.fn().mockResolvedValue(undefined);

jest.mock('../app/src/hooks/useWebViewMessaging', () => ({
  useWebViewMessaging: jest.fn(() => ({
    webRef: { current: null },
    isReady: true,
    handleMessage: jest.fn(),
    sendMessage: jest.fn(),
    loadGraph: jest.fn(),
    addNode: jest.fn(),
    requestExport: jest.fn(),
    clearGraph: jest.fn(),
    setTheme: mockSetTheme,
  })),
}));

jest.mock('../app/src/styles/theme', () => ({
  useAppTheme: jest.fn(() => ({
    theme: {
      mode: 'dark',
      colors: {
        primary: '#5a2af5',
        primarySoft: '#7e5bef',
        primaryMuted: '#673bf3',
        primaryContrast: '#4420b8',
        secondary: '#2ed0ff',
        secondarySoft: '#bfeffd',
        background: '#05030f',
        backgroundSecondary: '#12142b',
        surface: '#1c1f3a',
        surfaceElevated: '#262947',
        overlay: 'rgba(0,0,0,0.5)',
        text: '#f4f6ff',
        textSecondary: '#c5c9ff',
        textMuted: 'rgba(197,201,255,0.65)',
        border: '#494c61',
        borderStrong: '#5a2af5',
        success: '#1fc8a9',
        warning: '#f5a524',
        error: '#ff6b81',
        info: '#57b2ff',
        shadow: '#04020c',
        focus: 'rgba(46,208,255,0.35)',
        chip: 'rgba(126,91,239,0.18)',
        chipDisabled: 'rgba(197,201,255,0.25)',
        inputBackground: '#1c1f3a',
      },
    },
    toggle: mockToggle,
  })),
}));

  // Stub components that rely on Animated/native modules for simpler unit test
  jest.mock('../app/src/components/ProgramControlBar', () => ({
    __esModule: true,
    default: (props: any) => require('react').createElement('ProgramControlBar', props),
  }));

  jest.mock('../app/src/components/TopControlsBar', () => ({
    __esModule: true,
    default: (props: any) => require('react').createElement('TopControlsBar', props),
  }));

  jest.mock('../app/src/components/SaveMenu', () => ({
    __esModule: true,
    default: (props: any) => require('react').createElement('SaveMenu', props),
  }));

describe('NodeEditorScreen theme toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('toggles theme and sends SET_THEME to WebView', async () => {
    // Require after mocks
    const NodeEditorScreen = require('../app/src/screens/NodeEditorScreen').default;

    const { getByText } = render(
      // @ts-ignore - minimal navigation mock
      <NodeEditorScreen navigation={{ navigate: jest.fn() }} />
    );

    const btn = getByText('Clair');

    fireEvent.press(btn);

    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalled();
      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });
  });
});
