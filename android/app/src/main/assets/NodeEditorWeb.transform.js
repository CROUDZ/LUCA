/* globals */
// GESTION DU ZOOM ET PAN - Version simplifiée et fluide

const DEFAULT_ZOOM = 1;
const ZOOM = { min: 0.3, max: 3, current: DEFAULT_ZOOM };
const PAN = { x: 0, y: 0 };
const PINCH = { 
    active: false, 
    initialDistance: 0, 
    initialZoom: 1, 
    centerX: 0, 
    centerY: 0
};
const PANNING = { active: false, startX: 0, startY: 0, initialX: 0, initialY: 0 };

// Configuration du zoom
const WHEEL_SENSITIVITY = 0.0008;
const BUTTON_ZOOM_FACTOR = 1.15;
const PINCH_MIN_DISTANCE = 20;

// Listeners
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


// ============================================
// UTILITAIRES TOUCH
// ============================================

function getDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getCenter(t1, t2) {
    return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
    };
}

function getContainer() {
    return window.DrawflowEditor?.container || null;
}

function isPointInsideContainer(x, y) {
    const container = getContainer();
    if (!container) return false;
    const rect = container.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function isTouchOnNode(touch) {
    if (!touch) return false;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    return el && el.closest && el.closest('.drawflow-node') != null;
}

function isTouchOnControl(touch) {
    if (!touch) return false;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    return el && el.closest && el.closest('.delay-control, .condition-invert-control, .logic-gate-control, input, select, button') != null;
}

function isTouchOnAnchor(touch) {
    if (!touch) return false;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    return el && el.closest && (el.closest('.output') != null || el.closest('.input') != null);
}

function isCreatingConnection() {
    // Vérifie si Drawflow est en train de créer une connexion
    const editor = window.DrawflowEditor?.editor;
    if (!editor) return false;
    // Drawflow met connection = true quand on drag depuis un output
    return editor.connection === true;
}

// ============================================
// GESTION DU PANNING
// ============================================

function startPan(x, y) {
    PANNING.active = true;
    PANNING.startX = x;
    PANNING.startY = y;
    PANNING.initialX = PAN.x;
    PANNING.initialY = PAN.y;
}

function updatePan(x, y) {
    if (!PANNING.active) return;
    PAN.x = PANNING.initialX + (x - PANNING.startX);
    PAN.y = PANNING.initialY + (y - PANNING.startY);
    applyTransform();
}

function endPan() {
    PANNING.active = false;
}

// ============================================
// GESTION DU PINCH-TO-ZOOM (SIMPLIFIÉ)
// ============================================

function startPinch(t1, t2) {
    const distance = getDistance(t1, t2);
    if (distance < PINCH_MIN_DISTANCE) return false;
    
    const center = getCenter(t1, t2);
    
    PINCH.active = true;
    PINCH.initialDistance = distance;
    PINCH.initialZoom = ZOOM.current;
    PINCH.centerX = center.x;
    PINCH.centerY = center.y;
    
    // Arrêter le panning si actif
    PANNING.active = false;
    
    return true;
}

function updatePinch(t1, t2) {
    if (!PINCH.active) return;
    
    const distance = getDistance(t1, t2);
    if (distance < PINCH_MIN_DISTANCE || PINCH.initialDistance < PINCH_MIN_DISTANCE) return;
    
    const center = getCenter(t1, t2);
    const ratio = distance / PINCH.initialDistance;
    
    // Calculer le nouveau zoom basé sur le ratio initial (plus stable)
    const newZoom = PINCH.initialZoom * ratio;
    
    // Appliquer le zoom au centre actuel du pinch
    zoomAt(center.x, center.y, newZoom);
    
    // Mettre à jour le centre pour le suivi
    PINCH.centerX = center.x;
    PINCH.centerY = center.y;
}

function endPinch() {
    PINCH.active = false;
    PINCH.initialDistance = 0;
}

// ============================================
// EVENT HANDLERS - TOUCH
// ============================================

function handleTouchStart(e) {
    const container = getContainer();
    if (!container) return;
    
    // Ignorer si on touche un contrôle interactif
    if (e.touches.length === 1 && isTouchOnControl(e.touches[0])) {
        return;
    }
    
    // Ignorer si on touche un anchor (pour permettre la création de connexions)
    if (e.touches.length === 1 && isTouchOnAnchor(e.touches[0])) {
        return;
    }
    
    if (e.touches.length === 2) {
        // Démarrer le pinch-to-zoom (sauf si on crée une connexion)
        if (!isCreatingConnection()) {
            e.preventDefault();
            startPinch(e.touches[0], e.touches[1]);
        }
    } else if (e.touches.length === 1 && !PINCH.active) {
        // Démarrer le pan seulement si on ne touche pas un noeud et pas de connexion en cours
        const touch = e.touches[0];
        if (!isPointInsideContainer(touch.clientX, touch.clientY)) return;
        
        if (!isTouchOnNode(touch) && !isCreatingConnection()) {
            e.preventDefault();
            startPan(touch.clientX, touch.clientY);
        }
    }
}

function handleTouchMove(e) {
    // Ne pas interférer si une connexion est en cours de création
    if (isCreatingConnection()) {
        return;
    }
    
    if (PINCH.active && e.touches.length >= 2) {
        e.preventDefault();
        updatePinch(e.touches[0], e.touches[1]);
    } else if (PANNING.active && e.touches.length === 1) {
        e.preventDefault();
        updatePan(e.touches[0].clientX, e.touches[0].clientY);
    }
}

function handleTouchEnd(e) {
    if (e.touches.length < 2 && PINCH.active) {
        endPinch();
        
        // Si il reste un doigt, démarrer le pan (sauf si connexion en cours)
        if (e.touches.length === 1 && !isCreatingConnection()) {
            const touch = e.touches[0];
            if (!isTouchOnNode(touch) && !isTouchOnControl(touch) && !isTouchOnAnchor(touch)) {
                startPan(touch.clientX, touch.clientY);
            }
        }
    }
    
    if (e.touches.length === 0) {
        endPan();
        endPinch();
    }
}

function handleTouchCancel() {
    endPan();
    endPinch();
}

// ============================================
// EVENT HANDLER - WHEEL
// ============================================

function handleWheel(e) {
    if (typeof e.deltaY !== 'number') return;
    e.preventDefault();
    
    let delta = e.deltaY;
    
    // Normaliser selon le mode
    if (e.deltaMode === 1) {
        delta *= 16; // Lignes
    } else if (e.deltaMode === 2) {
        delta *= window.innerHeight || 600; // Pages
    }
    
    // Limiter le delta pour éviter les sauts
    delta = Math.max(-100, Math.min(100, delta));
    
    // Calculer le facteur de zoom
    const factor = Math.exp(-delta * WHEEL_SENSITIVITY);
    
    // Appliquer le zoom centré sur la position de la souris
    zoomByFactor(factor, e.clientX, e.clientY);
}

// ============================================
// INITIALISATION DES LISTENERS
// ============================================

let listenersInitialized = false;

function initTransformListeners() {
    if (listenersInitialized) return;
    
    const container = getContainer();
    if (!container) {
        console.warn('[NodeEditorWeb] Aucun conteneur disponible pour initialiser le zoom.');
        return;
    }
    
    // Ajouter les listeners tactiles sur le container
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: false });
    
    // Ajouter le listener wheel
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    listenersInitialized = true;
    window.DrawflowEditor.debugLog && window.DrawflowEditor.debugLog('[NodeEditorWeb] Transform listeners initialized');
}

// Initialiser immédiatement si le container existe, sinon après un délai
if (getContainer()) {
    initTransformListeners();
} else {
    setTimeout(function() {
        initTransformListeners();
    }, 100);
}

// ============================================
// EXPORTS
// ============================================

window.DrawflowEditor = window.DrawflowEditor || {};
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
window.DrawflowEditor.initTransformListeners = initTransformListeners;