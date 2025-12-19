/**
 * NodeEditorWeb.js - Shim de compatibilité
 *
 * Ce fichier est conservé uniquement pour la compatibilité avec les anciennes références.
 * Le code actif est divisé en modules :
 * - NodeEditorWeb.init.js : Initialisation de Drawflow
 * - NodeEditorWeb.transform.js : Gestion pan/zoom
 * - NodeEditorWeb.utils.js : Utilitaires et templates de nœuds
 * - NodeEditorWeb.graphAnalysis.js : Analyse du graphe
 * - NodeEditorWeb.touchNodes.js : Gestion tactile des nœuds
 * - NodeEditorWeb.controls.js : Contrôles UI
 * - NodeEditorWeb.messaging.js : Communication React Native
 * - NodeEditorWeb.main.js : Point d'entrée
 */

(function () {
  'use strict';

  // Initialiser le namespace global
  if (typeof window !== 'undefined') {
    window.DrawflowEditor = window.DrawflowEditor || {};
  }
})();
