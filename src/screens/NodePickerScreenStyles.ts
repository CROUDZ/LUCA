import { StyleSheet } from 'react-native';
import type { AppTheme } from '../styles/theme';
import { hexToRgba } from '../styles/colorUtils';

export const createStyles = (theme: AppTheme) => {
  const cardBackground = hexToRgba(
    theme.colors.backgroundSecondary,
    theme.mode === 'dark' ? 0.8 : 0.95
  );
  const disabledBackground = hexToRgba(theme.colors.backgroundSecondary, 0.4);

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    pageContainer: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      elevation: 4,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: hexToRgba(theme.colors.primarySoft, 0.2),
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
    headerSpacer: { width: 40 },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      textAlign: 'center',
      backgroundColor: theme.colors.backgroundSecondary,
    },
    contentScroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
    categoryTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.primary,
      marginTop: 16,
      marginBottom: 12,
      marginLeft: 4,
    },
    nodeTypeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      backgroundColor: cardBackground,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: hexToRgba(theme.colors.primarySoft, 0.2),
      gap: 12,
    },
    nodeTypeIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: hexToRgba(theme.colors.primarySoft, 0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    nodeTypeInfo: { flex: 1 },
    nodeTypeName: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
    nodeTypeDescription: { fontSize: 12, color: theme.colors.textSecondary },
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
    emptyStateText: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginTop: 12 },
    emptyStateSubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    nodeTypeItemDisabled: { opacity: 0.6, backgroundColor: disabledBackground },
    nodeTypeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    nodeTypeNameDisabled: { color: theme.colors.textSecondary },
    nodeTypeDescriptionDisabled: { color: theme.colors.textSecondary },
    badgeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      marginBottom: 4,
    },
    instanceBadge: {
      backgroundColor: hexToRgba(theme.colors.primarySoft, 0.25),
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: hexToRgba(theme.colors.primarySoft, 0.4),
    },
    instanceBadgeDisabled: {
      backgroundColor: hexToRgba(theme.colors.error, 0.18),
      borderColor: hexToRgba(theme.colors.error, 0.4),
    },
    badgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.text, letterSpacing: 0.3 },
    badgeTextDisabled: { color: theme.colors.error },
    nodeTypeLimitWarning: {
      fontSize: 11,
      color: theme.colors.warning,
      marginTop: 4,
      fontStyle: 'italic',
    },
  });
};

export default createStyles;
