import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome6';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

// Import du NodeRegistry
import { nodeRegistry } from '../engine/NodeRegistry';
import { nodeInstanceTracker } from '../engine/NodeInstanceTracker';

import createStyles from './NodePickerScreenStyles';
import { useAppTheme } from '../styles/theme';
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
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  // Charger les catégories depuis le registry
  useEffect(() => {
    const loadCategories = () => {
      const cats = nodeRegistry.getCategories();
      const stats = nodeRegistry.getStats();
      const allNodes = nodeRegistry.getAllNodes();

      // Keep minimal debug logs — emit only in development
      logger.debug('📦 NodePickerScreen: Loaded categories:', cats);
      logger.debug('📊 NodeRegistry stats:', stats);
      logger.debug(
        '📝 All registered nodes:',
        allNodes.map((n) => `${n.id} (${n.name})`).join(', ')
      );
      logger.debug('🔍 Total nodes registered:', allNodes.length);

      setCategories(cats);
    };

    // Charger immédiatement
    loadCategories();

    // Recharger après un court délai pour s'assurer que les nodes sont chargées
    const timeout = setTimeout(loadCategories, 100);

    return () => clearTimeout(timeout);
  }, []);

  /**
   * Ajouter un nœud avec vérification des limites
   */
  const handleAddNode = (nodeType: string) => {
    logger.debug('🔍 handleAddNode called for:', nodeType);

    const checkResult = nodeRegistry.canAddNode(nodeType);
    logger.debug('✅ canAddNode result:', checkResult);

    if (!checkResult.canAdd) {
      // Afficher une alerte si la limite est atteinte
      const nodeDefinition = nodeRegistry.getNode(nodeType);
      Alert.alert('Limit Reached', `Cannot add "${nodeDefinition?.name}": ${checkResult.reason}`, [
        { text: 'OK' },
      ]);
      return;
    }

    // Incrémenter le compteur
    nodeInstanceTracker.addInstance(nodeType);

    // Emit the event so the editor can handle it
    emitNodeAdded(nodeType);

    // Retourner à l'écran précédent
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageContainer}>
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

        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollContent}>
          {categories.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="info-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyStateText}>No nodes available</Text>
              <Text style={styles.emptyStateSubtext}>Please wait for nodes to load...</Text>
            </View>
          ) : (
            categories.map((category) => {
              const nodesInCategory = nodeRegistry.getNodesByCategory(category);
              return (
                <View key={category}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  {nodesInCategory.map((nodeType) => {
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
                              style={[
                                styles.nodeTypeName,
                                isDisabled && styles.nodeTypeNameDisabled,
                              ]}
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
                                  style={[styles.badgeText, isDisabled && styles.badgeTextDisabled]}
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
              );
            })
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default NodePickerScreen;
