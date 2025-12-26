import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme, type AppTheme, hexToRgba } from '../theme';
import type { RootStackParamList } from '../types/navigation.types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

type NodeEditorScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NodeEditor'>;

const COMPACT_THRESHOLD = 360;

interface TopControlsBarProps {
  isReady: boolean;
  currentSaveId: string | null;
  currentSaveName: string;
  onOpenSaveMenu: () => void;
  onClearGraph: () => void;
  onOpenSettings: () => void;
}

const TopControlsBar: React.FC<TopControlsBarProps> = React.memo(
  ({ isReady, currentSaveId, currentSaveName, onOpenSaveMenu, onClearGraph, onOpenSettings }) => {
    const { theme } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const isCompact = screenWidth < COMPACT_THRESHOLD;

    const nav = useNavigation<NodeEditorScreenNavigationProp>();

    const styles = createStyles(theme, isCompact);

    return (
      <View style={styles.container}>
        <View style={styles.left}>
          <Icon name="folder" size={isCompact ? 14 : 16} color={theme.colors.text} />
          {currentSaveId ? (
            <Text
              style={styles.saveText}
              numberOfLines={1}
              ellipsizeMode="middle"
              accessibilityLabel={`Sauvegarde ${currentSaveName}`}
            >
              {currentSaveName}
            </Text>
          ) : (
            <Text style={styles.saveText} numberOfLines={1} ellipsizeMode="tail">
              —
            </Text>
          )}
        </View>

        <View style={styles.right}>
          <ToolIcon
            name="home"
            onPress={() => nav.navigate('Home')}
            disabled={!isReady}
            accessibilityLabel="Retourner à l'accueil"
            theme={theme}
            compact={isCompact}
          />
          <ToolIcon
            name="menu"
            onPress={() => nav.navigate('Shortcuts')}
            disabled={!isReady}
            accessibilityLabel="Ouvrir sauvegardes"
            theme={theme}
            compact={isCompact}
          />
          <ToolIcon
            name="delete-outline"
            onPress={onClearGraph}
            disabled={!isReady}
            accessibilityLabel="Effacer"
            theme={theme}
            compact={isCompact}
          />
          <ToolIcon
            name="settings"
            onPress={() => {
              // Use the provided handler but guard against missing navigation
              // inside it as well (defensive). Prefer navigating via the
              // parent's handler when available.
              try {
                onOpenSettings();
              } catch {
                nav?.navigate?.('Settings');
              }
            }}
            disabled={false}
            accessibilityLabel="Paramètres"
            theme={theme}
            compact={isCompact}
          />
        </View>
      </View>
    );
  }
);

TopControlsBar.displayName = 'TopControlsBar';
export default TopControlsBar;

/* Minimal icon-button component */
function ToolIcon({
  name,
  onPress,
  disabled,
  accessibilityLabel,
  theme,
  compact,
}: {
  name: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  theme: AppTheme;
  compact?: boolean;
}) {
  const size = compact ? 16 : 18;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!!disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={[
        stylesIcon.button,
        disabled && stylesIcon.buttonDisabled,
        { borderColor: hexToRgba(theme.colors.border, 0.6) },
      ]}
      activeOpacity={0.7}
    >
      <Icon
        name={name}
        size={size}
        color={disabled ? theme.colors.textSecondary : theme.colors.text}
      />
    </TouchableOpacity>
  );
}

/* Styles */
const createStyles = (theme: AppTheme, compact: boolean) => {
  const bg = hexToRgba(theme.colors.surface, theme.mode === 'dark' ? 0.9 : 0.92);
  return StyleSheet.create({
    container: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: compact ? 6 : 10,
      paddingVertical: compact ? 6 : 8,
      backgroundColor: bg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: hexToRgba(theme.colors.border, 0.6),
      zIndex: 1000,
      minHeight: 40,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: '55%',
      minWidth: 0,
    },
    saveText: {
      marginLeft: 8,
      fontSize: compact ? 11 : 13,
      color: theme.colors.text,
      fontWeight: '600',
      flexShrink: 1, // évite la superposition
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: compact ? 6 : 8,
    },
  });
};

const stylesIcon = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
