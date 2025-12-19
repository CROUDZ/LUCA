import { AppTheme } from '../styles/theme';
import { StyleSheet } from 'react-native';

const createStyles = (theme: AppTheme) => {
  const safeCreate = (obj: any) =>
    StyleSheet && typeof (StyleSheet as any).create === 'function'
      ? (StyleSheet as any).create(obj)
      : obj;
  return safeCreate({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.background,
      paddingHorizontal: 24,
      paddingVertical: 28,
    },
    logoCircle: {
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: theme.colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 10,
      elevation: 6,
    },
    logo: {
      width: '70%',
      height: '70%',
      borderRadius: 75,
      resizeMode: 'contain',
      transform: [{ translateY: 8 }],
    },
    title: {
      color: '#FFFFFF',
      fontSize: 40,
      fontWeight: '800',
      transform: [{ translateY: -15 }],
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
      maxWidth: 320,
    },
    actions: {
      width: '100%',
      paddingHorizontal: 8,
      gap: 12,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surfaceElevated,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 50,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: theme.mode === 'dark' ? 0.16 : 0.08,
      shadowRadius: 10,
      elevation: 4,
    },
    actionText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      marginLeft: 12,
    },
    chevron: {
      color: '#FFFFFF',
    },
    footer: {
      alignItems: 'center',
      width: '100%',
      paddingVertical: 8,
    },
    footerText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
  });
};

export default createStyles;
