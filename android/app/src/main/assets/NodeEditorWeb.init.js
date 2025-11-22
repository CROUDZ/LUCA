/* global Drawflow */
// INITIALISATION

const container = document.getElementById('drawflow');
const editor = new Drawflow(container);
editor.reroute = true;
editor.curvature = 0.5;
editor.force_first_input = false;
editor.editor_mode = 'edit';
editor.start();

// Expose to global scope for other modules
window.DrawflowEditor = window.DrawflowEditor || {};
window.DrawflowEditor.editor = editor;
window.DrawflowEditor.container = container;
