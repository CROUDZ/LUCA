import { StyleSheet } from 'react-native';
import type { AppTheme } from '../styles/theme';

export default function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      padding: 16,
      borderTopWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.backgroundSecondary,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowLabel: {
      fontSize: 16,
    },
    closeBtn: {
      marginTop: 8,
      alignItems: 'center',
      paddingVertical: 12,
    },
    closeText: {
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
