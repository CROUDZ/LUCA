/* globals */
// GESTION DU ZOOM ET PAN

const DEFAULT_ZOOM = 1;
const ZOOM = { min: 0.3, max: 3, current: DEFAULT_ZOOM };
const PAN = { x: 0, y: 0 };
const PINCH = { active: false, distance: 0, zoom: 1, centerX: 0, centerY: 0 };
const PANNING = { active: false, startX: 0, startY: 0, initialX: 0, initialY: 0, pointerId: null };
const WHEEL_SENSITIVITY = 0.0013;
const TRACKPAD_SENSITIVITY = 0.0024;
const TRACKPAD_DELTA_HINT = 14;
const WHEEL_DELTA_CAP = 240;
const WHEEL_CHUNK_DIVISOR = 60;
const BUTTON_ZOOM_FACTOR = 1.08;
const PINCH_DEADZONE = 0.01;
const PINCH_RATIO_MIN = 0.1;
const PINCH_RATIO_MAX = 10;
const TOUCH_LISTENER_OPTIONS = { passive: false, capture: true };
const POINTER_LISTENER_OPTIONS = { passive: false, capture: true };
const EVENT_TARGET = typeof window !== 'undefined' ? window : null;
const USE_POINTER_EVENTS = typeof window !== 'undefined' && typeof window.PointerEvent === 'function';
const POINTERS = new Map();
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

function normalizeWheelDelta(evt) {
    let delta = typeof evt.deltaY === 'number' ? evt.deltaY : 0;
    if (evt.deltaMode === 1) {
        delta *= 16;
    } else if (evt.deltaMode === 2) {
        const pageHeight = window.innerHeight || document.documentElement?.clientHeight || 600;
        delta *= pageHeight;
    }
    return delta;
}

const container = window.DrawflowEditor?.container;
if (!container) {
    console.warn('[NodeEditorWeb] Aucun conteneur Drawflow disponible pour initialiser le zoom.');
}

