import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  fabButton: {
    position: 'absolute',
    bottom: 15,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 2000,
  },
  fabButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  nodePickerContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    backgroundColor: '#1a1d29',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    elevation: 10,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f9fafb',
  },
  nodePickerSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
  },
  nodeTypesList: {
    maxHeight: 350,
  },
  nodeTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    gap: 12,
  },
  nodeTypeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeTypeInfo: {
    flex: 1,
  },
  nodeTypeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 2,
  },
  nodeTypeDescription: {
    fontSize: 12,
    color: '#9ca3af',
  },
  closePickerButton: {
    marginTop: 16,
    padding: 14,
    backgroundColor: 'rgba(75, 85, 99, 0.6)',
    borderRadius: 12,
    alignItems: 'center',
  },
  closePickerButtonText: {
    color: '#f9fafb',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default styles;