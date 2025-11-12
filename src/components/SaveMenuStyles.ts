import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f9fafb',
  },
  newSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  newSaveIcon: {
    marginRight: 4,
  },
  newSaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  newSaveInputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f9fafb',
    fontSize: 16,
    marginBottom: 8,
  },
  inputButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  inputButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  inputButtonCancel: {
    backgroundColor: '#6b7280',
  },
  inputButtonConfirm: {
    backgroundColor: '#10b981',
  },
  inputButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  savesList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 20,
  },
  saveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  saveItemActive: {
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  saveItemContent: {
    flex: 1,
    padding: 12,
  },
  saveNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  checkIcon: {
    marginRight: 4,
  },
  saveName: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
  },
  saveDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveDate: {
    color: '#9ca3af',
    fontSize: 12,
  },
  deleteButton: {
    padding: 12,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    color: '#ef4444',
    fontSize: 20,
  },
  closeButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default styles;
