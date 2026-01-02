// GESTION DU SWITCH INVERT SIGNAL & DELAY

// Empêcher la propagation des événements sur les contrôles interactifs (switch, délai, logique)

function isNodeControlInteraction(target) {
  if (!target) return false;
  return Boolean(
    target.closest('.condition-invert-control') ||
      target.closest('.delay-control') ||
      target.closest('.voice-keyword-control') ||
      target.closest('.notification-control')
  );
}

document.addEventListener(
  'click',
  (e) => {
    if (isNodeControlInteraction(e.target)) {
      e.stopPropagation();
    }
  },
  true
);

document.addEventListener(
  'touchend',
  (e) => {
    if (isNodeControlInteraction(e.target)) {
      e.stopPropagation();
    }
  },
  true
);

// Gestion du toggle avec click (souris) et touchend (tactile)
function handleInvertToggle(target) {
  if (
    target.classList.contains('switch-label') ||
    target.classList.contains('switch-slider') ||
    target.classList.contains('switch-text')
  ) {
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
document.addEventListener(
  'click',
  (e) => {
    handleInvertToggle(e.target);
  },
  false
);

// Gestion pour le tactile
document.addEventListener(
  'touchend',
  (e) => {
    if (e.touches.length === 0 && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target && handleInvertToggle(target)) {
        e.preventDefault();
      }
    }
  },
  false
);

// Délégation d'événements pour gérer les switches d'inversion de signal

document.addEventListener(
  'change',
  (e) => {
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

        window.DrawflowEditor.debugLog &&
          window.DrawflowEditor.debugLog(
            `[InvertSignal] Node ${nodeId}: invertSignal set to ${e.target.checked}`
          );

        // Déclencher l'export automatique
        window.DrawflowEditor.exportGraph();

        // Notifier l'application native (RN) immédiatement sur un changement de settings
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'NODE_SETTING_CHANGED',
              payload: { nodeId, nodeType: nodeData.data?.type, settings: nodeData.data.settings },
            })
          );
        }

        // Feedback visuel
        if (navigator.vibrate) navigator.vibrate(30);
      }
    }
  },
  false
);

// ============================================
// CONTRÔLE DU MODE SWITCH (CONDITIONS)
// ============================================

document.addEventListener(
  'change',
  (e) => {
    if (e.target.classList.contains('switch-mode-toggle')) {
      const node = e.target.closest('.drawflow-node');
      if (!node) return;

      const nodeId = node.id.replace('node-', '');
      const nodeData = window.DrawflowEditor.editor.drawflow.drawflow.Home.data[nodeId];

      if (nodeData && nodeData.data) {
        if (!nodeData.data.settings) {
          nodeData.data.settings = {};
        }

        const switchMode = e.target.checked;
        nodeData.data.settings.switchMode = switchMode;

        // Afficher/masquer le timer setting en fonction du mode switch
        const timerSetting = node.querySelector('.timer-setting');
        if (timerSetting) {
          timerSetting.style.display = switchMode ? 'none' : '';
        }

        // Mettre à jour le subtitle
        updateConditionSubtitle(node, nodeData.data.settings);

        window.DrawflowEditor.debugLog &&
          window.DrawflowEditor.debugLog(
            `[SwitchMode] Node ${nodeId}: switchMode set to ${switchMode}`
          );

        window.DrawflowEditor.exportGraph();

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'NODE_SETTING_CHANGED',
              payload: { nodeId, nodeType: nodeData.data?.type, settings: nodeData.data.settings },
            })
          );
        }

        if (navigator.vibrate) navigator.vibrate(30);
      }
    }
  },
  false
);

// ============================================
// CONTRÔLE DU TIMER DURATION (CONDITIONS)
// ============================================

function handleTimerDurationChange(target, isFinal = false) {
  const node = target.closest('.drawflow-node');
  if (!node) return;

  const nodeId = node.id.replace('node-', '');
  const nodeData = window.DrawflowEditor.editor.drawflow.drawflow.Home.data[nodeId];
  if (!nodeData) return;

  if (!nodeData.data) nodeData.data = {};
  if (!nodeData.data.settings) nodeData.data.settings = {};

  // Parser la valeur (accepte virgule ou point comme séparateur)
  let value = parseFloat(target.value.replace(',', '.')) || 0;
  value = Math.max(0, Math.min(300, value)); // Limiter entre 0 et 300 secondes

  if (isFinal) {
    target.value = value > 0 ? value : '';
  }

  nodeData.data.settings.timerDuration = value;

  // Mettre à jour le subtitle
  updateConditionSubtitle(node, nodeData.data.settings);

  window.DrawflowEditor.exportGraph();

  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'NODE_SETTING_CHANGED',
        payload: { nodeId, nodeType: nodeData.data?.type, settings: nodeData.data.settings },
      })
    );
  }

  if (isFinal && navigator.vibrate) navigator.vibrate(15);
}

