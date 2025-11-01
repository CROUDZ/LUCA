// styles/styles.ts
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  block: {
    backgroundColor: '#ff4444',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    justifyContent: 'space-around',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    color: '#000',
    fontSize: 14,
    fontWeight: '500',
  },
  anchorButton: {
    padding: 5,
  },
  anchor: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#000',
  },
  anchorSelected: {
    backgroundColor: '#FFD700',
  },
  backAnchorButton: {
    position: 'absolute',
    left: -7,
    top: '50%',
    marginTop: -10,
  },
  toolbar: {
    position: 'absolute',
    top: 40,
    left: 20,
    flexDirection: 'row',
  },
  clearButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  instructions: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 8,
  },
  instructionsText: {
    fontSize: 12,
    color: '#666',
  },
  selectedText: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 5,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: 200,
  },
  modalClose: {
    padding: 10,
    marginTop: 10,
  },
});