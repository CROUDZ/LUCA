const React = require('react');
const { Text } = require('react-native');

// Simple stub for FontAwesome6 icon used in tests
module.exports = function FontAwesome6(props) {
  return React.createElement(Text, props, props.children || props.name || 'icon');
};
