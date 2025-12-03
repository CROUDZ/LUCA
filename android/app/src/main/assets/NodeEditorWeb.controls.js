// GESTION DU SWITCH INVERT SIGNAL & DELAY

// Empêcher la propagation des événements sur les contrôles interactifs (switch, délai, logique)

function isNodeControlInteraction(target) {
    if (!target) return false;
    return Boolean(
        target.closest('.condition-invert-control') ||
        target.closest('.delay-control')
    );
}

document.addEventListener('click', (e) => {
    if (isNodeControlInteraction(e.target)) {
        e.stopPropagation();
    }
}, true);

document.addEventListener('touchend', (e) => {
    if (isNodeControlInteraction(e.target)) {
        e.stopPropagation();
    }
}, true);

// Gestion du toggle avec click (souris) et touchend (tactile)
function handleInvertToggle(target) {
    if (target.classList.contains('switch-label') || 
        target.classList.contains('switch-slider') || 
        target.classList.contains('switch-text')) {
        
        const control = target.closest('.condition-invert-control');
        if (!control) return false;
        
        const checkbox = control.querySelector('.invert-signal-toggle');
        if (!checkbox) return false;
        
        // Toggle la checkbox
        checkbox.checked = !checkbox.checked;
        
        // Déclencher l'événement change manuellement
        const changeEvent = new Event('change', { bubbles: true });
        checkbox.dispatchEvent(changeEvent);
        
        return true;
    }
    return false;
}

// Gestion pour le clic souris
document.addEventListener('click', (e) => {
    handleInvertToggle(e.target);
}, false);

// Gestion pour le tactile
document.addEventListener('touchend', (e) => {
    if (e.touches.length === 0 && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && handleInvertToggle(target)) {
            e.preventDefault();
        }
    }
}, false);

// Délégation d'événements pour gérer les switches d'inversion de signal

document.addEventListener('change', (e) => {
    if (e.target.classList.contains('invert-signal-toggle')) {
        const node = e.target.closest('.drawflow-node');
        if (!node) return;
        
        const nodeId = node.id.replace('node-', '');
        const nodeData = window.DrawflowEditor.editor.drawflow.drawflow.Home.data[nodeId];
        
        if (nodeData && nodeData.data) {
            // Initialiser settings si nécessaire
            if (!nodeData.data.settings) {
                nodeData.data.settings = {};
            }
            
            // Mettre à jour la valeur
            nodeData.data.settings.invertSignal = e.target.checked;
            
            window.DrawflowEditor.debugLog && window.DrawflowEditor.debugLog(`[InvertSignal] Node ${nodeId}: invertSignal set to ${e.target.checked}`);
            
            // Déclencher l'export automatique
            window.DrawflowEditor.exportGraph();

            // Notifier l'application native (RN) immédiatement sur un changement de settings
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'NODE_SETTING_CHANGED',
                    payload: { nodeId, nodeType: nodeData.data?.type, settings: nodeData.data.settings }
                }));
            }
            
            // Feedback visuel
            if (navigator.vibrate) navigator.vibrate(30);
        }
    }
}, false);

// ============================================
// CONTRÔLE DIRECT DU DÉLAI
// ============================================

function handleDelayInputChange(target, isFinal = false) {
    const node = target.closest('.drawflow-node');
    if (!node) return;

    const nodeId = node.id.replace('node-', '');
    const nodeData = window.DrawflowEditor.editor.drawflow.drawflow.Home.data[nodeId];
    if (!nodeData) return;

    if (!nodeData.data) nodeData.data = {};
    if (!nodeData.data.settings) nodeData.data.settings = {};

    const seconds = window.DrawflowEditor.parseSecondsValue(target.value);
    const delayMs = Math.round(seconds * 1000);
    // Only overwrite the input's value when the change is final (change event or blur),
    // so the user can type freely without the input jumping back to 0 during typing.
    if (isFinal) {
        target.value = window.DrawflowEditor.normalizeSecondsInput(delayMs / 1000);
    }

    const subtitle = node.querySelector('.node-subtitle');
    if (subtitle) {
        subtitle.textContent = window.DrawflowEditor.formatDelayLabel(delayMs);
    }

    nodeData.data.settings.delayMs = delayMs;
    nodeData.data.settings.useVariableDelay = false;

    window.DrawflowEditor.exportGraph();

    if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'NODE_SETTING_CHANGED',
            payload: { nodeId, nodeType: nodeData.data?.type, settings: nodeData.data.settings }
        }));
    }

    if (navigator.vibrate) navigator.vibrate(15);
}

['input', 'change'].forEach((eventName) => {
    document.addEventListener(eventName, (e) => {
        if (e.target.classList.contains('delay-input')) {
            e.stopPropagation();
            handleDelayInputChange(e.target, eventName === 'change');
        }
    }, true);
});

// Expose helper for tests/tools
window.DrawflowEditor = window.DrawflowEditor || {};
window.DrawflowEditor.handleDelayInputChange = handleDelayInputChange;
window.DrawflowEditor.handleInvertToggle = handleInvertToggle;

// ============================================
// LOGIC GATE CONTROL
// ============================================

