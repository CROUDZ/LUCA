/* global Drawflow */
// INITIALISATION

// Debug logging conditionnel (désactivé en production)
const DEBUG = false;
function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

const container = document.getElementById('drawflow');
const editor = new Drawflow(container);
editor.reroute = true;
editor.curvature = 0.5;
editor.force_first_input = false;
editor.editor_mode = 'edit';
editor.start();

// Theme management
function setTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light-theme');
    root.classList.remove('dark-theme');
  } else {
    root.classList.remove('light-theme');
    root.classList.add('dark-theme');
  }
  // Exposer l'état du thème pour faciliter le debug et informer RN
  try {
    root.setAttribute('data-luca-theme', theme);
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'THEME_APPLIED', payload: { theme } })
      );
    }
  } catch (e) {
    // ignore
  }
  debugLog('Theme set to:', theme);
}

// Expose to global scope for other modules
window.DrawflowEditor = window.DrawflowEditor || {};
window.DrawflowEditor.editor = editor;
window.DrawflowEditor.container = container;
window.DrawflowEditor.debugLog = debugLog;
window.DrawflowEditor.setTheme = setTheme;
