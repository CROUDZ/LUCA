// FONCTIONS UTILITAIRES

function formatDelayLabel(value) {
  const totalSeconds = value / 1000;
  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds - minutes * 60;
    const minutePart = `${minutes}m`;
    const secondsPart =
      seconds > 0 ? `${Number.isInteger(seconds) ? seconds : Number(seconds.toFixed(2))}s` : '';
    return secondsPart ? `${minutePart} ${secondsPart}` : minutePart;
  }
  const secondsValue = Number.isInteger(totalSeconds)
    ? totalSeconds
    : Number(totalSeconds.toFixed(2));
  return `${secondsValue}s`;
}

function normalizeSecondsInput(seconds) {
  // Display nothing when value is 0 (i.e., show an empty input to represent 0)
  if (seconds === undefined || seconds === null) return '';
  const num = Number(seconds);
  if (!num) return '';
  return `${num}`.replace('.', ',');
}

function parseSecondsValue(rawValue) {
  if (!rawValue || (typeof rawValue === 'string' && rawValue.trim() === '')) return 0;
  const normalized = rawValue.replace(',', '.');
  const value = parseFloat(normalized);
  if (Number.isNaN(value) || value < 0) {
    return 0;
  }
  return value;
}

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
    data: { type },
  };

  // Merge avec les données fournies
  const template = {
    name: nodeData.name || defaults.name,
    inputs: nodeData.inputs !== undefined ? nodeData.inputs : defaults.inputs,
    outputs: nodeData.outputs !== undefined ? nodeData.outputs : defaults.outputs,
    class: nodeData.class || `${type}-node`,
    data: nodeData.data || defaults.data,
    html:
      nodeData.html ||
      `<div class="title"><span class="node-icon">${nodeData.icon || defaults.icon}</span> ${
        nodeData.name || defaults.name
      }</div><div class="content">${nodeData.description || defaults.description}</div>`,
  };

  return template;
}

function addNode(type, nodeData) {
  const tmpl = createNodeTemplate(type, nodeData);
  // Try to add node in the center of the visible drawflow area (viewport)
  let x;
  let y;
  try {
    const container = window.DrawflowEditor.container;
    const PAN = window.DrawflowEditor.PAN || { x: 0, y: 0 };
    const ZOOM = window.DrawflowEditor.ZOOM || { current: 1 };
    if (container && typeof PAN.x === 'number' && typeof ZOOM.current === 'number') {
      const rect = container.getBoundingClientRect();
      const centerClientX = rect.width / 2;
      const centerClientY = rect.height / 2;
      // Convert client coordinates to drawflow (world) coordinates
      x = (centerClientX - PAN.x) / ZOOM.current;
      y = (centerClientY - PAN.y) / ZOOM.current;
    }
  } catch (err) {
    // If anything fails, we'll fall back to a random visible-ish position
    x = undefined;
    y = undefined;
  }

  if (typeof x !== 'number' || typeof y !== 'number' || Number.isNaN(x) || Number.isNaN(y)) {
    x = Math.random() * 300 + 100;
    y = Math.random() * 200 + 100;
  }

  // Keep a snapshot of existing node ids to detect the inserted node
  const editor = window.DrawflowEditor.editor;
  const beforeIds = Object.keys(editor.drawflow?.drawflow?.Home?.data || {});
  editor.addNode(tmpl.name, tmpl.inputs, tmpl.outputs, x, y, tmpl.class, tmpl.data, tmpl.html);

  // Small timeout to allow DOM to be updated; then adjust node so its center matches the viewport center
  setTimeout(() => {
    try {
      const afterIds = Object.keys(editor.drawflow?.drawflow?.Home?.data || {});
      const newId = afterIds.find((id) => beforeIds.indexOf(id) === -1);
      if (!newId) return;
      const nodeEl = document.getElementById('node-' + newId);
      if (!nodeEl) return;
      const nodeWidth = nodeEl.offsetWidth || 0;
      const nodeHeight = nodeEl.offsetHeight || 0;
      // Shift position so node center lines up with the previously computed world center
      const data = editor.drawflow.drawflow.Home.data[newId];
      if (!data) return;
      const halfW = Math.round(nodeWidth / 2);
      const halfH = Math.round(nodeHeight / 2);
      data.pos_x = Math.round((data.pos_x || 0) - halfW);
      data.pos_y = Math.round((data.pos_y || 0) - halfH);
      nodeEl.style.left = data.pos_x + 'px';
      nodeEl.style.top = data.pos_y + 'px';
      editor.updateConnectionNodes('node-' + newId);
    } catch (err) {
      // Silent fallback — no further action
    }
  }, 10);
}

function exportGraph() {
  const data = window.DrawflowEditor.editor.export();
  // Debug: log the node settings for condition nodes to help trace invertSignal propagation
  try {
    const nodes = data.drawflow?.Home?.data || {};
    Object.keys(nodes).forEach((id) => {
      const n = nodes[id];
      if ((n.class || '').includes('condition-node') || (n.class || '').includes('condition')) {
        window.DrawflowEditor.debugLog &&
          window.DrawflowEditor.debugLog(
            '[Web EXPORT] Node',
            id,
            'settings=',
            n.data?.settings || n.data || {}
          );
      }
    });
  } catch (err) {
    // Silently ignore debug errors
  }
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'EXPORT',
        payload: data,
      })
    );
  }
}

function clearGraph() {
  window.DrawflowEditor.editor.clear();
  setTimeout(() => window.DrawflowEditor.analyzeGraph(), 100);
}

// Expose helpers used by other modules
window.DrawflowEditor = window.DrawflowEditor || {};
window.DrawflowEditor.createNodeTemplate = createNodeTemplate;
window.DrawflowEditor.addNode = addNode;
window.DrawflowEditor.exportGraph = exportGraph;
window.DrawflowEditor.clearGraph = clearGraph;
window.DrawflowEditor.formatDelayLabel = formatDelayLabel;
window.DrawflowEditor.normalizeSecondsInput = normalizeSecondsInput;
window.DrawflowEditor.parseSecondsValue = parseSecondsValue;
