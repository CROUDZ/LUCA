/* globals */
// GESTION DU ZOOM ET PAN

const DEFAULT_ZOOM = 1;
const ZOOM = { min: 0.3, max: 3, current: DEFAULT_ZOOM };
const PAN = { x: 0, y: 0 };
const PINCH = { active: false, distance: 0, zoom: 1, centerX: 0, centerY: 0 };
const PANNING = { active: false, startX: 0, startY: 0, initialX: 0, initialY: 0 };
const WHEEL_SENSITIVITY = 0.0015;
const BUTTON_ZOOM_FACTOR = 1.1;
const PINCH_RESPONSE = 0.55;
const PINCH_DELTA_LIMIT = 0.6;
const ZOOM_LISTENERS = new Set();

function getPrecanvas() {
    const editor = window.DrawflowEditor?.editor;
    if (!editor) return null;
    if (editor.precanvas) return editor.precanvas;
    const container = window.DrawflowEditor?.container;
    if (!container) return null;
    const fallback = container.querySelector('.parent-drawflow') || container.querySelector('.drawflow');
    if (fallback) {
        editor.precanvas = fallback;
        return fallback;
    }
    return null;
}

function applyTransform() {
    // editor is stored on the namespace; if not present, skip
    const editor = window.DrawflowEditor?.editor;
    if (!editor) return;
    editor.zoom = ZOOM.current;
    editor.canvas_x = PAN.x;
    editor.canvas_y = PAN.y;
    const precanvas = getPrecanvas();
    if (precanvas) {
        precanvas.style.transform = `translate(${PAN.x}px, ${PAN.y}px) scale(${ZOOM.current})`;
        precanvas.style.transformOrigin = '0 0';
    }
    ZOOM_LISTENERS.forEach((listener) => {
        try {
            listener(ZOOM.current);
        } catch (err) {
            console.warn('[NodeEditorWeb] zoom listener failed', err);
        }
    });
}

function zoomAt(clientX, clientY, scale) {
    const container = window.DrawflowEditor?.container;
    if (!container) return;
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

function getViewportCenter() {
    const container = window.DrawflowEditor?.container;
    if (container) {
        const rect = container.getBoundingClientRect();
        return {
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
        };
    }
    return { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 };
}

function zoomByFactor(factor, anchorX, anchorY) {
    if (typeof factor !== 'number' || Number.isNaN(factor)) return;
    const { clientX, clientY } = anchorX != null && anchorY != null ? { clientX: anchorX, clientY: anchorY } : getViewportCenter();
    const targetScale = ZOOM.current * factor;
    zoomAt(clientX, clientY, targetScale);
}

function zoomBySteps(stepCount) {
    if (typeof stepCount !== 'number' || Number.isNaN(stepCount) || stepCount === 0) return;
    const factor = stepCount > 0 ? Math.pow(BUTTON_ZOOM_FACTOR, stepCount) : Math.pow(1 / BUTTON_ZOOM_FACTOR, Math.abs(stepCount));
    const center = getViewportCenter();
    zoomAt(center.clientX, center.clientY, ZOOM.current * factor);
}

function resetView() {
    ZOOM.current = DEFAULT_ZOOM;
    PAN.x = 0;
    PAN.y = 0;
    applyTransform();
}

function onZoomChange(listener) {
    if (typeof listener !== 'function') return () => {};
    ZOOM_LISTENERS.add(listener);
    listener(ZOOM.current);
    return () => {
        ZOOM_LISTENERS.delete(listener);
    };
}


function getDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

const container = window.DrawflowEditor?.container;
if (!container) {
    console.warn('[NodeEditorWeb] Aucun conteneur Drawflow disponible pour initialiser le zoom.');
}

// Événements tactiles pour zoom/pan
container?.addEventListener('touchstart', (e) => {
    const isOnNode = e.target.closest('.drawflow-node');
    
    if (e.touches.length === 2) {
        PANNING.active = false;
        PINCH.active = true;
    PINCH.distance = getDistance(e.touches[0], e.touches[1]) || 0.0001;
        PINCH.zoom = ZOOM.current;
        PINCH.centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        PINCH.centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        e.preventDefault();
        e.stopPropagation();
    } else if (e.touches.length === 1 && !isOnNode && !PINCH.active) {
        PANNING.active = true;
        PANNING.startX = e.touches[0].clientX;
        PANNING.startY = e.touches[0].clientY;
        PANNING.initialX = PAN.x;
        PANNING.initialY = PAN.y;
        e.preventDefault();
    }
}, { passive: false });

container?.addEventListener('touchmove', (e) => {
    if (PINCH.active && e.touches.length === 2) {
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        if (!Number.isFinite(currentDistance) || currentDistance <= 0) {
            return;
        }
        if (PINCH.distance === 0) {
            PINCH.distance = currentDistance;
            PINCH.zoom = ZOOM.current;
            return;
        }
        const delta = (currentDistance - PINCH.distance) / PINCH.distance;
        const clampedDelta = Math.max(-PINCH_DELTA_LIMIT, Math.min(PINCH_DELTA_LIMIT, delta));
        const adjustedDelta = clampedDelta * PINCH_RESPONSE;
        const scale = PINCH.zoom * (1 + adjustedDelta);
        const currentCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const currentCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        PINCH.centerX = currentCenterX;
        PINCH.centerY = currentCenterY;
        zoomAt(currentCenterX, currentCenterY, scale);
        PINCH.distance = currentDistance;
        PINCH.zoom = ZOOM.current;
        e.preventDefault();
        e.stopPropagation();
    } else if (PANNING.active && e.touches.length === 1 && !e.target.closest('.drawflow-node')) {
        const dx = e.touches[0].clientX - PANNING.startX;
        const dy = e.touches[0].clientY - PANNING.startY;
        
        PAN.x = PANNING.initialX + dx;
        PAN.y = PANNING.initialY + dy;
        
        applyTransform();
        e.preventDefault();
    }
}, { passive: false });

container?.addEventListener('touchend', (e) => {
    if (PINCH.active && e.touches.length < 2) {
        PINCH.active = false;
        e.stopPropagation();
    }
    if (e.touches.length === 0) PANNING.active = false;
}, { passive: false });

container?.addEventListener('touchcancel', (e) => {
    if (PINCH.active) {
        PINCH.active = false;
        e.stopPropagation();
    }
    PANNING.active = false;
}, { passive: false });

container?.addEventListener('wheel', (e) => {
    if (typeof e.deltaY !== 'number') return;
    e.preventDefault();
    const scaleFactor = Math.exp(-e.deltaY * WHEEL_SENSITIVITY);
    zoomByFactor(scaleFactor, e.clientX, e.clientY);
}, { passive: false });

// Expose for external use if needed
window.DrawflowEditor.ZOOM = ZOOM;
window.DrawflowEditor.PAN = PAN;
window.DrawflowEditor.PINCH = PINCH;
window.DrawflowEditor.PANNING = PANNING;
window.DrawflowEditor.applyTransform = applyTransform;
window.DrawflowEditor.zoomAt = zoomAt;
window.DrawflowEditor.getPrecanvas = getPrecanvas;
window.DrawflowEditor.zoomByFactor = zoomByFactor;
window.DrawflowEditor.zoomBySteps = zoomBySteps;
window.DrawflowEditor.resetView = resetView;
window.DrawflowEditor.onZoomChange = onZoomChange;