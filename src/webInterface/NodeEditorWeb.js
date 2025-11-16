/* global Drawflow, MouseEvent, confirm */

// ============================================
// INITIALISATION
// ============================================

const container = document.getElementById('drawflow');
const editor = new Drawflow(container);
editor.reroute = true;
editor.curvature = 0.5;
editor.force_first_input = false;
editor.editor_mode = 'edit';
editor.start();

// ============================================
// GESTION DU ZOOM ET PAN
// ============================================

const ZOOM = { min: 0.3, max: 3, current: 1 };
const PAN = { x: 0, y: 0 };
const PINCH = { active: false, distance: 0, zoom: 1, centerX: 0, centerY: 0 };
const PANNING = { active: false, startX: 0, startY: 0, initialX: 0, initialY: 0 };

function applyTransform() {
    editor.zoom = ZOOM.current;
    editor.canvas_x = PAN.x;
    editor.canvas_y = PAN.y;
    editor.precanvas.style.transform = `translate(${PAN.x}px, ${PAN.y}px) scale(${ZOOM.current})`;
    editor.precanvas.style.transformOrigin = '0 0';
}

function zoomAt(clientX, clientY, scale) {
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const worldX = (x - PAN.x) / ZOOM.current;
    const worldY = (y - PAN.y) / ZOOM.current;
    
    ZOOM.current = Math.max(ZOOM.min, Math.min(ZOOM.max, scale));
    
    PAN.x = x - worldX * ZOOM.current;
    PAN.y = y - worldY * ZOOM.current;
    
    applyTransform();
}

// eslint-disable-next-line no-unused-vars
function resetZoom() {
    ZOOM.current = 1;
    PAN.x = 0;
    PAN.y = 0;
    applyTransform();
}

function getDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Événements tactiles pour zoom/pan
container.addEventListener('touchstart', (e) => {
    const isOnNode = e.target.closest('.drawflow-node');
    
    if (e.touches.length === 2 && !isOnNode) {
        PANNING.active = false;
        PINCH.active = true;
        PINCH.distance = getDistance(e.touches[0], e.touches[1]);
        PINCH.zoom = ZOOM.current;
        PINCH.centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        PINCH.centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        e.preventDefault();
    } else if (e.touches.length === 1 && !isOnNode && !PINCH.active) {
        PANNING.active = true;
        PANNING.startX = e.touches[0].clientX;
        PANNING.startY = e.touches[0].clientY;
        PANNING.initialX = PAN.x;
        PANNING.initialY = PAN.y;
        e.preventDefault();
    }
}, { passive: false });

container.addEventListener('touchmove', (e) => {
    if (PINCH.active && e.touches.length === 2) {
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = (currentDistance / PINCH.distance) * PINCH.zoom;
        
        const currentCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const currentCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        
        zoomAt(PINCH.centerX, PINCH.centerY, scale);
        
        PAN.x += currentCenterX - PINCH.centerX;
        PAN.y += currentCenterY - PINCH.centerY;
        PINCH.centerX = currentCenterX;
        PINCH.centerY = currentCenterY;
        
        applyTransform();
        e.preventDefault();
    } else if (PANNING.active && e.touches.length === 1 && !e.target.closest('.drawflow-node')) {
        const dx = e.touches[0].clientX - PANNING.startX;
        const dy = e.touches[0].clientY - PANNING.startY;
        
        PAN.x = PANNING.initialX + dx;
        PAN.y = PANNING.initialY + dy;
        
        applyTransform();
        e.preventDefault();
    }
}, { passive: false });

container.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) PINCH.active = false;
    if (e.touches.length === 0) PANNING.active = false;
}, { passive: false });

container.addEventListener('touchcancel', () => {
    PINCH.active = false;
    PANNING.active = false;
}, { passive: false });

// ============================================
// GESTION DES NŒUDS
// ============================================

const NODE_DRAG = { active: false, node: null, startX: 0, startY: 0, nodeX: 0, nodeY: 0 };
const CONNECTION = { active: null, reconnecting: false, source: null, output: null, original: null };
const TAP = { time: 0, node: null, delay: 300 };
const LONG_PRESS = { timer: null, delay: 400 };

function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
}

