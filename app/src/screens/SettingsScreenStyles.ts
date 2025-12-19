import { StyleSheet } from 'react-native';
import type { AppTheme } from '../styles/theme';
import { hexToRgba } from '../styles/colorUtils';

export const createSettingsStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    backButton: {
      padding: 8,
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    settingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    settingInfo: {
      flex: 1,
      marginRight: 16,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    switch: {
      transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
    },
    optionSelected: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 6,
    },
    infoBox: {
      backgroundColor: hexToRgba(theme.colors.info, 0.12),
      borderRadius: 8,
      padding: 12,
      marginTop: 16,
      borderWidth: 1,
      borderColor: hexToRgba(theme.colors.info, 0.3),
    },
    infoText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    warningBox: {
      backgroundColor: hexToRgba(theme.colors.warning, 0.12),
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: hexToRgba(theme.colors.warning, 0.3),
    },
    warningText: {
      fontSize: 13,
      color: theme.colors.warning,
      lineHeight: 18,
    },
  });
};

export default createSettingsStyles;
