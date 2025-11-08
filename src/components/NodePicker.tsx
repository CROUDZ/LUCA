import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome6';

// Import des configurations
import { NODE_TYPES } from '../config/constants';

import styles from './NodePickerStyles';

interface NodePickerProps {
  isReady: boolean;
  onAddNode: (nodeType: string) => void;
}

const NodePicker: React.FC<NodePickerProps> = ({ isReady, onAddNode }) => {
  const [showNodePicker, setShowNodePicker] = useState(false);

  /**
   * Ajouter un nœud
   */
  const handleAddNode = (nodeType: string) => {
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
            <Text style={styles.nodePickerSubtitle}>Select a node type to add</Text>

            <ScrollView style={styles.nodeTypesList}>
              {NODE_TYPES.map((nodeType) => (
                <TouchableOpacity
                  key={nodeType.id}
                  style={styles.nodeTypeItem}
                  onPress={() => handleAddNode(nodeType.id)}
                >
                  <View style={styles.nodeTypeIconContainer}>
                    {nodeType.iconFamily === 'material' ? (
                      <Icon name={nodeType.icon} size={32} color="#8b5cf6" />
                    ) : (
                      <FAIcon name={nodeType.icon} size={28} color="#8b5cf6" />
                    )}
                  </View>
                  <View style={styles.nodeTypeInfo}>
                    <Text style={styles.nodeTypeName}>{nodeType.name}</Text>
                    <Text style={styles.nodeTypeDescription}>{nodeType.description}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#6b7280" />
                </TouchableOpacity>
              ))}
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