function isPointInsideContainer(x, y) {
    if (!container) return false;
    const rect = container.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function eventTouchesEditor(evt) {
    if (!evt) return false;
    const lists = [evt.touches, evt.changedTouches];
    for (let li = 0; li < lists.length; li += 1) {
        const list = lists[li];
        if (!list) continue;
        for (let i = 0; i < list.length; i += 1) {
            const entry = list[i];
            if (isPointInsideContainer(entry.clientX, entry.clientY)) {
                return true;
            }
        }
    }
    return false;
}

function shouldHandleTouch(evt) {
    if (PINCH.active || PANNING.active) return true;
    return eventTouchesEditor(evt);
}

function getElementAtCoords(x, y, fallbackTarget) {
    if (typeof x === 'number' && typeof y === 'number' && typeof document?.elementFromPoint === 'function') {
        const el = document.elementFromPoint(x, y);
        if (el) return el;
    }
    return fallbackTarget || null;
}

function getTouchElement(evt) {
    const touch = evt?.changedTouches?.[0] || evt?.touches?.[0];
    if (touch) {
        return getElementAtCoords(touch.clientX, touch.clientY, evt?.target || null);
    }
    return evt?.target || null;
}

function getPointerElement(evt) {
    if (!evt) return null;
    return getElementAtCoords(evt.clientX, evt.clientY, evt.target || null);
}

function shouldHandlePointer(evt) {
    if (!evt) return false;
    if (PINCH.active || PANNING.active) return true;
    return isPointInsideContainer(evt.clientX, evt.clientY);
}

function endPinchGesture() {
    PINCH.active = false;
    PINCH.distance = 0;
    PINCH.zoom = ZOOM.current;
}

function getPointerPair() {
    if (POINTERS.size < 2) return null;
    const iterator = POINTERS.values();
    const first = iterator.next().value;
    const second = iterator.next().value;
    if (!first || !second) return null;
    return [first, second];
}

function getPointerDistance(a, b) {
    if (!a || !b) return 0;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function startPinchFromPointers() {
    const pair = getPointerPair();
    if (!pair) return;
    const distance = getPointerDistance(pair[0], pair[1]) || 0.0001;
    PINCH.active = true;
    PINCH.distance = distance;
    PINCH.zoom = ZOOM.current;
    PINCH.centerX = (pair[0].x + pair[1].x) / 2;
    PINCH.centerY = (pair[0].y + pair[1].y) / 2;
    PANNING.active = false;
    PANNING.pointerId = null;
}

function updatePinchFromPointers() {
    const pair = getPointerPair();
    if (!pair) return;
    const distance = getPointerDistance(pair[0], pair[1]);
    if (!Number.isFinite(distance) || distance <= 0) return;
    if (PINCH.distance === 0) {
        PINCH.distance = distance;
        PINCH.zoom = ZOOM.current;
        return;
    }
    const ratio = distance / PINCH.distance;
    if (!Number.isFinite(ratio) || ratio <= 0 || Math.abs(ratio - 1) < PINCH_DEADZONE) return;
    const safeRatio = Math.max(PINCH_RATIO_MIN, Math.min(PINCH_RATIO_MAX, ratio));
    const centerX = (pair[0].x + pair[1].x) / 2;
    const centerY = (pair[0].y + pair[1].y) / 2;
    PINCH.centerX = centerX;
    PINCH.centerY = centerY;
    zoomAt(centerX, centerY, PINCH.zoom * safeRatio);
    PINCH.distance = distance;
    PINCH.zoom = ZOOM.current;
}

function startPanFromPoint(x, y, pointerId = null) {
    PANNING.active = true;
    PANNING.pointerId = pointerId;
    PANNING.startX = x;
    PANNING.startY = y;
    PANNING.initialX = PAN.x;
    PANNING.initialY = PAN.y;
}

function updatePanFromPoint(x, y) {
    if (!PANNING.active) return;
    const dx = x - PANNING.startX;
    const dy = y - PANNING.startY;
    PAN.x = PANNING.initialX + dx;
    PAN.y = PANNING.initialY + dy;
    applyTransform();
}

function recordPointer(evt) {
    if (!evt) return;
    POINTERS.set(evt.pointerId, { id: evt.pointerId, x: evt.clientX, y: evt.clientY });
}

function handlePointerDown(evt) {
    if (evt.pointerType !== 'touch' || !shouldHandlePointer(evt)) return;
    recordPointer(evt);
    if (POINTERS.size >= 2) {
        if (!PINCH.active) {
            startPinchFromPointers();
        }
        evt.preventDefault();
        evt.stopPropagation();
        return;
    }
    if (PINCH.active) return;
    const isOnNode = getPointerElement(evt)?.closest?.('.drawflow-node');
    if (!isOnNode) {
        startPanFromPoint(evt.clientX, evt.clientY, evt.pointerId);
        evt.preventDefault();
    }
}

function handlePointerMove(evt) {
    if (evt.pointerType !== 'touch' || !POINTERS.has(evt.pointerId)) return;
    recordPointer(evt);
    if (PINCH.active) {
        updatePinchFromPointers();
        evt.preventDefault();
        evt.stopPropagation();
        return;
    }
    if (POINTERS.size >= 2) {
        startPinchFromPointers();
        updatePinchFromPointers();
        evt.preventDefault();
        evt.stopPropagation();
        return;
    }
    if (PANNING.active && PANNING.pointerId === evt.pointerId) {
        updatePanFromPoint(evt.clientX, evt.clientY);
        evt.preventDefault();
    }
}

function handlePointerUpOrCancel(evt) {
    if (evt.pointerType !== 'touch') return;
    POINTERS.delete(evt.pointerId);
    if (PINCH.active && POINTERS.size < 2) {
        endPinchGesture();
    }
    if (PANNING.active && PANNING.pointerId === evt.pointerId) {
        PANNING.active = false;
        PANNING.pointerId = null;
    }
}

if (USE_POINTER_EVENTS) {
    EVENT_TARGET?.addEventListener('pointerdown', handlePointerDown, POINTER_LISTENER_OPTIONS);
    EVENT_TARGET?.addEventListener('pointermove', handlePointerMove, POINTER_LISTENER_OPTIONS);
    EVENT_TARGET?.addEventListener('pointerup', handlePointerUpOrCancel, POINTER_LISTENER_OPTIONS);
    EVENT_TARGET?.addEventListener('pointercancel', handlePointerUpOrCancel, POINTER_LISTENER_OPTIONS);
} else {
    // Événements tactiles pour zoom/pan
    EVENT_TARGET?.addEventListener('touchstart', (e) => {
        if (!shouldHandleTouch(e)) return;
        const isOnNode = getTouchElement(e)?.closest?.('.drawflow-node');
        
        if (e.touches.length === 2) {
            PANNING.active = false;
            PANNING.pointerId = null;
            PINCH.active = true;
            PINCH.distance = getDistance(e.touches[0], e.touches[1]) || 0.0001;
            PINCH.zoom = ZOOM.current;
            PINCH.centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            PINCH.centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            e.preventDefault();
            e.stopPropagation();
        } else if (e.touches.length === 1 && !isOnNode && !PINCH.active) {
            startPanFromPoint(e.touches[0].clientX, e.touches[0].clientY);
            e.preventDefault();
        }
    }, TOUCH_LISTENER_OPTIONS);

    EVENT_TARGET?.addEventListener('touchmove', (e) => {
        if (!shouldHandleTouch(e)) return;
        if (PINCH.active && e.touches.length === 2) {
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            if (!Number.isFinite(currentDistance) || currentDistance <= 0) {
                return;
            }
            if (PINCH.distance === 0) {
                PINCH.distance = currentDistance || 0.0001;
                PINCH.zoom = ZOOM.current;
                return;
            }
            const ratio = currentDistance / PINCH.distance;
            if (!Number.isFinite(ratio) || ratio <= 0 || Math.abs(ratio - 1) < PINCH_DEADZONE) {
                return;
            }
            const safeRatio = Math.max(PINCH_RATIO_MIN, Math.min(PINCH_RATIO_MAX, ratio));
            const currentCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const currentCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            PINCH.centerX = currentCenterX;
            PINCH.centerY = currentCenterY;
            zoomAt(currentCenterX, currentCenterY, PINCH.zoom * safeRatio);
            PINCH.distance = currentDistance;
            PINCH.zoom = ZOOM.current;
            e.preventDefault();
            e.stopPropagation();
        } else if (PANNING.active && e.touches.length === 1 && !e.target.closest('.drawflow-node')) {
            updatePanFromPoint(e.touches[0].clientX, e.touches[0].clientY);
            e.preventDefault();
        }
    }, TOUCH_LISTENER_OPTIONS);

    EVENT_TARGET?.addEventListener('touchend', (e) => {
        if (!shouldHandleTouch(e)) return;
        if (PINCH.active && e.touches.length < 2) {
            endPinchGesture();
            e.stopPropagation();
        }
        if (e.touches.length === 0) {
            PANNING.active = false;
            PANNING.pointerId = null;
        }
    }, TOUCH_LISTENER_OPTIONS);

    EVENT_TARGET?.addEventListener('touchcancel', (e) => {
        if (!shouldHandleTouch(e)) return;
        if (PINCH.active) {
            endPinchGesture();
            e.stopPropagation();
        }
        PANNING.active = false;
        PANNING.pointerId = null;
    }, TOUCH_LISTENER_OPTIONS);
}

container?.addEventListener('wheel', (e) => {
    if (typeof e.deltaY !== 'number') return;
    e.preventDefault();
    const normalized = normalizeWheelDelta(e);
    if (!Number.isFinite(normalized) || normalized === 0) return;
    const clampedDelta = Math.max(-WHEEL_DELTA_CAP, Math.min(WHEEL_DELTA_CAP, normalized));
    const isTrackpadGesture = e.ctrlKey || Math.abs(clampedDelta) < TRACKPAD_DELTA_HINT;
    const sensitivity = isTrackpadGesture ? TRACKPAD_SENSITIVITY : WHEEL_SENSITIVITY;
    if (isTrackpadGesture) {
        const scaleFactor = Math.exp(-clampedDelta * sensitivity);
        zoomByFactor(scaleFactor, e.clientX, e.clientY);
        return;
    }
    const steps = Math.max(1, Math.ceil(Math.abs(clampedDelta) / WHEEL_CHUNK_DIVISOR));
    const chunk = clampedDelta / steps;
    for (let i = 0; i < steps; i += 1) {
        const scaleFactor = Math.exp(-chunk * sensitivity);
        zoomByFactor(scaleFactor, e.clientX, e.clientY);
    }
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