function simulateMouseEvent(type, touch, target = document) {
    const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    target.dispatchEvent(event);
}

function removeConnection(sourceNodeId, targetNodeId, outputName, inputName) {
    try {
        editor.removeSingleConnection(sourceNodeId, parseInt(targetNodeId, 10), outputName, inputName);
        analyzeGraph();
        updateConnectedInputs();
    } catch (err) {
        console.error('Error removing connection:', err);
    }
}

function restoreConnection() {
    if (!CONNECTION.original) return;
    
    setTimeout(() => {
        try {
            editor.addConnection(
                parseInt(CONNECTION.original.sourceNodeId, 10),
                parseInt(CONNECTION.original.nodeId, 10),
                CONNECTION.original.sourceOutputName,
                CONNECTION.original.inputName
            );
            analyzeGraph();
            updateConnectedInputs();
        } catch (err) {
            console.error('Error restoring connection:', err);
        }
    }, 50);
}

function startReconnection(nodeId, inputName, connection) {
    const sourceNodeId = connection.node;
    const sourceOutputName = connection.input;
    
    removeConnection(sourceNodeId, nodeId, sourceOutputName, inputName);
    
    CONNECTION.reconnecting = true;
    CONNECTION.source = document.getElementById('node-' + sourceNodeId);
    CONNECTION.output = CONNECTION.source?.querySelector('.' + sourceOutputName);
    CONNECTION.original = { nodeId, inputName, sourceNodeId: String(sourceNodeId), sourceOutputName };
    
    if (CONNECTION.output) {
        document.body.classList.add('creating-connection');
        CONNECTION.output.classList.add('connection-active');
        CONNECTION.active = CONNECTION.output;
        
        const rect = CONNECTION.output.getBoundingClientRect();
        simulateMouseEvent('mousedown', {
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
        }, CONNECTION.output);
        
        vibrate([40, 30, 40]);
    }
}

