/* Deprecated monolithic NodeEditorWeb.js
 * This file is intentionally minimal to avoid older code executing. Use the modular files instead:
 * NodeEditorWeb.init.js, NodeEditorWeb.transform.js, NodeEditorWeb.utils.js, NodeEditorWeb.graphAnalysis.js,
 * NodeEditorWeb.touchNodes.js, NodeEditorWeb.controls.js, NodeEditorWeb.messaging.js, NodeEditorWeb.main.js
 *
 * This file is kept as a backward-compatible shim only to avoid older build references from failing.
 */

(function () {
    if (typeof console !== 'undefined' && console.warn) {
        console.warn(
            'Deprecated file NodeEditorWeb.js present. Use NodeEditorWeb.* modular scripts instead.'
        );
    }

    // Keep a small, safe namespace for callers that may introspect a global.
    if (typeof window !== 'undefined') {
        window.DrawflowEditor = window.DrawflowEditor || {};
        window.DrawflowEditor.deprecated = true;
    }
    /* LEGACY CODE REMOVED */
})();

/* EOF */


// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Crée un template de nœud dynamique basé sur les données fournies
 * @param {string} type - Type du nœud
 * @param {Object} nodeData - Données du nœud (optionnel)
 * @returns {Object} Template complet du nœud
 */
function createNodeTemplate(type, nodeData = {}) {
    // Valeurs par défaut
    const defaults = {
        name: type,
        inputs: 1,
        outputs: 1,
        icon: '📦',
        description: 'Node',
        data: { type }
    };
    
    // Merge avec les données fournies
    const template = {
        name: nodeData.name || defaults.name,
        inputs: nodeData.inputs !== undefined ? nodeData.inputs : defaults.inputs,
        outputs: nodeData.outputs !== undefined ? nodeData.outputs : defaults.outputs,
        class: nodeData.class || `${type}-node`,
        data: nodeData.data || defaults.data,
        html: nodeData.html || `<div class="title"><span class="node-icon">${nodeData.icon || defaults.icon}</span> ${nodeData.name || defaults.name}</div><div class="content">${nodeData.description || defaults.description}</div>`
    };
    
    return template;
}

function addNode(type, nodeData) {
    const tmpl = createNodeTemplate(type, nodeData);
    // Place node at center of visible drawflow area if possible
    let x;
    let y;
    try {
        const container = window.DrawflowEditor.container;
        const PAN = window.DrawflowEditor.PAN || { x: 0, y: 0 };
        const ZOOM = window.DrawflowEditor.ZOOM || { current: 1 };
        if (container && typeof PAN.x === 'number' && typeof ZOOM.current === 'number') {
            const rect = container.getBoundingClientRect();
            const centerClientX = rect.left + rect.width / 2;
            const centerClientY = rect.top + rect.height / 2;
            x = (centerClientX - PAN.x) / ZOOM.current;
            y = (centerClientY - PAN.y) / ZOOM.current;
        }
    } catch (err) {
        x = undefined;
        y = undefined;
    }

    if (typeof x !== 'number' || typeof y !== 'number' || Number.isNaN(x) || Number.isNaN(y)) {
        x = Math.random() * 300 + 100;
        y = Math.random() * 200 + 100;
    }

    const beforeIds = Object.keys(editor.drawflow?.drawflow?.Home?.data || {});
    editor.addNode(tmpl.name, tmpl.inputs, tmpl.outputs, x, y, tmpl.class, tmpl.data, tmpl.html);
    setTimeout(() => {
        try {
            const afterIds = Object.keys(editor.drawflow?.drawflow?.Home?.data || {});
            const newId = afterIds.find(id => beforeIds.indexOf(id) === -1);
            if (!newId) return;
            const nodeEl = document.getElementById('node-' + newId);
            if (!nodeEl) return;
            const nodeWidth = nodeEl.offsetWidth || 0;
            const nodeHeight = nodeEl.offsetHeight || 0;
            const data = editor.drawflow.drawflow.Home.data[newId];
            if (!data) return;
            const halfW = Math.round(nodeWidth / 2);
            const halfH = Math.round(nodeHeight / 2);
            data.pos_x = Math.round((data.pos_x || 0) - halfW);
            data.pos_y = Math.round((data.pos_y || 0) - halfH);
            nodeEl.style.left = data.pos_x + 'px';
            nodeEl.style.top = data.pos_y + 'px';
            editor.updateConnectionNodes('node-' + newId);
        } catch (err) {
            // ignore
        }
    }, 10);
}

function exportGraph() {
    const data = editor.export();
    // Debug: log the node settings for condition nodes to help trace invertSignal propagation
    try {
        const nodes = data.drawflow?.Home?.data || {};
        Object.keys(nodes).forEach(id => {
            const n = nodes[id];
            if ((n.class || '').includes('condition-node') || (n.class || '').includes('condition')) {
                console.log('[Web EXPORT] Node', id, 'settings=', n.data?.settings || n.data || {});
            }
        });
    } catch (err) {
        console.error('[Web EXPORT] Failed to parse nodes for debug', err);
    }
    if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'EXPORT',
            payload: data
        }));
    }
}

function clearGraph() {
    editor.clear();
    setTimeout(analyzeGraph, 100);
}

// ============================================
// COMMUNICATION REACT NATIVE
// ============================================

function setupMessageListener() {
    const handler = (event) => {
        try {
            const msg = JSON.parse(event.data);
            switch(msg.type) {
                case 'LOAD_GRAPH':
                    if (msg.payload?.drawflow) {
                        editor.import(msg.payload);
                        setTimeout(() => {
                            analyzeGraph();
                            updateConnectedInputs();
                        }, 200);
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'IMPORTED',
                                payload: { success: true }
                            }));
                        }
                    }
                    break;
                case 'ADD_NODE':
                    addNode(msg.payload.nodeType || 'texture', msg.payload.nodeData);
                    break;
                case 'CLEAR':
                    clearGraph();
                    break;
                case 'REQUEST_EXPORT':
                    exportGraph();
                    break;
            }
        } catch (e) {
            console.error('Message error:', e);
        }
    };
    
    document.addEventListener('message', handler);
    window.addEventListener('message', handler);
}

setupMessageListener();

// End of deprecated shim.