['input', 'change'].forEach((eventName) => {
  document.addEventListener(
    eventName,
    (e) => {
      if (e.target.classList.contains('timer-duration-input')) {
        e.stopPropagation();
        handleTimerDurationChange(e.target, eventName === 'change');
      }
    },
    { passive: true }
  );
});

document.addEventListener(
  'blur',
  (e) => {
    if (e.target.classList.contains('timer-duration-input')) {
      handleTimerDurationChange(e.target, true);
    }
  },
  true
);

// ============================================
// MISE À JOUR DU SUBTITLE DES CONDITIONS
// ============================================

function updateConditionSubtitle(nodeEl, settings) {
  const subtitle = nodeEl.querySelector('.node-subtitle');
  if (!subtitle) return;

  const invertSignal = settings?.invertSignal ?? false;
  const switchMode = settings?.switchMode ?? false;
  const timerDuration = settings?.timerDuration ?? 0;

  let text = invertSignal ? 'Signal inversé' : 'Signal direct';
  if (switchMode) {
    text += ' • Mode Switch';
  } else if (timerDuration > 0) {
    text += ` • Timer ${timerDuration}s`;
  } else {
    text += ' • Continu';
  }

  subtitle.textContent = text;
}

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
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'NODE_SETTING_CHANGED',
        payload: { nodeId, nodeType: nodeData.data?.type, settings: nodeData.data.settings },
      })
    );
  }

  if (navigator.vibrate) navigator.vibrate(15);
}

['input', 'change'].forEach((eventName) => {
  document.addEventListener(
    eventName,
    (e) => {
      if (e.target.classList.contains('delay-input')) {
        e.stopPropagation();
        handleDelayInputChange(e.target, eventName === 'change');
      }
    },
    true
  );
});

// ============================================
// CONTRÔLE MOT-CLÉ VOCAL (Voice Keyword)
// ============================================

function handleVoiceKeywordChange(target, isFinal = false) {
  const node = target.closest('.drawflow-node');
  if (!node) return;

  const nodeId = node.id.replace('node-', '');
  const nodeData = window.DrawflowEditor.editor.drawflow.drawflow.Home.data[nodeId];
  if (!nodeData) return;

  if (!nodeData.data) nodeData.data = {};
  if (!nodeData.data.settings) nodeData.data.settings = {};

  const raw = (target.value || '').toString();
  const keyword = raw.trim();

  nodeData.data.settings.keyword = keyword;

  // Mettre à jour le subtitle: on appelle la fonction existante puis on ajoute le mot-clé
  updateConditionSubtitle(node, nodeData.data.settings);

  const subtitle = node.querySelector('.node-subtitle');
  if (subtitle) {
    const short = keyword.length > 22 ? `${keyword.substring(0, 22)}…` : keyword;
    subtitle.textContent = `${subtitle.textContent} • "${short}"`;
  }

  // Mettre à jour la puce (chip) du node pour afficher le mot-clé
  const chips = node.querySelectorAll('.node-card__chips .node-chip');
  if (chips && chips.length) {
    // On met à jour la première puce qui correspond au mot-clé
    chips[0].textContent = `"${keyword}"`;
  }

  window.DrawflowEditor.exportGraph();

  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'NODE_SETTING_CHANGED',
        payload: { nodeId, nodeType: nodeData.data?.type, settings: nodeData.data.settings },
      })
    );
  }

  if (isFinal && navigator.vibrate) navigator.vibrate(15);
  // When change is final, remove focus so mobile keyboards close
  if (isFinal && typeof target.blur === 'function') {
    try {
      target.blur();
    } catch (err) {
      /* ignore */
    }
  }
}

['input', 'change'].forEach((eventName) => {
  document.addEventListener(
    eventName,
    (e) => {
      if (e.target.classList.contains('voice-keyword-input')) {
        e.stopPropagation();
        handleVoiceKeywordChange(e.target, eventName === 'change');
      }
      // Notification inputs
      if (
        e.target.classList.contains('notification-title-input') ||
        e.target.classList.contains('notification-message-input')
      ) {
        e.stopPropagation();
        handleNotificationFieldChange(e.target, eventName === 'change');
      }
      if (e.target.classList.contains('notification-type-select')) {
        e.stopPropagation();
        handleNotificationTypeChange(e.target, eventName === 'change');
      }
    },
    true
  );
});

