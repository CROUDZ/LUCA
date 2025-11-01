// components/FrontRow.tsx
import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { styles } from '../styles/styles';

interface FrontRowProps extends ViewProps {
  label: string;
  children: React.ReactNode;
}

const FrontRow = ({ label, children }: FrontRowProps) => {
  return (
    <View style={styles.row}>
      <Text style={styles.text}>{label}</Text>
      {children}
    </View>
  );
};

export { FrontRow };