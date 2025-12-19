import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../src/screens/HomeScreen';

describe('HomeScreen (app)', () => {
  test('renders and Raccourci navigates to NodeEditor', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as any;

    const renderResult = render(<HomeScreen navigation={navigation} />);

    expect(renderResult.getByTestId('home-screen')).toBeTruthy();

    const shortcut = (renderResult as any).getByA11yLabel('shortcut-button');
    const instruction = (renderResult as any).getByA11yLabel('instruction-button');
    const socials = (renderResult as any).getByA11yLabel('socials-button');

    expect(shortcut).toBeTruthy();
    expect(instruction).toBeTruthy();
    expect(socials).toBeTruthy();

    fireEvent.press(shortcut);
    expect(navigate).toHaveBeenCalledWith('NodeEditor');
  });
});