document.addEventListener(
  'blur',
  (e) => {
    if (e.target.classList.contains('voice-keyword-input')) {
      handleVoiceKeywordChange(e.target, true);
    }
    if (
      e.target.classList.contains('notification-title-input') ||
      e.target.classList.contains('notification-message-input')
    ) {
      handleNotificationFieldChange(e.target, true);
    }
    if (e.target.classList.contains('notification-type-select')) {
      handleNotificationTypeChange(e.target, true);
    }
  },
  true
);

// Fermer le clavier sur 'Enter' pour les inputs de mot-clé
document.addEventListener(
  'keydown',
  (e) => {
    const target = e.target;
    if (!target || !target.classList) return;
    if (
      target.classList.contains('voice-keyword-input') ||
      target.classList.contains('notification-title-input') ||
      target.classList.contains('notification-message-input')
    ) {
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        try {
          target.blur();
        } catch (err) {
          /* ignore */
        }
      }
    }
  },
  true
);

// ============================================
// GESTION NOTIFICATION FIELDS
// ============================================

function handleNotificationFieldChange(target, isFinal = false) {
  const node = target.closest('.drawflow-node');
  if (!node) return;

  const nodeId = node.id.replace('node-', '');
  const nodeData = window.DrawflowEditor.editor.drawflow.drawflow.Home.data[nodeId];
  if (!nodeData) return;

  if (!nodeData.data) nodeData.data = {};
  if (!nodeData.data.settings) nodeData.data.settings = {};

  if (target.classList.contains('notification-title-input')) {
    const raw = (target.value || '').toString();
    nodeData.data.settings.title = raw;

    const subtitle = node.querySelector('.node-subtitle');
    if (subtitle) {
      const short = raw.length > 22 ? `${raw.substring(0, 22)}…` : raw || 'Notification';
      subtitle.textContent = short;
    }
  }

  if (target.classList.contains('notification-message-input')) {
    const raw = (target.value || '').toString();
    nodeData.data.settings.message = raw;

    // update description
    const desc = node.querySelector('.node-card__description');
    if (desc) {
      const short = raw.length > 22 ? `${raw.substring(0, 22)}…` : raw;
      desc.textContent = `Message: ${short}`;
    }
  }

  window.DrawflowEditor.exportGraph();

  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'NODE_SETTING_CHANGED',
        payload: { nodeId, nodeType: nodeData.data?.type, settings: nodeData.data.settings },
      })
    );
  }

  if (isFinal && navigator.vibrate) navigator.vibrate(15);

  if (isFinal && typeof target.blur === 'function') {
    try {
      target.blur();
    } catch (err) {
      /* ignore */
    }
  }
}

function handleNotificationTypeChange(target, isFinal = false) {
  const node = target.closest('.drawflow-node');
  if (!node) return;

  const nodeId = node.id.replace('node-', '');
  const nodeData = window.DrawflowEditor.editor.drawflow.drawflow.Home.data[nodeId];
  if (!nodeData) return;

  if (!nodeData.data) nodeData.data = {};
  if (!nodeData.data.settings) nodeData.data.settings = {};

  const val = (target.value || 'alert').toString();
  nodeData.data.settings.notificationType = val;

  // Update chip label and tone
  const chips = node.querySelectorAll('.node-card__chips .node-chip');
  if (chips && chips.length) {
    chips[0].textContent = val.toUpperCase();
  }

  window.DrawflowEditor.exportGraph();
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'NODE_SETTING_CHANGED',
        payload: { nodeId, nodeType: nodeData.data?.type, settings: nodeData.data.settings },
      })
    );
  }

  if (isFinal && navigator.vibrate) navigator.vibrate(15);
}

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
  const label =
    selectedOption && selectedOption.textContent ? selectedOption.textContent.trim() : rawValue;

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
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'NODE_SETTING_CHANGED',
        payload: { nodeId, nodeType: nodeData.data?.type, settings: nodeData.data.settings },
      })
    );
  }

  if (navigator.vibrate) navigator.vibrate(15);
}

document.addEventListener(
  'change',
  (e) => {
    if (e.target.classList.contains('logic-gate-select')) {
      e.stopPropagation();
      handleLogicGateSelectChange(e.target);
    }
  },
  true
);

