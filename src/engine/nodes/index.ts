/**
 * Nodes Index - Charge automatiquement toutes les nodes
 * Pour ajouter une nouvelle node, il suffit de créer un nouveau fichier dans ce dossier
 * et de l'importer ici
 */

// ============================================================================
// Node de démonstration complète
// ============================================================================
// Cette node unique démontre TOUTES les fonctionnalités disponibles :
// - Tous les types d'inputs/outputs (string, number, boolean, array, object, any)
// - Validation des inputs avec messages d'erreur détaillés
// - Configuration via defaultSettings
// - Limites : maxInstances (5)
// - Exécution synchrone ET asynchrone
// - Multiples modes de traitement
// - Logging avec context.log()
// - Gestion d'erreurs complète
// ============================================================================

import './DemoNode';

console.log('✅ All nodes loaded (1 demo node with all features)');

// Export de la node pour utilisation directe
export { default as DemoNode } from './DemoNode';
