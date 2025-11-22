// GESTION DU SWITCH INVERT SIGNAL & DELAY

// Empêcher la propagation des événements sur les contrôles de switch

document.addEventListener('click', (e) => {
    if (e.target.closest('.condition-invert-control') || e.target.closest('.delay-control')) {
        e.stopPropagation();
    }
}, true);

document.addEventListener('touchend', (e) => {
    if (e.target.closest('.condition-invert-control') || e.target.closest('.delay-control')) {
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
            
            console.log(`[InvertSignal] Node ${nodeId}: invertSignal set to ${e.target.checked}`);
            
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

function handleDelayInputChange(target) {
    const node = target.closest('.drawflow-node');
    if (!node) return;

    const nodeId = node.id.replace('node-', '');
    const nodeData = window.DrawflowEditor.editor.drawflow.drawflow.Home.data[nodeId];
    if (!nodeData) return;

    if (!nodeData.data) nodeData.data = {};
    if (!nodeData.data.settings) nodeData.data.settings = {};

    const seconds = window.DrawflowEditor.parseSecondsValue(target.value);
    const delayMs = Math.round(seconds * 1000);
    target.value = window.DrawflowEditor.normalizeSecondsInput(delayMs / 1000);

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
            handleDelayInputChange(e.target);
        }
    }, true);
});

// Expose helper for tests/tools
window.DrawflowEditor = window.DrawflowEditor || {};
window.DrawflowEditor.handleDelayInputChange = handleDelayInputChange;
window.DrawflowEditor.handleInvertToggle = handleInvertToggle;

// ============================================
// ZOOM CONTROLS OVERLAY
// ============================================

const ZOOM_UI = {
    indicator: null,
    unsubscribe: null,
    element: null,
    attempts: 0
};

function updateZoomIndicator(scale) {
    if (!ZOOM_UI.indicator) return;
    const percentage = Math.round(scale * 100);
    ZOOM_UI.indicator.textContent = percentage + '%';
}

function createZoomButton(label, ariaLabel, onPress) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zoom-control-btn';
    btn.textContent = label;
    btn.setAttribute('aria-label', ariaLabel);
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onPress();
    });
    btn.addEventListener('touchstart', (e) => {
        e.stopPropagation();
    }, { passive: true });
    return btn;
}

function mountZoomControls() {
    const api = window.DrawflowEditor;
    if (!api || !api.container) return;
    if (typeof api.zoomByFactor !== 'function' || typeof api.resetView !== 'function') return;
    if (ZOOM_UI.element || document.querySelector('.zoom-controls')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'zoom-controls';

    const plusBtn = createZoomButton('+', 'Zoom avant', () => api.zoomBySteps?.(1));
    const minusBtn = createZoomButton('−', 'Zoom arrière', () => api.zoomBySteps?.(-1));
    const resetBtn = createZoomButton('⟳', 'Réinitialiser le zoom', () => api.resetView?.());

    const group = document.createElement('div');
    group.className = 'zoom-controls-buttons';
    group.appendChild(plusBtn);
    group.appendChild(minusBtn);
    group.appendChild(resetBtn);

    const indicator = document.createElement('span');
    indicator.className = 'zoom-indicator';
    indicator.textContent = '100%';

    wrapper.appendChild(group);
    wrapper.appendChild(indicator);
    document.body.appendChild(wrapper);

    ZOOM_UI.element = wrapper;
    ZOOM_UI.indicator = indicator;

    wrapper.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    wrapper.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });

    if (typeof api.onZoomChange === 'function') {
        ZOOM_UI.unsubscribe = api.onZoomChange((scale) => updateZoomIndicator(scale));
    }
}

function ensureZoomControls() {
    if (ZOOM_UI.element) return;
    const api = window.DrawflowEditor;
    const ready = api && api.container && typeof api.zoomByFactor === 'function';
    if (!ready) {
        if (ZOOM_UI.attempts > 30) return;
        ZOOM_UI.attempts += 1;
        setTimeout(ensureZoomControls, 150);
        return;
    }
    mountZoomControls();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureZoomControls);
} else {
    ensureZoomControls();
}

window.DrawflowEditor.setupZoomControls = ensureZoomControls;

// ============================================
// FLASHLIGHT AUTO-EMISSION BADGES
// ============================================

const FLASHLIGHT_STATUS_TEXT = {
    active: 'Auto-émission active',
    blocked: 'Auto-émission inactive (entrée connectée)',
    disabled: 'Auto-émission désactivée'
};

function refreshFlashlightAutoEmitBadges() {
    const editor = window.DrawflowEditor?.editor;
    if (!editor) return;
    const nodes = editor.drawflow?.drawflow?.Home?.data || {};

    Object.keys(nodes).forEach((nodeId) => {
        const nodeData = nodes[nodeId];
        if (!nodeData || nodeData?.data?.type !== 'condition.flashlight') return;

        const nodeEl = document.getElementById('node-' + nodeId);
        if (!nodeEl) return;

        const statusEl = nodeEl.querySelector('.flashlight-status');
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

        textEl.textContent = FLASHLIGHT_STATUS_TEXT[state];
    });
}

let flashlightBadgeRaf = null;
function scheduleFlashlightBadgeRefresh() {
    if (flashlightBadgeRaf) return;
    flashlightBadgeRaf = requestAnimationFrame(() => {
        flashlightBadgeRaf = null;
        refreshFlashlightAutoEmitBadges();
    });
}

window.DrawflowEditor.refreshFlashlightStatus = scheduleFlashlightBadgeRefresh;

scheduleFlashlightBadgeRefresh();
