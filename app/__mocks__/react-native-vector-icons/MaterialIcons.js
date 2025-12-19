const React = require('react');
const { Text } = require('react-native');

// Simple stub for vector icons used in unit tests
module.exports = function MaterialIcons(props) {
  return React.createElement(Text, props, props.children || props.name || 'icon');
};
