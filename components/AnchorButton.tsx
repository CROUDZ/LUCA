// components/AnchorButton.tsx
import React from 'react';
import { TouchableOpacity, View, TouchableOpacityProps } from 'react-native';
import { styles } from '../styles/styles';

interface AnchorButtonProps extends TouchableOpacityProps {
  onPress: () => void;
  isSelected: boolean;
  style?: object;
}

const AnchorButton = ({
  onPress,
  isSelected,
  style,
}: AnchorButtonProps) => {
  return (
    <TouchableOpacity onPress={onPress} style={style}>
      <View
        style={[
          styles.anchor,
          isSelected && styles.anchorSelected,
        ]}
      />
    </TouchableOpacity>
  );
};

export { AnchorButton };