['pointerdown', 'mousedown', 'touchstart'].forEach((eventName) => {
  document.addEventListener(
    eventName,
    (e) => {
      if (e.target.classList.contains('logic-gate-select')) {
        e.stopPropagation();
      }
    },
    true
  );
});

window.DrawflowEditor.handleLogicGateSelectChange = handleLogicGateSelectChange;

// ============================================
// COLOR SCREEN CONTROL
// ============================================

function handleColorScreenPickerChange(target) {
  const node = target.closest('.drawflow-node');
  if (!node) return;

  const nodeId = node.id.replace('node-', '');
  const editor = window.DrawflowEditor?.editor;
  const nodeData = editor?.drawflow?.drawflow?.Home?.data?.[nodeId];
  if (!nodeData) return;

  if (!nodeData.data) nodeData.data = {};
  if (!nodeData.data.settings) nodeData.data.settings = {};

  const color = target.value || '#FF0000';
  nodeData.data.settings.color = color;

  // Update the text input if it exists
  const textInput = node.querySelector('.color-screen-input');
  if (textInput) textInput.value = color;

  // Update the subtitle
  const subtitle = node.querySelector('.node-subtitle');
  if (subtitle) subtitle.textContent = color;

  window.DrawflowEditor.exportGraph?.();

  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'NODE_SETTING_CHANGED',
        payload: { nodeId, nodeType: nodeData.data?.type, settings: nodeData.data.settings },
      })
    );
  }

  if (navigator.vibrate) navigator.vibrate(15);
}

function handleColorScreenInputChange(target) {
  const node = target.closest('.drawflow-node');
  if (!node) return;

  const nodeId = node.id.replace('node-', '');
  const editor = window.DrawflowEditor?.editor;
  const nodeData = editor?.drawflow?.drawflow?.Home?.data?.[nodeId];
  if (!nodeData) return;

  if (!nodeData.data) nodeData.data = {};
  if (!nodeData.data.settings) nodeData.data.settings = {};

  let color = target.value || '#FF0000';

  // Validate hex color
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    // If invalid, try to fix it
    if (color.startsWith('#')) {
      color = color.slice(0, 7);
    } else {
      color = '#' + color.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      color = '#FF0000'; // fallback to red
    }
  }

  nodeData.data.settings.color = color;

  // Update the color picker
  const colorPicker = node.querySelector('.color-screen-picker');
  if (colorPicker) colorPicker.value = color;

  // Update the text input to show the validated color
  target.value = color;

  // Update the subtitle
  const subtitle = node.querySelector('.node-subtitle');
  if (subtitle) subtitle.textContent = color;

  window.DrawflowEditor.exportGraph?.();

  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'NODE_SETTING_CHANGED',
        payload: { nodeId, nodeType: nodeData.data?.type, settings: nodeData.data.settings },
      })
    );
  }

  if (navigator.vibrate) navigator.vibrate(15);
}

// Listen for color picker changes
document.addEventListener(
  'input',
  (e) => {
    if (e.target.classList.contains('color-screen-picker')) {
      e.stopPropagation();
      handleColorScreenPickerChange(e.target);
    }
  },
  true
);

// Listen for text input changes
document.addEventListener(
  'change',
  (e) => {
    if (e.target.classList.contains('color-screen-input')) {
      e.stopPropagation();
      handleColorScreenInputChange(e.target);
    }
  },
  true
);

// Prevent propagation on color screen controls
['pointerdown', 'mousedown', 'touchstart'].forEach((eventName) => {
  document.addEventListener(
    eventName,
    (e) => {
      if (
        e.target.classList.contains('color-screen-picker') ||
        e.target.classList.contains('color-screen-input') ||
        e.target.closest('.color-screen-control')
      ) {
        e.stopPropagation();
      }
    },
    true
  );
});

window.DrawflowEditor.handleColorScreenPickerChange = handleColorScreenPickerChange;
window.DrawflowEditor.handleColorScreenInputChange = handleColorScreenInputChange;

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
  const Observer =
    typeof window !== 'undefined' && window.MutationObserver ? window.MutationObserver : null;
  if (Observer) {
    const _observer = new Observer(() => sanitizeDelayInputs());
    _observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
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
  disabled: 'Auto-émission désactivée',
};

const AUTO_EMIT_NODE_TYPES = new Set([
  'condition.flashlight',
  'condition.volume.up',
  'condition.volume.down',
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

    const hasInputs = Object.values(nodeData.inputs || {}).some(
      (input) => (input.connections || []).length > 0
    );
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
