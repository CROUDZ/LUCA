import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppTheme } from '../styles/theme';

/**
 * Simple toggle button to switch between dark and light theme.
 * Keep UI intentionally minimal — integrates easily in a settings screen.
 */
interface ThemeToggleProps {
  compact?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false }) => {
  const { theme, toggle } = useAppTheme();

  if (compact) {
    return (
      <TouchableOpacity
        onPress={() => void toggle()}
        accessibilityLabel="theme-toggle-compact"
        style={{ padding: 8, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated }}
      >
        <Icon
          name={theme.mode === 'dark' ? 'light-mode' : 'dark-mode'}
          size={18}
          color={theme.colors.primary}
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => void toggle()}
      style={{ padding: 10, backgroundColor: theme.colors.surfaceElevated, borderRadius: 8 }}
    >
      <Text style={{ color: theme.colors.text }}>
        {theme.mode === 'dark' ? 'Mode clair' : 'Mode sombre'}
      </Text>
    </TouchableOpacity>
  );
};

export default ThemeToggle;
