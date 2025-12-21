const React = require('react');
const { View } = require('react-native');

// Minimal LinearGradient mock for tests — renders a View with children
module.exports = function LinearGradient(props) {
  const { children, style, ...rest } = props || {};
  return React.createElement(View, { style, ...rest }, children);
};
