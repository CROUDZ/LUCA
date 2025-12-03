/* global MouseEvent, confirm */
// GESTION DES NŒUDS

const NODE_DRAG = { active: false, node: null, startX: 0, startY: 0, nodeX: 0, nodeY: 0 };
const CONNECTION = { active: null, reconnecting: false, source: null, output: null, original: null, fromInput: false, tempLine: null, startPos: null };
const TAP = { time: 0, node: null, delay: 300 };
const LONG_PRESS = { timer: null, delay: 400 };
const LONG_PRESS_NODE = { timer: null, delay: 800, node: null, startX: 0, startY: 0 };

function shouldIgnoreForPinch(event) {
    if (!event) return false;
    const touches = event.touches || [];
    if (touches.length > 1) return true;
    if (window.DrawflowEditor?.PINCH?.active) return true;
    return false;
}

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

/**
 * Crée une ligne SVG temporaire pour visualiser la connexion en cours de création
 * @param {number} x1 - Position X de départ
 * @param {number} y1 - Position Y de départ
 * @returns {SVGElement} - L'élément SVG créé
 */
function createTempConnectionLine(x1, y1) {
    // Trouver ou créer le conteneur SVG
    let svg = document.querySelector('#drawflow svg.temp-connection-svg');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('temp-connection-svg');
        svg.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; overflow: visible;';
        document.getElementById('drawflow').appendChild(svg);
    }
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('temp-connection-path');
    path.style.cssText = 'fill: none; stroke-width: 5px; stroke: rgba(var(--editor-brand-soft-rgb, 147, 130, 255), 0.85); stroke-linecap: round; filter: drop-shadow(0 0 6px rgba(var(--editor-brand-soft-rgb, 147, 130, 255), 0.45));';
    path.setAttribute('d', `M ${x1} ${y1} L ${x1} ${y1}`);
    svg.appendChild(path);
    
    return path;
}

/**
 * Met à jour la ligne temporaire de connexion
 * @param {SVGElement} path - L'élément path SVG
 * @param {number} x1 - Position X de départ
 * @param {number} y1 - Position Y de départ
 * @param {number} x2 - Position X de fin
 * @param {number} y2 - Position Y de fin
 */
function updateTempConnectionLine(path, x1, y1, x2, y2) {
    if (!path) return;
    
    // Créer une courbe de Bézier similaire à Drawflow
    const curvature = 0.5;
    const hx1 = x1 + Math.abs(x2 - x1) * curvature;
    const hx2 = x2 - Math.abs(x2 - x1) * curvature;
    
    path.setAttribute('d', `M ${x1} ${y1} C ${hx1} ${y1} ${hx2} ${y2} ${x2} ${y2}`);
}

/**
 * Supprime la ligne temporaire de connexion
 */
function removeTempConnectionLine() {
    if (CONNECTION.tempLine) {
        CONNECTION.tempLine.remove();
        CONNECTION.tempLine = null;
    }
    CONNECTION.startPos = null;
}

function removeConnection(sourceNodeId, targetNodeId, outputName, inputName) {
    try {
        window.DrawflowEditor.editor.removeSingleConnection(sourceNodeId, parseInt(targetNodeId, 10), outputName, inputName);
        window.DrawflowEditor.analyzeGraph();
        window.DrawflowEditor.updateConnectedInputs();
    } catch (err) {
        console.error('Error removing connection:', err);
    }
}

// Duplicate convenience function for external code/tests
function duplicateNode(nodeId) {
    const data = window.DrawflowEditor.editor?.drawflow?.drawflow?.Home?.data?.[nodeId];
    if (!data) return null;
    const name = data.name || (data.data && data.data.type) || 'node';
    const inputsCount = Object.keys(data.inputs || {}).length || 0;
    const outputsCount = Object.keys(data.outputs || {}).length || 0;
    const newX = (data.pos_x || 0) + 40;
    const newY = (data.pos_y || 0) + 40;
    const klass = data.class || '';
    const nodeData = data.data || {};
    const html = data.html || '';
    window.DrawflowEditor.editor.addNode(name, inputsCount, outputsCount, newX, newY, klass, nodeData, html);
    setTimeout(() => {
        window.DrawflowEditor.analyzeGraph();
    }, 10);
    return true;
}

