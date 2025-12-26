/**
 * BackButton - Bouton retour réutilisable
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme, hexToRgba } from '../theme';

interface BackButtonProps {
  onPress: () => void;
  style?: ViewStyle;
  size?: number;
  iconName?: string;
}

const BackButton: React.FC<BackButtonProps> = React.memo(
  ({ onPress, style, size = 24, iconName = 'arrow-back' }) => {
    const { theme } = useTheme();

    return (
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: hexToRgba(theme.colors.surface, 0.9),
            borderColor: hexToRgba(theme.colors.border, 0.5),
          },
          style,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Icon name={iconName} size={size} color={theme.colors.text} />
      </TouchableOpacity>
    );
  }
);

BackButton.displayName = 'BackButton';

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 100,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default BackButton;
