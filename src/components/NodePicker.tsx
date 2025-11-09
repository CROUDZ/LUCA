import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome6';

// Import du NodeRegistry
import { nodeRegistry } from '../engine/NodeRegistry';
import { nodeInstanceTracker } from '../engine/NodeInstanceTracker';

import styles from './NodePickerStyles';

interface NodePickerProps {
  isReady: boolean;
  onAddNode: (nodeType: string) => void;
}

const NodePicker: React.FC<NodePickerProps> = ({ 
  isReady, 
  onAddNode,
}) => {
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // Charger les catégories depuis le registry
  useEffect(() => {
    const loadCategories = () => {
      const cats = nodeRegistry.getCategories();
      console.log('📦 NodePicker: Loaded categories:', cats);
      console.log('📊 NodeRegistry stats:', nodeRegistry.getStats());
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
    console.log('🔍 handleAddNode called for:', nodeType);
    
    const checkResult = nodeRegistry.canAddNode(nodeType);
    console.log('✅ canAddNode result:', checkResult);
    
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
    
    // Ajouter la node
    onAddNode(nodeType);
    setShowNodePicker(false);
  };

  return (
    <>
      {/* Bouton flottant pour ajouter des nœuds */}
      <TouchableOpacity
        style={[styles.fabButton, !isReady && styles.fabButtonDisabled]}
        onPress={() => setShowNodePicker(true)}
        disabled={!isReady}
        activeOpacity={0.8}
      >
        <Icon name="add" size={32} color="#ffffff" />
      </TouchableOpacity>

      {/* Modal Node Picker */}
      <Modal
        visible={showNodePicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowNodePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.nodePickerContent}>
            <View style={styles.modalTitleRow}>
              <Icon name="add-circle-outline" size={28} color="#8b5cf6" />
              <Text style={styles.modalTitle}>Add Node</Text>
            </View>
            <Text style={styles.nodePickerSubtitle}>
              Select a node type to add ({nodeRegistry.getCount()} nodes available)
            </Text>

            <ScrollView style={styles.nodeTypesList}>
              {categories.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="info-outline" size={48} color="#6b7280" />
                  <Text style={styles.emptyStateText}>No nodes available</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Please wait for nodes to load...
                  </Text>
                </View>
              ) : null}
              {categories.map((category) => {
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
                          style={[
                            styles.nodeTypeItem,
                            isDisabled && styles.nodeTypeItemDisabled,
                          ]}
                          onPress={() => handleAddNode(nodeType.id)}
                          disabled={isDisabled}
                        >
                          <View style={styles.nodeTypeIconContainer}>
                            {nodeType.iconFamily === 'material' ? (
                              <Icon 
                                name={nodeType.icon} 
                                size={32} 
                                color={isDisabled ? '#6b7280' : (nodeType.color || '#8b5cf6')} 
                              />
                            ) : (
                              <FAIcon 
                                name={nodeType.icon} 
                                size={28} 
                                color={isDisabled ? '#6b7280' : (nodeType.color || '#8b5cf6')} 
                              />
                            )}
                          </View>
                          <View style={styles.nodeTypeInfo}>
                            <View style={styles.nodeTypeNameRow}>
                              <Text style={[
                                styles.nodeTypeName,
                                isDisabled && styles.nodeTypeNameDisabled,
                              ]}>
                                {nodeType.name}
                              </Text>
                            </View>
                            
                            {/* Badge de limite d'instances */}
                            {nodeType.maxInstances !== undefined && (
                              <View style={styles.badgeContainer}>
                                <View style={[
                                  styles.instanceBadge,
                                  isDisabled && styles.instanceBadgeDisabled,
                                ]}>
                                  <Text style={[
                                    styles.badgeText,
                                    isDisabled && styles.badgeTextDisabled,
                                  ]}>
                                    Instances: {checkResult.currentCount || 0}/{nodeType.maxInstances}
                                  </Text>
                                </View>
                              </View>
                            )}
                            
                            <Text style={[
                              styles.nodeTypeDescription,
                              isDisabled && styles.nodeTypeDescriptionDisabled,
                            ]}>
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
                            color={isDisabled ? '#4b5563' : '#6b7280'} 
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.closePickerButton}
              onPress={() => setShowNodePicker(false)}
            >
              <Text style={styles.closePickerButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default NodePicker;