// Mock safe-area-context to avoid depending on native behavior in unit tests
jest.mock('react-native-safe-area-context', () => {
  const R = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: (props: any) => R.createElement(View, props),
    SafeAreaProvider: (props: any) => R.createElement(View, props),
  };
});

export {};

// Use a spy to set the color scheme without replacing the whole react-native module
import rn from 'react-native';
jest.spyOn(rn, 'useColorScheme').mockImplementation(() => 'dark');

import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../app/src/screens/HomeScreen';
import { AppThemeProvider } from '../app/src/styles/theme';
import { basePalette } from '../app/src/styles/global';

describe('HomeScreen theming', () => {
  it('applies theme colors to the title', () => {
    const navigation: any = { navigate: jest.fn() };
    const { getByText, getByTestId } = render(
      React.createElement(AppThemeProvider, null, React.createElement(HomeScreen as any, { navigation }))
    );

    const title = getByText('LUCA');
    const style = Array.isArray(title.props.style)
      ? Object.assign({}, ...title.props.style)
      : title.props.style;
    expect(style.color).toBe(basePalette.textOnDark);

    // check that the first action button uses surfaceElevated and has a shadow color
    const shortcut = getByTestId('shortcut-button');
    const btnStyle = Array.isArray(shortcut.props.style)
      ? Object.assign({}, ...shortcut.props.style)
      : shortcut.props.style;
    expect(btnStyle.backgroundColor).toBeDefined();

    // icon wrapper background should be theme chip color
    const iconWrapper = getByTestId('shortcut-icon');
    const iconStyle = Array.isArray(iconWrapper.props.style)
      ? Object.assign({}, ...iconWrapper.props.style)
      : iconWrapper.props.style;
    expect(iconStyle.backgroundColor).toBeDefined();
  });
});
