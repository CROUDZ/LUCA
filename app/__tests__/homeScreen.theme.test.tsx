// Use a spy to set the color scheme without replacing the whole react-native module
import rn from 'react-native';
jest.spyOn(rn, 'useColorScheme').mockImplementation(() => 'dark');

import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../src/screens/HomeScreen';
import { AppThemeProvider } from '../src/styles/theme';
import { basePalette } from '../src/styles/global';

describe('HomeScreen theming', () => {
  it('applies theme colors to the title', () => {
    const navigation = { navigate: jest.fn() };
    const { getByText } = render(
      React.createElement(AppThemeProvider, null, React.createElement(HomeScreen, { navigation }))
    );

    const title = getByText('LUCA');
    // Expect title color to equal basePalette.textOnDark since we mocked system as dark
    const style = Array.isArray(title.props.style)
      ? Object.assign({}, ...title.props.style)
      : title.props.style;
    expect(style.color).toBe(basePalette.textOnDark);
  });
});

export {};
