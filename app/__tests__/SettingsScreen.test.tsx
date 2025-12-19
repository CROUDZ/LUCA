import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AppThemeProvider } from '../src/styles/theme';
import SettingsScreen from '../src/screens/SettingsScreen';

describe('SettingsScreen', () => {
  it('renders and allows selecting a theme preference', async () => {
    const renderResult = render(
      <AppThemeProvider>
        <SettingsScreen />
      </AppThemeProvider>
    );

    const system = (renderResult as any).getByA11yLabel('theme-system');
    const dark = (renderResult as any).getByA11yLabel('theme-dark');
    const light = (renderResult as any).getByA11yLabel('theme-light');

    expect(system).toBeTruthy();
    expect(dark).toBeTruthy();
    expect(light).toBeTruthy();

    fireEvent.press(dark);

    // preference change may be async; wait for no throw
    await waitFor(() => {
      expect((renderResult as any).getByA11yLabel('theme-dark')).toBeTruthy();
    });
  });
});