function restoreConnection() {
    if (!CONNECTION.original) return;
    
    setTimeout(() => {
        try {
            window.DrawflowEditor.editor.addConnection(
                parseInt(CONNECTION.original.sourceNodeId, 10),
                parseInt(CONNECTION.original.nodeId, 10),
                CONNECTION.original.sourceOutputName,
                CONNECTION.original.inputName
            );
            window.DrawflowEditor.analyzeGraph();
            window.DrawflowEditor.updateConnectedInputs();
        } catch (err) {
            console.error('Error restoring connection:', err);
        }
    }, 50);
}

/**
 * Trouve le premier input disponible (non connecté) d'un nœud
 * @param {string} nodeId - ID du nœud
 * @returns {string|null} - Nom de l'input disponible ou null
 */
function findFirstAvailableInput(nodeId) {
    const nodeData = window.DrawflowEditor.editor?.drawflow?.drawflow?.Home?.data?.[nodeId];
    if (!nodeData || !nodeData.inputs) return null;
    
    const inputKeys = Object.keys(nodeData.inputs).sort();
    for (const inputName of inputKeys) {
        const connections = nodeData.inputs[inputName]?.connections || [];
        if (connections.length === 0) {
            return inputName;
        }
    }
    // Si tous les inputs sont connectés, retourner le premier input quand même
    return inputKeys.length > 0 ? inputKeys[0] : null;
}

/**
 * Trouve le premier output disponible d'un nœud
 * @param {string} nodeId - ID du nœud
 * @returns {string|null} - Nom de l'output disponible ou null
 */
function findFirstAvailableOutput(nodeId) {
    const nodeData = window.DrawflowEditor.editor?.drawflow?.drawflow?.Home?.data?.[nodeId];
    if (!nodeData || !nodeData.outputs) return null;
    
    const outputKeys = Object.keys(nodeData.outputs).sort();
    // Les outputs peuvent avoir plusieurs connexions, donc on retourne simplement le premier
    return outputKeys.length > 0 ? outputKeys[0] : null;
}

/**
 * Connecte automatiquement au premier anchor disponible d'un nœud cible
 * @param {string} sourceNodeId - ID du nœud source
 * @param {string} sourceAnchor - Nom de l'anchor source (output_X ou input_X)
 * @param {string} targetNodeId - ID du nœud cible
 * @param {boolean} fromInput - Si true, la connexion part d'un input (inverse)
 * @returns {boolean} - True si la connexion a réussi
 */
