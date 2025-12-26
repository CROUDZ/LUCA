import React, { useMemo } from 'react';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation.types';

import HomeScreen from '../screens/HomeScreen';
import NodeEditorScreen from '../screens/NodeEditorScreen';
import NodePickerScreen from '../screens/NodePickerScreen';
import ModLibraryScreen from '../screens/ModLibraryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import InstructionsScreen from '../screens/InstructionsScreen';
import ShortcutsScreen from '../screens/ShortcutsScreen';
import { useTheme } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { theme } = useTheme();

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
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Accueil',
            animation: 'fade',
          }}
        />
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
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="Shortcuts"
          component={ShortcutsScreen}
          options={{
            title: 'Raccourcis',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="Instructions"
          component={InstructionsScreen}
          options={{
            title: 'Instructions',
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
