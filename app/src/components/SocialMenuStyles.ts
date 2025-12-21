import { StyleSheet, Platform } from 'react-native';
import type { AppTheme } from '../styles/theme';

export default function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'transparent',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000000a4',
    },
    modalContent: {
      backgroundColor: theme.colors.surfaceElevated,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderTopWidth: 1,
      borderColor: theme.colors.border,
      // elevated card look
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    dragIndicator: {
      width: 100,
      height: 5,
      borderRadius: 2,
      alignSelf: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderStrong,
    },
    leftColumn: {
      width: 56,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    centerColumn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rightColumn: {
      width: 56, // match leftColumn so centerColumn is truly centered
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBadge: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    footerText: {
      textAlign: 'center',
      paddingTop: 12,
      backgroundColor: 'transparent',
      fontSize: 14,
    },
  });
}
