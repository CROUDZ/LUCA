// Minimal manual mock for react-native to make unit tests deterministic
const jestFn = () => jest.fn();

const React = require('react');

const View = (props) => React.createElement('View', props, props.children);
const Text = (props) => React.createElement('Text', props, props.children);
const TouchableOpacity = (props) => React.createElement('TouchableOpacity', props, props.children);
const Modal = (props) => React.createElement('Modal', props, props.children);
const StatusBar = (props) => React.createElement('StatusBar', props, props.children);
const Image = (props) => React.createElement('Image', props, props.children);
StatusBar.currentHeight = 0;

// Minimal Animated shim for tests that rely on Animated.Value/.View
class AnimatedValue {
  constructor(v) {
    this._value = v;
  }
  setValue(v) {
    this._value = v;
  }
  interpolate() {
    return this;
  }
}
const Animated = {
  Value: AnimatedValue,
  View,
  timing: (_value, _config) => ({ start: (cb) => cb && cb() }),
  parallel: (anims) => ({
    start: (cb) => {
      anims?.forEach?.((a) => a?.start?.());
      cb && cb();
    },
  }),
  add: () => new AnimatedValue(0),
};

// Simple in-memory event bus for DeviceEventEmitter
const __listeners = new Map();
function __addListener(eventName, handler) {
  if (!__listeners.has(eventName)) __listeners.set(eventName, new Set());
  __listeners.get(eventName).add(handler);
  return {
    remove: jest.fn(() => {
      try {
        __listeners.get(eventName)?.delete(handler);
      } catch (e) {
        // ignore
      }
    }),
  };
}
function __emit(eventName, payload) {
  const set = __listeners.get(eventName);
  if (!set) return;
  for (const handler of Array.from(set)) {
    try {
      handler(payload);
    } catch (e) {
      // ignore
    }
  }
}

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
  Modal,
  StatusBar,
  BackHandler: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  // Basic component stubs used by tests
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform: {
    OS: 'android',
    select: (obj) => (obj ? obj['android'] || obj.default : undefined),
  },
  // Minimal StyleSheet implementation
  StyleSheet: {
    create: (obj) => obj,
    flatten: (s) => s,
  },
  // DeviceEventEmitter used by volume controller
  DeviceEventEmitter: {
    addListener: jest.fn(__addListener),
    emit: jest.fn(__emit),
  },
  // Provide a minimal set of helpers used by some modules
  PermissionsAndroid: {
    request: jest.fn(async () => 'granted'),
    check: jest.fn(async () => true),
  },
};