function handleLogicGateSelectChange(target) {
    const node = target.closest('.drawflow-node');
    if (!node) return;

    const nodeId = node.id.replace('node-', '');
    const editor = window.DrawflowEditor?.editor;
    const nodeData = editor?.drawflow?.drawflow?.Home?.data?.[nodeId];
    if (!nodeData) return;

    if (!nodeData.data) nodeData.data = {};
    if (!nodeData.data.settings) nodeData.data.settings = {};

    const rawValue = (target.value || '').toString().toUpperCase();
    nodeData.data.settings.gateType = rawValue;

    const selectedOption = target.options && target.options[target.selectedIndex];
    const label = (selectedOption && selectedOption.textContent) ? selectedOption.textContent.trim() : rawValue;

    const subtitle = node.querySelector('.node-subtitle');
    if (subtitle) subtitle.textContent = label;

    const chips = node.querySelectorAll('.node-card__chips .node-chip');
    if (chips && chips.length) {
        chips.forEach((chip) => {
            chip.textContent = label;
        });
    }

    window.DrawflowEditor.exportGraph?.();

    if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'NODE_SETTING_CHANGED',
            payload: { nodeId, nodeType: nodeData.data?.type, settings: nodeData.data.settings }
        }));
    }

    if (navigator.vibrate) navigator.vibrate(15);
}

document.addEventListener('change', (e) => {
    if (e.target.classList.contains('logic-gate-select')) {
        e.stopPropagation();
        handleLogicGateSelectChange(e.target);
    }
}, true);

['pointerdown', 'mousedown', 'touchstart'].forEach((eventName) => {
    document.addEventListener(eventName, (e) => {
        if (e.target.classList.contains('logic-gate-select')) {
            e.stopPropagation();
        }
    }, true);
});

window.DrawflowEditor.handleLogicGateSelectChange = handleLogicGateSelectChange;

// Sanitize any pre-existing delay inputs having a hard-coded "0" value from templates
function sanitizeDelayInputs() {
    document.querySelectorAll('.delay-input').forEach((el) => {
        if (el && el.value === '0') {
            el.value = '';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => sanitizeDelayInputs(), false);
// Also run immediately to handle dynamically-injected nodes
sanitizeDelayInputs();

// Observe DOM changes to sanitize any newly injected delay inputs
try {
    const Observer = (typeof window !== 'undefined' && window.MutationObserver) ? window.MutationObserver : null;
    if (Observer) {
        const _observer = new Observer(() => sanitizeDelayInputs());
        _observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
} catch (err) {
    // If MutationObserver isn't available or throws, ignore — sanitization still ran once.
}

// ============================================
// AUTO-EMISSION BADGES
// ============================================

const AUTO_EMIT_STATUS_TEXT = {
    active: 'Auto-émission active',
    blocked: 'Auto-émission inactive (entrée connectée)',
    disabled: 'Auto-émission désactivée'
};

const AUTO_EMIT_NODE_TYPES = new Set([
    'condition.flashlight',
    'condition.volume.up',
    'condition.volume.down'
]);

function refreshAutoEmitBadges() {
    const editor = window.DrawflowEditor?.editor;
    if (!editor) return;
    const nodes = editor.drawflow?.drawflow?.Home?.data || {};

    Object.keys(nodes).forEach((nodeId) => {
        const nodeData = nodes[nodeId];
        const nodeType = nodeData?.data?.type;
        if (!nodeData || !AUTO_EMIT_NODE_TYPES.has(nodeType)) return;

        const nodeEl = document.getElementById('node-' + nodeId);
        if (!nodeEl) return;

        const statusEl = nodeEl.querySelector('.auto-emit-status');
        const textEl = statusEl?.querySelector('.status-text');
        const dotEl = statusEl?.querySelector('.status-dot');
        if (!statusEl || !textEl || !dotEl) return;

        const hasInputs = Object.values(nodeData.inputs || {}).some((input) => (input.connections || []).length > 0);
        const autoEmitEnabled = nodeData.data?.settings?.autoEmitOnChange !== false;

        let state = 'disabled';
        if (autoEmitEnabled && !hasInputs) {
            state = 'active';
        } else if (autoEmitEnabled && hasInputs) {
            state = 'blocked';
        }

        statusEl.classList.remove('active', 'blocked', 'disabled');
        statusEl.classList.add(state);
        statusEl.dataset.state = state;

        dotEl.classList.remove('active', 'blocked', 'disabled');
        dotEl.classList.add(state);

        textEl.textContent = AUTO_EMIT_STATUS_TEXT[state];
    });
}

let autoEmitBadgeRaf = null;
function scheduleAutoEmitBadgeRefresh() {
    if (autoEmitBadgeRaf) return;
    autoEmitBadgeRaf = requestAnimationFrame(() => {
        autoEmitBadgeRaf = null;
        refreshAutoEmitBadges();
    });
}

window.DrawflowEditor.refreshAutoEmitStatus = scheduleAutoEmitBadgeRefresh;
// Backward compatibility with previous API name used by RN side/tests
window.DrawflowEditor.refreshFlashlightStatus = scheduleAutoEmitBadgeRefresh;

scheduleAutoEmitBadgeRefresh();
