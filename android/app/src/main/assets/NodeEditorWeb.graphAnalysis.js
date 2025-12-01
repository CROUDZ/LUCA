// ANALYSE DU GRAPHE (désactivée par défaut sur mobile)

window.DrawflowEditor = window.DrawflowEditor || {};

const GRAPH_ANALYSIS_DISABLED = typeof window !== 'undefined'
    ? (!!window.ReactNativeWebView && !window.__ENABLE_GRAPH_ANALYTICS__)
    : false;

function analyzeGraphImpl() {
    const data = window.DrawflowEditor.editor.drawflow.drawflow.Home.data;
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

    window.DrawflowEditor.refreshFlashlightStatus?.();
}

function updateConnectedInputsImpl() {
    const data = window.DrawflowEditor.editor.drawflow.drawflow.Home.data;
    
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

    window.DrawflowEditor.refreshFlashlightStatus?.();
}

if (GRAPH_ANALYSIS_DISABLED) {
    window.DrawflowEditor.analyzeGraph = () => {};
    window.DrawflowEditor.updateConnectedInputs = () => {};
    window.DrawflowEditor.isGraphAnalysisDisabled = true;
} else {
    window.DrawflowEditor.analyzeGraph = analyzeGraphImpl;
    window.DrawflowEditor.updateConnectedInputs = updateConnectedInputsImpl;
}

const EVENTS_TO_EXPORT = ['nodeCreated', 'nodeRemoved', 'connectionCreated', 'connectionRemoved'];

function bindGraphExportListeners(editor) {
    if (!editor || typeof editor.on !== 'function') {
        return false;
    }

    if (window.DrawflowEditor.__graphExportListenersAttached) {
        return true;
    }

    EVENTS_TO_EXPORT.forEach((event) => {
        editor.on(event, () => {
            setTimeout(() => {
                if (!GRAPH_ANALYSIS_DISABLED) {
                    window.DrawflowEditor.analyzeGraph();
                    window.DrawflowEditor.updateConnectedInputs();
                    window.DrawflowEditor.refreshFlashlightStatus?.();
                }
                window.DrawflowEditor.exportGraph?.();
            }, 100);
        });
    });

    window.DrawflowEditor.__graphExportListenersAttached = true;
    return true;
}

function ensureGraphExportListeners(attempt = 0) {
    const editor = window.DrawflowEditor?.editor;
    if (bindGraphExportListeners(editor)) {
        return;
    }

    if (attempt > 20) {
        console.warn('[NodeEditorWeb] Impossible de lier les événements Drawflow - export automatique désactivé');
        return;
    }

    setTimeout(() => ensureGraphExportListeners(attempt + 1), 150);
}

ensureGraphExportListeners();