function autoConnectToNode(sourceNodeId, sourceAnchor, targetNodeId, fromInput) {
    try {
        if (fromInput) {
            // Connexion inverse: on part d'un input, on cherche un output sur le nœud cible
            const targetOutput = findFirstAvailableOutput(targetNodeId);
            if (!targetOutput) return false;
            
            window.DrawflowEditor.editor.addConnection(
                parseInt(targetNodeId, 10),
                parseInt(sourceNodeId, 10),
                targetOutput,
                sourceAnchor
            );
        } else {
            // Connexion normale: on part d'un output, on cherche un input sur le nœud cible
            const targetInput = findFirstAvailableInput(targetNodeId);
            if (!targetInput) return false;
            
            window.DrawflowEditor.editor.addConnection(
                parseInt(sourceNodeId, 10),
                parseInt(targetNodeId, 10),
                sourceAnchor,
                targetInput
            );
        }
        
        window.DrawflowEditor.analyzeGraph();
        window.DrawflowEditor.updateConnectedInputs();
        return true;
    } catch (err) {
        console.error('Error auto-connecting to node:', err);
        return false;
    }
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

// const container = window.DrawflowEditor.container; // not used here; keep available in other modules

document.addEventListener('touchstart', (e) => {
    if (shouldIgnoreForPinch(e)) {
        return;
    }
    // Ignorer les événements sur les contrôles interactifs
    if (e.target.closest('.invert-signal-toggle') || 
        e.target.closest('.switch-label') || 
        e.target.closest('.condition-invert-control') ||
        e.target.closest('.delay-control')) {
        return;
    }
    
    const node = e.target.closest('.drawflow-node');
    const input = e.target.closest('.input');
    const output = e.target.closest('.output');
    
    // Long press sur input connecté (pour reconnecter une connexion existante)
    if (input && node) {
        const nodeId = node.id.replace('node-', '');
        const nodeData = window.DrawflowEditor.editor?.drawflow?.drawflow?.Home?.data?.[nodeId] || {};
        
        const inputName = Array.from(input.classList).find(c => c.startsWith('input_')) || 'input_1';
        const hasConnection = nodeData.inputs?.[inputName]?.connections?.length > 0;
        
        if (hasConnection) {
            // Long press pour reconnecter
            LONG_PRESS.timer = setTimeout(() => {
                const connection = nodeData?.inputs?.[inputName]?.connections?.[0];
                startReconnection(nodeId, inputName, connection);
            }, LONG_PRESS.delay);
        } else {
            // Input non connecté: créer une connexion inverse (depuis l'input)
            document.body.classList.add('creating-connection');
            document.body.classList.add('creating-connection-from-input');
            input.classList.add('connection-active');
            CONNECTION.active = input;
            CONNECTION.fromInput = true;
            CONNECTION.sourceNodeId = nodeId;
            CONNECTION.sourceAnchor = inputName;
            vibrate(40);
            
            // Calculer la position de départ dans les coordonnées du drawflow
            const rect = input.getBoundingClientRect();
            const container = document.getElementById('drawflow');
            const containerRect = container.getBoundingClientRect();
            const zoom = window.DrawflowEditor.ZOOM?.current || 1;
            const pan = window.DrawflowEditor.PAN || { x: 0, y: 0 };
            
            // Position du centre de l'input en coordonnées canvas
            const startX = (rect.left + rect.width / 2 - containerRect.left - pan.x) / zoom;
            const startY = (rect.top + rect.height / 2 - containerRect.top - pan.y) / zoom;
            
            CONNECTION.startPos = { x: startX, y: startY };
            CONNECTION.tempLine = createTempConnectionLine(startX, startY);
            
            e.preventDefault();
            return;
        }
    }
    
    // Touch sur output: créer une connexion normale
    if (output && node) {
        const nodeId = node.id.replace('node-', '');
        const outputName = Array.from(output.classList).find(c => c.startsWith('output_')) || 'output_1';
        
        document.body.classList.add('creating-connection');
        output.classList.add('connection-active');
        CONNECTION.active = output;
        CONNECTION.fromInput = false;
        CONNECTION.sourceNodeId = nodeId;
        CONNECTION.sourceAnchor = outputName;
        vibrate(40);
        return;
    }
    
    // Double-tap pour dupliquer
    if (node && !input && !output) {
        const now = Date.now();
        const nodeId = node.id.replace('node-', '');
        
        if (TAP.node === nodeId && now - TAP.time < TAP.delay) {
            // double-tap detected: duplicate node
            duplicateNode(nodeId);
            if (LONG_PRESS_NODE.timer) {
                clearTimeout(LONG_PRESS_NODE.timer);
                LONG_PRESS_NODE.timer = null;
                LONG_PRESS_NODE.node = null;
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
    
    // Setup long-press for node deletion (hold 2s without moving)
    if (node && !input && !output) {
        LONG_PRESS_NODE.startX = e.touches[0].clientX;
        LONG_PRESS_NODE.startY = e.touches[0].clientY;
        LONG_PRESS_NODE.node = node.id.replace('node-', '');
        LONG_PRESS_NODE.timer = setTimeout(() => {
            const nodeId = LONG_PRESS_NODE.node;
            // eslint-disable-next-line no-alert
            if (confirm('Supprimer ce nœud ?')) {
                try {
                    window.DrawflowEditor.editor.removeNodeId('node-' + nodeId);
                    window.DrawflowEditor.analyzeGraph();
                } catch (err) {
                    console.error('Error removing node via long-press:', err);
                }
            }
            LONG_PRESS_NODE.timer = null;
            LONG_PRESS_NODE.node = null;
        }, LONG_PRESS_NODE.delay);
    }

    // Déplacement de nœud
    if (node && !input && !output) {
        NODE_DRAG.active = true;
        NODE_DRAG.node = node;
        NODE_DRAG.node.classList.add('dragging');
        
        NODE_DRAG.startX = e.touches[0].clientX;
        NODE_DRAG.startY = e.touches[0].clientY;
        
        const nodeId = node.id.replace('node-', '');
        const data = window.DrawflowEditor.editor.drawflow.drawflow.Home.data[nodeId];
        if (data) {
            NODE_DRAG.nodeX = data.pos_x;
            NODE_DRAG.nodeY = data.pos_y;
        }
        
        e.preventDefault();
        e.stopPropagation();
    }
}, { passive: false });



document.addEventListener('touchmove', (e) => {
    if (shouldIgnoreForPinch(e)) {
        return;
    }
    if (LONG_PRESS.timer) {
        clearTimeout(LONG_PRESS.timer);
        LONG_PRESS.timer = null;
    }
    // cancel node long press if user moves finger more than a small threshold
    if (LONG_PRESS_NODE.timer && e.touches && e.touches.length) {
        const dx = Math.abs(e.touches[0].clientX - LONG_PRESS_NODE.startX);
        const dy = Math.abs(e.touches[0].clientY - LONG_PRESS_NODE.startY);
        const moved = Math.sqrt(dx * dx + dy * dy) > 5; // 5px threshold
        if (moved) {
            clearTimeout(LONG_PRESS_NODE.timer);
            LONG_PRESS_NODE.timer = null;
            LONG_PRESS_NODE.node = null;
        }
    }
    
    if (CONNECTION.reconnecting && e.touches.length > 0) {
        simulateMouseEvent('mousemove', e.touches[0]);
        e.preventDefault();
        return;
    }
    
    // Gérer le mouvement pendant la création d'une connexion depuis un input (ligne temporaire)
    if (CONNECTION.active && CONNECTION.fromInput && CONNECTION.tempLine && e.touches.length > 0) {
        const touch = e.touches[0];
        const container = document.getElementById('drawflow');
        const containerRect = container.getBoundingClientRect();
        const zoom = window.DrawflowEditor.ZOOM?.current || 1;
        const pan = window.DrawflowEditor.PAN || { x: 0, y: 0 };
        
        // Position actuelle du doigt en coordonnées canvas
        const endX = (touch.clientX - containerRect.left - pan.x) / zoom;
        const endY = (touch.clientY - containerRect.top - pan.y) / zoom;
        
        updateTempConnectionLine(
            CONNECTION.tempLine,
            CONNECTION.startPos.x,
            CONNECTION.startPos.y,
            endX,
            endY
        );
        
        e.preventDefault();
        return;
    }
    
    // Gérer le mouvement pendant la création d'une connexion depuis un output
    if (CONNECTION.active && !CONNECTION.reconnecting && !CONNECTION.fromInput && e.touches.length > 0) {
        simulateMouseEvent('mousemove', e.touches[0]);
        e.preventDefault();
        return;
    }
    
    if (NODE_DRAG.active && NODE_DRAG.node) {
        const dx = (e.touches[0].clientX - NODE_DRAG.startX) / window.DrawflowEditor.ZOOM.current;
        const dy = (e.touches[0].clientY - NODE_DRAG.startY) / window.DrawflowEditor.ZOOM.current;
        
        const newX = NODE_DRAG.nodeX + dx;
        const newY = NODE_DRAG.nodeY + dy;
        
        NODE_DRAG.node.style.left = newX + 'px';
        NODE_DRAG.node.style.top = newY + 'px';
        
        const nodeId = NODE_DRAG.node.id.replace('node-', '');
        const data = window.DrawflowEditor.editor.drawflow.drawflow.Home.data[nodeId];
        if (data) {
            data.pos_x = newX;
            data.pos_y = newY;
            window.DrawflowEditor.editor.updateConnectionNodes('node-' + nodeId);
        }
        
        e.preventDefault();
        e.stopPropagation();
    }
}, { passive: false });


document.addEventListener('touchend', (e) => {
    if (shouldIgnoreForPinch(e)) {
        return;
    }
    if (LONG_PRESS.timer) {
        clearTimeout(LONG_PRESS.timer);
        LONG_PRESS.timer = null;
    }
    if (LONG_PRESS_NODE.timer) {
        clearTimeout(LONG_PRESS_NODE.timer);
        LONG_PRESS_NODE.timer = null;
        LONG_PRESS_NODE.node = null;
    }
    
    if (CONNECTION.reconnecting && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        simulateMouseEvent('mouseup', touch);
        
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetInput = element?.closest('.input');
        const targetNode = element?.closest('.drawflow-node');
        
        if (targetInput && targetNode) {
            vibrate(30);
        } else if (targetNode) {
            // Lâché sur un nœud sans anchor spécifique: connecter au premier input disponible
            const targetNodeId = targetNode.id.replace('node-', '');
            const sourceNodeId = CONNECTION.original?.sourceNodeId;
            const sourceOutputName = CONNECTION.original?.sourceOutputName;
            
            if (sourceNodeId && sourceOutputName && targetNodeId !== sourceNodeId) {
                const connected = autoConnectToNode(sourceNodeId, sourceOutputName, targetNodeId, false);
                if (connected) {
                    vibrate(30);
                } else {
                    restoreConnection();
                }
            } else {
                restoreConnection();
            }
        } else {
            restoreConnection();
        }
        
        document.body.classList.remove('creating-connection');
        document.body.classList.remove('creating-connection-from-input');
        if (CONNECTION.active) CONNECTION.active.classList.remove('connection-active');
        
        CONNECTION.active = null;
        CONNECTION.reconnecting = false;
        CONNECTION.source = null;
        CONNECTION.output = null;
        CONNECTION.original = null;
        CONNECTION.fromInput = false;
        CONNECTION.sourceNodeId = null;
        CONNECTION.sourceAnchor = null;
        
        setTimeout(() => {
            window.DrawflowEditor.analyzeGraph();
            window.DrawflowEditor.updateConnectedInputs();
        }, 100);
        
        e.preventDefault();
        return;
    }
    
    if (CONNECTION.active && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        
        // Supprimer la ligne temporaire si elle existe
        removeTempConnectionLine();
        
        // Ne simuler mouseup que si ce n'est pas une connexion depuis un input
        if (!CONNECTION.fromInput) {
            simulateMouseEvent('mouseup', touch);
        }
        
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetInput = element?.closest('.input');
        const targetOutput = element?.closest('.output');
        const targetNode = element?.closest('.drawflow-node');
        
        let connected = false;
        
        if (CONNECTION.fromInput) {
            // Connexion depuis un input: chercher un output sur le nœud cible
            if (targetOutput && targetNode) {
                // Lâché sur un output spécifique: créer la connexion
                const targetNodeId = targetNode.id.replace('node-', '');
                const targetOutputName = Array.from(targetOutput.classList).find(c => c.startsWith('output_')) || 'output_1';
                const sourceNodeId = CONNECTION.sourceNodeId;
                const sourceAnchor = CONNECTION.sourceAnchor;
                
                if (sourceNodeId && sourceAnchor && targetNodeId !== sourceNodeId) {
                    try {
                        window.DrawflowEditor.editor.addConnection(
                            parseInt(targetNodeId, 10),
                            parseInt(sourceNodeId, 10),
                            targetOutputName,
                            sourceAnchor
                        );
                        window.DrawflowEditor.analyzeGraph();
                        window.DrawflowEditor.updateConnectedInputs();
                        connected = true;
                        vibrate(30);
                    } catch (err) {
                        console.error('Error creating connection from input:', err);
                    }
                }
            } else if (targetNode && !targetInput) {
                // Lâché sur un nœud sans anchor spécifique: connecter au premier output disponible
                const targetNodeId = targetNode.id.replace('node-', '');
                const sourceNodeId = CONNECTION.sourceNodeId;
                const sourceAnchor = CONNECTION.sourceAnchor;
                
                if (sourceNodeId && sourceAnchor && targetNodeId !== sourceNodeId) {
                    connected = autoConnectToNode(sourceNodeId, sourceAnchor, targetNodeId, true);
                    if (connected) {
                        vibrate(30);
                    }
                }
            }
        } else {
            // Connexion depuis un output: chercher un input sur le nœud cible
            if (targetInput && targetNode) {
                // Lâché sur un input spécifique (comportement existant de Drawflow)
                vibrate(30);
                connected = true;
            } else if (targetNode && !targetOutput) {
                // Lâché sur un nœud sans anchor spécifique: connecter au premier input disponible
                const targetNodeId = targetNode.id.replace('node-', '');
                const sourceNodeId = CONNECTION.sourceNodeId;
                const sourceAnchor = CONNECTION.sourceAnchor;
                
                if (sourceNodeId && sourceAnchor && targetNodeId !== sourceNodeId) {
                    connected = autoConnectToNode(sourceNodeId, sourceAnchor, targetNodeId, false);
                    if (connected) {
                        vibrate(30);
                    }
                }
            }
        }
        
        document.body.classList.remove('creating-connection');
        document.body.classList.remove('creating-connection-from-input');
        if (CONNECTION.active) CONNECTION.active.classList.remove('connection-active');
        
        CONNECTION.active = null;
        CONNECTION.fromInput = false;
        CONNECTION.sourceNodeId = null;
        CONNECTION.sourceAnchor = null;
        
        setTimeout(() => {
            window.DrawflowEditor.analyzeGraph();
            window.DrawflowEditor.updateConnectedInputs();
        }, 100);
        
        e.preventDefault();
        return;
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
    if (LONG_PRESS_NODE.timer) {
        clearTimeout(LONG_PRESS_NODE.timer);
        LONG_PRESS_NODE.timer = null;
        LONG_PRESS_NODE.node = null;
    }
    
    if (CONNECTION.reconnecting) restoreConnection();
    
    // Supprimer la ligne temporaire
    removeTempConnectionLine();
    
    if (CONNECTION.active) {
        document.body.classList.remove('creating-connection');
        document.body.classList.remove('creating-connection-from-input');
        CONNECTION.active.classList.remove('connection-active');
        CONNECTION.active = null;
    }
    
    CONNECTION.reconnecting = false;
    CONNECTION.source = null;
    CONNECTION.output = null;
    CONNECTION.original = null;
    CONNECTION.fromInput = false;
    CONNECTION.sourceNodeId = null;
    CONNECTION.sourceAnchor = null;
    
    if (NODE_DRAG.active && NODE_DRAG.node) {
        NODE_DRAG.node.classList.remove('dragging');
        NODE_DRAG.active = false;
        NODE_DRAG.node = null;
    }
}, { passive: false });

// Expose some functions for other modules/tests
window.DrawflowEditor = window.DrawflowEditor || {};
window.DrawflowEditor.removeConnection = removeConnection;
window.DrawflowEditor.restoreConnection = restoreConnection;
window.DrawflowEditor.startReconnection = startReconnection;
window.DrawflowEditor.duplicateNode = duplicateNode;
window.DrawflowEditor.findFirstAvailableInput = findFirstAvailableInput;
window.DrawflowEditor.findFirstAvailableOutput = findFirstAvailableOutput;
window.DrawflowEditor.autoConnectToNode = autoConnectToNode;

// Desktop double-click duplicates the node
document.addEventListener('dblclick', (ev) => {
    const node = ev.target.closest('.drawflow-node');
    if (node && node.id) {
        const nodeId = node.id.replace('node-', '');
        duplicateNode(nodeId);
        ev.preventDefault();
        ev.stopPropagation();
    }
});