document.addEventListener('touchstart', (e) => {
    const node = e.target.closest('.drawflow-node');
    const input = e.target.closest('.input');
    const output = e.target.closest('.output');
    
    // Long press sur input connecté
    if (input && node) {
        const nodeId = node.id.replace('node-', '');
        const nodeData = editor.drawflow.drawflow.Home.data[nodeId];
        
        const inputName = Array.from(input.classList).find(c => c.startsWith('input_')) || 'input_1';
        const hasConnection = nodeData.inputs?.[inputName]?.connections?.length > 0;
        
        if (hasConnection) {
            LONG_PRESS.timer = setTimeout(() => {
                const connection = nodeData.inputs[inputName].connections[0];
                startReconnection(nodeId, inputName, connection);
            }, LONG_PRESS.delay);
        }
    }
    
    // Touch sur output
    if (output) {
        document.body.classList.add('creating-connection');
        output.classList.add('connection-active');
        CONNECTION.active = output;
        vibrate(40);
        return;
    }
    
    // Double-tap pour supprimer
    if (node && !input && !output) {
        const now = Date.now();
        const nodeId = node.id.replace('node-', '');
        
        if (TAP.node === nodeId && now - TAP.time < TAP.delay) {
            // eslint-disable-next-line no-alert
            if (confirm('Supprimer ce nœud ?')) {
                editor.removeNodeId('node-' + nodeId);
                analyzeGraph();
            }
            TAP.node = null;
            TAP.time = 0;
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        TAP.node = nodeId;
        TAP.time = now;
    }
    
    // Déplacement de nœud
    if (node && !input && !output) {
        NODE_DRAG.active = true;
        NODE_DRAG.node = node;
        NODE_DRAG.node.classList.add('dragging');
        
        NODE_DRAG.startX = e.touches[0].clientX;
        NODE_DRAG.startY = e.touches[0].clientY;
        
        const nodeId = node.id.replace('node-', '');
        const data = editor.drawflow.drawflow.Home.data[nodeId];
        if (data) {
            NODE_DRAG.nodeX = data.pos_x;
            NODE_DRAG.nodeY = data.pos_y;
        }
        
        e.preventDefault();
        e.stopPropagation();
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (LONG_PRESS.timer) {
        clearTimeout(LONG_PRESS.timer);
        LONG_PRESS.timer = null;
    }
    
    if (CONNECTION.reconnecting && e.touches.length > 0) {
        simulateMouseEvent('mousemove', e.touches[0]);
        e.preventDefault();
        return;
    }
    
    if (NODE_DRAG.active && NODE_DRAG.node) {
        const dx = (e.touches[0].clientX - NODE_DRAG.startX) / ZOOM.current;
        const dy = (e.touches[0].clientY - NODE_DRAG.startY) / ZOOM.current;
        
        const newX = NODE_DRAG.nodeX + dx;
        const newY = NODE_DRAG.nodeY + dy;
        
        NODE_DRAG.node.style.left = newX + 'px';
        NODE_DRAG.node.style.top = newY + 'px';
        
        const nodeId = NODE_DRAG.node.id.replace('node-', '');
        const data = editor.drawflow.drawflow.Home.data[nodeId];
        if (data) {
            data.pos_x = newX;
            data.pos_y = newY;
            editor.updateConnectionNodes('node-' + nodeId);
        }
        
        e.preventDefault();
        e.stopPropagation();
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (LONG_PRESS.timer) {
        clearTimeout(LONG_PRESS.timer);
        LONG_PRESS.timer = null;
    }
    
    if (CONNECTION.reconnecting && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        simulateMouseEvent('mouseup', touch);
        
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetInput = element?.closest('.input');
        const targetNode = element?.closest('.drawflow-node');
        
        if (targetInput && targetNode) {
            vibrate(30);
        } else {
            restoreConnection();
        }
        
        document.body.classList.remove('creating-connection');
        if (CONNECTION.active) CONNECTION.active.classList.remove('connection-active');
        
        CONNECTION.active = null;
        CONNECTION.reconnecting = false;
        CONNECTION.source = null;
        CONNECTION.output = null;
        CONNECTION.original = null;
        
        setTimeout(() => {
            analyzeGraph();
            updateConnectedInputs();
        }, 100);
        
        e.preventDefault();
        return;
    }
    
    if (CONNECTION.active) {
        document.body.classList.remove('creating-connection');
        CONNECTION.active.classList.remove('connection-active');
        
        const target = e.changedTouches[0];
        if (target) {
            const element = document.elementFromPoint(target.clientX, target.clientY);
            if (element?.closest('.input')) vibrate(30);
        }
        
        CONNECTION.active = null;
    }
    
    if (NODE_DRAG.active && NODE_DRAG.node) {
        NODE_DRAG.node.classList.remove('dragging');
        NODE_DRAG.active = false;
        NODE_DRAG.node = null;
        e.preventDefault();
        e.stopPropagation();
    }
}, { passive: false });

document.addEventListener('touchcancel', () => {
    if (LONG_PRESS.timer) {
        clearTimeout(LONG_PRESS.timer);
        LONG_PRESS.timer = null;
    }
    
    if (CONNECTION.reconnecting) restoreConnection();
    
    if (CONNECTION.active) {
        document.body.classList.remove('creating-connection');
        CONNECTION.active.classList.remove('connection-active');
        CONNECTION.active = null;
    }
    
    CONNECTION.reconnecting = false;
    CONNECTION.source = null;
    CONNECTION.output = null;
    CONNECTION.original = null;
    
    if (NODE_DRAG.active && NODE_DRAG.node) {
        NODE_DRAG.node.classList.remove('dragging');
        NODE_DRAG.active = false;
        NODE_DRAG.node = null;
    }
}, { passive: false });

// ============================================
// ANALYSE DU GRAPHE
// ============================================

function analyzeGraph() {
    const data = editor.drawflow.drawflow.Home.data;
    const nodeIds = Object.keys(data);
    
    // Reset classes
    nodeIds.forEach(id => {
        const node = document.getElementById('node-' + id);
        node?.classList.remove('node-start', 'node-end', 'node-connected', 'node-disconnected');
    });
    
    if (nodeIds.length === 0) return;
    
    // Build graph
    const graph = {};
    const reverseGraph = {};
    nodeIds.forEach(id => {
        graph[id] = [];
        reverseGraph[id] = [];
    });
    
    nodeIds.forEach(id => {
        const node = data[id];
        Object.values(node.outputs || {}).forEach(output => {
            (output.connections || []).forEach(conn => {
                const targetId = String(conn.node);
                graph[id].push(targetId);
                reverseGraph[targetId].push(id);
            });
        });
    });
    
    const startNodes = nodeIds.filter(id => reverseGraph[id].length === 0);
    const endNodes = nodeIds.filter(id => graph[id].length === 0);
    
    // Detect cycles
    const visited = new Set();
    const recStack = new Set();
    
    function detectCycle(nodeId) {
        visited.add(nodeId);
        recStack.add(nodeId);
        
        for (const neighbor of graph[nodeId]) {
            if (!visited.has(neighbor)) {
                if (detectCycle(neighbor)) return true;
            } else if (recStack.has(neighbor)) {
                return true;
            }
        }
        
        recStack.delete(nodeId);
        return false;
    }
    
    const hasCycle = nodeIds.some(id => !visited.has(id) && detectCycle(id));
    
    if (hasCycle) {
        const allConnected = new Set(nodeIds.filter(id => 
            graph[id].length > 0 || reverseGraph[id].length > 0
        ));
        
        allConnected.forEach(id => {
            document.getElementById('node-' + id)?.classList.add('node-connected');
        });
        
        nodeIds.forEach(id => {
            if (!allConnected.has(id)) {
                document.getElementById('node-' + id)?.classList.add('node-disconnected');
            }
        });
        
        return;
    }
    
    // Find largest connected chain
    function getConnectedChain(startId) {
        const chain = new Set();
        const queue = [startId];
        
        while (queue.length > 0) {
            const current = queue.shift();
            if (chain.has(current)) continue;
            chain.add(current);
            
            graph[current].forEach(next => !chain.has(next) && queue.push(next));
            reverseGraph[current].forEach(prev => !chain.has(prev) && queue.push(prev));
        }
        
        return chain;
    }
    
    let largestChain = new Set();
    startNodes.forEach(startId => {
        const chain = getConnectedChain(startId);
        if (chain.size > largestChain.size) largestChain = chain;
    });
    
    if (largestChain.size === 0 && nodeIds.length > 0) {
        largestChain = getConnectedChain(nodeIds[0]);
    }
    
    // Apply colors
    startNodes.forEach(id => {
        if (largestChain.has(id)) {
            document.getElementById('node-' + id)?.classList.add('node-start');
        }
    });
    
    endNodes.forEach(id => {
        if (largestChain.has(id)) {
            document.getElementById('node-' + id)?.classList.add('node-end');
        }
    });
    
    largestChain.forEach(id => {
        const node = document.getElementById('node-' + id);
        if (node && !node.classList.contains('node-start') && !node.classList.contains('node-end')) {
            node.classList.add('node-connected');
        }
    });
    
    nodeIds.forEach(id => {
        if (!largestChain.has(id)) {
            document.getElementById('node-' + id)?.classList.add('node-disconnected');
        }
    });
}

function updateConnectedInputs() {
    const data = editor.drawflow.drawflow.Home.data;
    
    document.querySelectorAll('.input').forEach(input => input.classList.remove('connected'));
    
    Object.keys(data).forEach(nodeId => {
        const node = data[nodeId];
        const nodeElement = document.getElementById('node-' + nodeId);
        
        if (node.inputs && nodeElement) {
            Object.keys(node.inputs).forEach(inputName => {
                const input = node.inputs[inputName];
                if (input.connections?.length > 0) {
                    nodeElement.querySelector('.' + inputName)?.classList.add('connected');
                }
            });
        }
    });
}

// Listen to graph changes
['nodeCreated', 'nodeRemoved', 'connectionCreated', 'connectionRemoved'].forEach(event => {
    editor.on(event, () => setTimeout(() => {
        analyzeGraph();
        updateConnectedInputs();
        // Auto-export après chaque changement
        exportGraph();
    }, 100));
});

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
    
    const x = Math.random() * 300 + 100;
    const y = Math.random() * 200 + 100;
    
    editor.addNode(tmpl.name, tmpl.inputs, tmpl.outputs, x, y, tmpl.class, tmpl.data, tmpl.html);
}

function exportGraph() {
    const data = editor.export();
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

if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'READY',
        payload: { timestamp: Date.now() }
    }));
}