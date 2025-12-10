// COMMUNICATION REACT NATIVE

function setupMessageListener() {
    const handler = (event) => {
        try {
            const msg = JSON.parse(event.data);
            
            // Handle signal visualization messages
            if (msg.type && msg.type.startsWith('SIGNAL_') || msg.type === 'NODE_ACTIVE' || msg.type === 'NODE_INACTIVE') {
                if (window.DrawflowEditor.signalViz) {
                    window.DrawflowEditor.signalViz.handleSignalMessage(msg);
                }
                return;
            }
            
            switch(msg.type) {
                case 'LOAD_GRAPH':
                    if (msg.payload?.drawflow) {
                        window.DrawflowEditor.editor.import(msg.payload);
                        setTimeout(() => {
                            window.DrawflowEditor.analyzeGraph();
                            window.DrawflowEditor.updateConnectedInputs();
                            window.DrawflowEditor.refreshFlashlightStatus?.();
                            // Reset signal visuals when loading a new graph
                            if (window.DrawflowEditor.signalViz) {
                                window.DrawflowEditor.signalViz.resetAllVisuals();
                            }
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
                    window.DrawflowEditor.addNode(msg.payload.nodeType || 'texture', msg.payload.nodeData);
                    break;
                case 'CLEAR':
                    window.DrawflowEditor.clearGraph();
                    // Reset signal visuals when clearing
                    if (window.DrawflowEditor.signalViz) {
                        window.DrawflowEditor.signalViz.resetAllVisuals();
                    }
                    break;
                case 'REQUEST_EXPORT':
                    window.DrawflowEditor.exportGraph();
                    break;
            }
        } catch (e) {
            console.error('Message error:', e);
        }
    };
    
    document.addEventListener('message', handler);
    window.addEventListener('message', handler);
}

// Expose
window.DrawflowEditor = window.DrawflowEditor || {};
window.DrawflowEditor.setupMessageListener = setupMessageListener;
