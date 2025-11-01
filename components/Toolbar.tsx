// components/Toolbar.tsx
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styles } from '../styles/styles';

interface ToolbarProps {
  onClear: () => void;
  onAdd: () => void;
}

const Toolbar = ({ onClear, onAdd }: ToolbarProps) => {
  return (
    <View style={styles.toolbar}>
      <TouchableOpacity
        style={styles.clearButton}
        onPress={onClear}
      >
        <Text style={styles.clearButtonText}>Clear Links</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.clearButton, { marginLeft: 10 }]}
        onPress={onAdd}
      >
        <Text style={styles.clearButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

export { Toolbar };