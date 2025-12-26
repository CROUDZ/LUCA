import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, Text, ScrollView, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome6';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';

// Import du NodeRegistry
import { nodeRegistry } from '../engine/NodeRegistry';
import { nodeInstanceTracker } from '../engine/NodeInstanceTracker';

import { useTheme } from '../theme';
import type { RootStackParamList } from '../types/navigation.types';
import { emitNodeAdded } from '../utils/NodePickerEvents';
import { logger } from '../utils/logger';

type NodePickerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NodePicker'>;

type NodePickerScreenRouteProp = RouteProp<RootStackParamList, 'NodePicker'>;

interface NodePickerScreenProps {
  navigation: NodePickerScreenNavigationProp;
  route: NodePickerScreenRouteProp;
}

const NodePickerScreen: React.FC<NodePickerScreenProps> = ({ navigation }) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const loadCategories = useCallback(() => {
    const cats = nodeRegistry.getCategories();
    const stats = nodeRegistry.getStats();
    const allNodes = nodeRegistry.getAllNodes();

    // Keep minimal debug logs — emit only in development
    logger.debug('📦 NodePickerScreen: Loaded categories:', cats);
    logger.debug('📊 NodeRegistry stats:', stats);
    logger.debug('📝 All registered nodes:', allNodes.map((n) => `${n.id} (${n.name})`).join(', '));
    logger.debug('🔍 Total nodes registered:', allNodes.length);

    setCategories(cats);
  }, []);

  // Charger les catégories depuis le registry au montage
  useEffect(() => {
    loadCategories();
    const timeout = setTimeout(loadCategories, 100);
    return () => clearTimeout(timeout);
  }, [loadCategories]);

  // Recharger les catégories quand l'écran reçoit le focus (pour afficher les nouveaux mods)
  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories])
  );

  // Filtrage des catégories / nœuds selon le terme de recherche
  const filteredCategories = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return categories.map((c) => ({ category: c, nodes: nodeRegistry.getNodesByCategory(c) }));
    }

    return categories
      .map((c) => ({
        category: c,
        nodes: nodeRegistry
          .getNodesByCategory(c)
          .filter((n) => `${n.name} ${n.id} ${n.description ?? ''}`.toLowerCase().includes(q)),
      }))
      .filter((c) => c.nodes.length > 0);
  }, [categories, searchTerm]);

  /**
   * Ajouter un nœud avec vérification des limites
   */
  const handleAddNode = useCallback(
    (nodeType: string) => {
      logger.debug('🔍 handleAddNode called for:', nodeType);

      const checkResult = nodeRegistry.canAddNode(nodeType);
      logger.debug('✅ canAddNode result:', checkResult);

      if (!checkResult.canAdd) {
        // Afficher une alerte si la limite est atteinte
        const nodeDefinition = nodeRegistry.getNode(nodeType);
        Alert.alert(
          'Limit Reached',
          `Cannot add "${nodeDefinition?.name}": ${checkResult.reason}`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Incrémenter le compteur
      nodeInstanceTracker.addInstance(nodeType);

      // Emit the event so the editor can handle it
      emitNodeAdded(nodeType);

      // Retourner à l'écran précédent
      navigation.goBack();
    },
    [navigation]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* Header avec bouton retour */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Icon name="add-circle-outline" size={28} color={theme.colors.primary} />
            <Text style={styles.headerTitle}>Add Node</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.headerSubtitle}>
          Select a node type to add ({nodeRegistry.getCount()} nodes available)
        </Text>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search nodes..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            accessibilityLabel="Search nodes"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchTerm('')}
              style={styles.clearButton}
              accessibilityLabel="Clear search"
            >
              <Icon name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollContent}>
          {filteredCategories.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="info-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyStateText}>
                {categories.length === 0 ? 'No nodes available' : 'No nodes match your search'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {categories.length === 0
                  ? 'Please wait for nodes to load...'
                  : 'Try a different keyword.'}
              </Text>
            </View>
          ) : (
            filteredCategories.map(({ category, nodes }) => (
              <View key={category}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {nodes.map((nodeType) => {
                  const checkResult = nodeRegistry.canAddNode(nodeType.id);
                  const isDisabled = !checkResult.canAdd;

                  return (
                    <TouchableOpacity
                      key={nodeType.id}
                      style={[styles.nodeTypeItem, isDisabled && styles.nodeTypeItemDisabled]}
                      onPress={() => handleAddNode(nodeType.id)}
                      disabled={isDisabled}
                    >
                      <View style={styles.nodeTypeIconContainer}>
                        {nodeType.iconFamily === 'material' ? (
                          <Icon
                            name={nodeType.icon}
                            size={32}
                            color={
                              isDisabled
                                ? theme.colors.textSecondary
                                : nodeType.color || theme.colors.primary
                            }
                          />
                        ) : (
                          <FAIcon
                            name={nodeType.icon}
                            size={28}
                            color={
                              isDisabled
                                ? theme.colors.textSecondary
                                : nodeType.color || theme.colors.primary
                            }
                          />
                        )}
                      </View>
                      <View style={styles.nodeTypeInfo}>
                        <View style={styles.nodeTypeNameRow}>
                          <Text
                            style={[styles.nodeTypeName, isDisabled && styles.nodeTypeNameDisabled]}
                          >
                            {nodeType.name}
                          </Text>
                        </View>

                        {/* Badge de limite d'instances */}
                        {nodeType.maxInstances !== undefined && (
                          <View style={styles.badgeContainer}>
                            <View
                              style={[
                                styles.instanceBadge,
                                isDisabled && styles.instanceBadgeDisabled,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.badgeText,
                                  isDisabled && { color: theme.colors.error },
                                ]}
                              >
                                Instances: {checkResult.currentCount || 0}/{nodeType.maxInstances}
                              </Text>
                            </View>
                          </View>
                        )}

                        <Text
                          style={[
                            styles.nodeTypeDescription,
                            isDisabled && styles.nodeTypeDescriptionDisabled,
                          ]}
                        >
                          {nodeType.description}
                        </Text>
                        {isDisabled && (
                          <Text style={styles.nodeTypeLimitWarning}>
                            ⚠️ Maximum instances reached
                          </Text>
                        )}
                      </View>
                      <Icon
                        name="chevron-right"
                        size={20}
                        color={isDisabled ? theme.colors.textMuted : theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

import { StyleSheet } from 'react-native';
import type { AppTheme } from '../theme';
import { hexToRgba } from '../theme';

export const createStyles = (theme: AppTheme) => {
  const cardBackground = hexToRgba(
    theme.colors.backgroundSecondary,
    theme.mode === 'dark' ? 0.8 : 0.98
  );
  const disabledBackground = hexToRgba(theme.colors.backgroundSecondary, 0.4);

  return StyleSheet.create({
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
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 6,
      backgroundColor: hexToRgba(theme.colors.backgroundSecondary, 0.9),
      borderRadius: 12,
      borderWidth: 1,
      borderColor: hexToRgba(theme.colors.primarySoft, 0.12),
    },
    searchInput: {
      flex: 1,
      paddingVertical: 6,
      paddingHorizontal: 8,
      color: theme.colors.text,
      fontSize: 14,
    },
    clearButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
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
    nodeTypeLimitWarning: {
      fontSize: 11,
      color: theme.colors.warning,
      marginTop: 4,
      fontStyle: 'italic',
    },
  });
};

export default NodePickerScreen;
