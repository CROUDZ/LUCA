const React = require('react');
const { View } = require('react-native');

const SafeAreaView = (props) => React.createElement(View, props, props.children);

module.exports = {
  SafeAreaView,
  SafeAreaProvider: SafeAreaView,
  SafeAreaConsumer: ({ children }) =>
    children({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    }),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  initialWindowMetrics: null,
};
