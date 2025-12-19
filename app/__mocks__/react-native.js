// Minimal manual mock for react-native to make unit tests deterministic
const jestFn = () => jest.fn();

const React = require('react');

const View = (props) => React.createElement('View', props, props.children);
const Text = (props) => React.createElement('Text', props, props.children);
const TouchableOpacity = (props) => React.createElement('TouchableOpacity', props, props.children);

module.exports = {
  Alert: { alert: jest.fn() },
  NativeModules: {
    // Add modules used in tests / native integrations
    TorchModule: {
      switchState: jest.fn(),
    },
    VolumeModule: {
      getVolume: jest.fn(() => 50),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  NativeEventEmitter: function () {
    return {
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
      removeListener: jest.fn(),
    };
  },
  useColorScheme: () => 'dark',
  Platform: { OS: 'android' },
  StatusBar: { currentHeight: 0 },
  // Basic component stubs used by tests
  View,
  Text,
  TouchableOpacity,
  // Minimal StyleSheet implementation
  StyleSheet: {
    create: (obj) => obj,
    flatten: (s) => s,
  },
  // DeviceEventEmitter used by volume controller
  DeviceEventEmitter: {
    addListener: jest.fn(),
  },
  // Provide a minimal set of helpers used by some modules
  PermissionsAndroid: {
    request: jest.fn(async () => 'granted'),
    check: jest.fn(async () => true),
  },
};
