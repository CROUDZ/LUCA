import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation.types';

import NodeEditorScreen from '../screens/NodeEditorScreen';
import NodePickerScreen from '../screens/NodePickerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="NodeEditor"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#0f1117' },
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
