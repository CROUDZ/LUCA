import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatDate } from '../utils/dateUtils';
import { Save } from '../types';
import createStyles from './SaveMenuStyles';
import { useAppTheme } from '../styles/theme';

interface SaveMenuProps {
  visible: boolean;
  onClose: () => void;
  saves: Save[];
  currentSaveId: string | null;
  isLoading: boolean;
  showNewSaveInput: boolean;
  newSaveName: string;
  onShowNewSaveInput: (show: boolean) => void;
  onNewSaveNameChange: (name: string) => void;
  onCreateSave: () => void;
  onLoadSave: (saveId: string) => void;
  onDeleteSave: (saveId: string) => void;
}

const SaveMenu: React.FC<SaveMenuProps> = ({
  visible,
  onClose,
  saves,
  currentSaveId,
  isLoading,
  showNewSaveInput,
  newSaveName,
  onShowNewSaveInput,
  onNewSaveNameChange,
  onCreateSave,
  onLoadSave,
  onDeleteSave,
}) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <>
      {/* Menu de gestion des sauvegardes */}
      <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTitleRow}>
              <Icon name="save" size={28} color={theme.colors.primary} />
              <Text style={styles.modalTitle}>Save Manager</Text>
            </View>

            {/* Bouton nouvelle sauvegarde */}
            {!showNewSaveInput ? (
              <TouchableOpacity
                style={styles.newSaveButton}
                onPress={() => onShowNewSaveInput(true)}
              >
                <Icon name="add" size={20} color={theme.colors.success} style={styles.newSaveIcon} />
                <Text style={styles.newSaveButtonText}>New Save</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.newSaveInputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter save name..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newSaveName}
                  onChangeText={onNewSaveNameChange}
                  autoFocus
                />
                <View style={styles.inputButtons}>
                  <TouchableOpacity
                    style={[styles.inputButton, styles.inputButtonCancel]}
                    onPress={() => {
                      onShowNewSaveInput(false);
                      onNewSaveNameChange('');
                    }}
                  >
                    <Icon name="close" size={18} color={theme.colors.textSecondary} />
                    <Text style={styles.inputButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.inputButton, styles.inputButtonConfirm]}
                    onPress={onCreateSave}
                  >
                    <Icon name="check" size={18} color={theme.colors.success} />
                    <Text style={styles.inputButtonText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Liste des sauvegardes */}
            <ScrollView style={styles.savesList}>
              {isLoading ? (
                <Text style={styles.emptyText}>Loading saves...</Text>
              ) : saves.length === 0 ? (
                <Text style={styles.emptyText}>No saves yet. Create one to get started!</Text>
              ) : (
                saves.map((save) => (
                  <View
                    key={save.id}
                    style={[styles.saveItem, currentSaveId === save.id && styles.saveItemActive]}
                  >
                    <Pressable style={styles.saveItemContent} onPress={() => onLoadSave(save.id)}>
                      <View style={styles.saveNameRow}>
                        {currentSaveId === save.id && (
                            <Icon name="check-circle" size={16} color={theme.colors.primary} style={styles.checkIcon} />
                        )}
                        <Text style={styles.saveName}>{save.name}</Text>
                      </View>
                      <View style={styles.saveDateRow}>
                        <Icon name="schedule" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.saveDate}>{formatDate(save.timestamp)}</Text>
                      </View>
                    </Pressable>
                      <TouchableOpacity style={styles.deleteButton} onPress={() => onDeleteSave(save.id)}>
                        <Icon name="delete" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Bouton de fermeture */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default SaveMenu;
