import React, { useMemo } from 'react';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation.types';

import NodeEditorScreen from '../screens/NodeEditorScreen';
import NodePickerScreen from '../screens/NodePickerScreen';
import ModLibraryScreen from '../screens/ModLibraryScreen';
import { useAppTheme } from '../styles/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { theme } = useAppTheme();

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const baseTheme = theme.mode === 'dark' ? NavigationDarkTheme : NavigationDefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.backgroundSecondary,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.secondary,
      },
    };
  }, [theme]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="NodeEditor"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen
          name="NodeEditor"
          component={NodeEditorScreen}
          options={{
            title: 'Node Editor',
          }}
        />
        <Stack.Screen
          name="NodePicker"
          component={NodePickerScreen}
          options={{
            title: 'Add Node',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="ModLibrary"
          component={ModLibraryScreen}
          options={{
            title: 'Mod Library',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
