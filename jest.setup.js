// Global Jest setup for React Native mocks
// This file is executed before each test file.
jest.doMock('react-native', () => ({
  Platform: { OS: 'ios' },
  DeviceEventEmitter: { addListener: jest.fn() },
  NativeEventEmitter: jest.fn(() => ({ addListener: jest.fn() })),
  NativeModules: {},
  PermissionsAndroid: {
    request: jest.fn(() => Promise.resolve('granted')),
    PERMISSIONS: { CAMERA: 'CAMERA' },
    RESULTS: { GRANTED: 'granted', NEVER_ASK_AGAIN: 'never_ask_again' },
  },
  Linking: { openSettings: jest.fn() },
  Alert: { alert: jest.fn() },
}), { virtual: true });

jest.doMock('react-native-torch', () => ({ switchState: jest.fn() }), { virtual: true });
