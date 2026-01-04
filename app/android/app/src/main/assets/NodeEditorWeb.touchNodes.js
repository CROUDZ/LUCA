/* global confirm */
// GESTION DES NŒUDS - SYSTÈME DE LIAISON SIMPLIFIÉ
// Nouveau système : toucher une node pour la sélectionner, toucher une autre pour créer une connexion
// Plus besoin de manipuler les anchors - tout est automatique !

const NODE_DRAG = { active: false, node: null, startX: 0, startY: 0, nodeX: 0, nodeY: 0 };
const TAP = { time: 0, node: null, delay: 300 };
const LONG_PRESS_NODE = { timer: null, delay: 800, node: null, startX: 0, startY: 0 };
const LONG_PRESS_CONNECTION = { timer: null, delay: 800, connection: null, startX: 0, startY: 0 };

// Système de liaison simplifié
const LINK_MODE = {
  selectedNode: null,      // Le premier node sélectionné pour la liaison
  selectedNodeId: null,    // ID du premier node
  tapThreshold: 200,       // Temps max pour un tap rapide (ms)
  moveThreshold: 15,       // Distance max pour considérer un tap (px)
  tapStartTime: 0,
  tapStartX: 0,
  tapStartY: 0,
  isTap: false,
};

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

/**
 * Calcule la distance minimale entre un point et un chemin SVG (courbe de Bézier)
 * Utilise une méthode optimisée avec échantillonnage adaptatif
 * @param {number} px - Position X du point (coordonnées canvas)
 * @param {number} py - Position Y du point (coordonnées canvas)
 * @param {SVGPathElement} path - L'élément path SVG
 * @returns {number} - Distance minimale en pixels
 */
function getDistanceToPath(px, py, path) {
  try {
    const totalLength = path.getTotalLength();
    if (totalLength === 0) return Infinity;
    
    let minDistance = Infinity;
    
    // Premier passage : échantillonnage grossier
    const coarseStep = Math.max(20, totalLength / 20);
    let bestLength = 0;
    
    for (let i = 0; i <= totalLength; i += coarseStep) {
      const point = path.getPointAtLength(i);
      const dx = px - point.x;
      const dy = py - point.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        minDistance = distance;
        bestLength = i;
      }
    }
    
    // Deuxième passage : affinage autour du meilleur point
    const fineStart = Math.max(0, bestLength - coarseStep);
    const fineEnd = Math.min(totalLength, bestLength + coarseStep);
    const fineStep = 5;
    
    for (let i = fineStart; i <= fineEnd; i += fineStep) {
      const point = path.getPointAtLength(i);
      const dx = px - point.x;
      const dy = py - point.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    
    return minDistance;
  } catch (e) {
    return Infinity;
  }
}

/**
 * Convertit les coordonnées écran en coordonnées canvas
 */
function screenToCanvas(screenX, screenY) {
  const container = document.getElementById('drawflow');
  if (!container) return { x: screenX, y: screenY };
  
  const containerRect = container.getBoundingClientRect();
  const zoom = window.DrawflowEditor?.ZOOM?.current || 1;
  const pan = window.DrawflowEditor?.PAN || { x: 0, y: 0 };
  
  return {
    x: (screenX - containerRect.left - pan.x) / zoom,
    y: (screenY - containerRect.top - pan.y) / zoom
  };
}

/**
 * Trouve la connexion la plus proche d'un point de touch
 * @param {number} touchX - Position X du touch (coordonnées écran)
 * @param {number} touchY - Position Y du touch (coordonnées écran)
 * @param {number} maxDistance - Distance maximale pour considérer une connexion (en pixels canvas)
 * @returns {{connection: Element|null, distance: number}} - La connexion la plus proche et sa distance
 */
function findNearestConnection(touchX, touchY, maxDistance = 70) {
  const container = document.getElementById('drawflow');
  if (!container) return { connection: null, distance: Infinity };
  
  const { x: canvasX, y: canvasY } = screenToCanvas(touchX, touchY);
  
  const connections = container.querySelectorAll('.connection');
  let nearestConnection = null;
  let nearestDistance = maxDistance;
  
  connections.forEach(connection => {
    const path = connection.querySelector('.main-path');
    if (!path) return;
    
    const distance = getDistanceToPath(canvasX, canvasY, path);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestConnection = connection;
    }
  });
  
  return { connection: nearestConnection, distance: nearestDistance };
}

/**
 * Met en surbrillance la connexion la plus proche (feedback visuel)
 */
function highlightNearestConnection(touchX, touchY) {
  // Retirer la surbrillance précédente
  document.querySelectorAll('.connection.hover-highlight').forEach(c => {
    c.classList.remove('hover-highlight');
  });
  
  const { connection, distance } = findNearestConnection(touchX, touchY, 70);
  
  if (connection && distance < 70) {
    connection.classList.add('hover-highlight');
    return connection;
  }
  
  return null;
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
  return outputKeys.length > 0 ? outputKeys[0] : null;
}

/**
 * Sélectionne un node pour commencer la liaison
 * @param {HTMLElement} node - L'élément DOM du node
 * @param {string} nodeId - L'ID du node
 */
function selectNodeForLink(node, nodeId) {
  // Désélectionner le précédent si existant
  clearLinkSelection();
  
  LINK_MODE.selectedNode = node;
  LINK_MODE.selectedNodeId = nodeId;
  node.classList.add('link-source-selected');
  
  // Ajouter une classe au body pour indiquer qu'on est en mode liaison
  document.body.classList.add('link-mode-active');
  
  vibrate(40);
  
  // Feedback visuel : tous les autres nodes deviennent des cibles potentielles
  document.querySelectorAll('.drawflow-node').forEach(n => {
    if (n !== node) {
      n.classList.add('link-target-available');
    }
  });
}

/**
 * Annule la sélection de liaison en cours
 */
function clearLinkSelection() {
  if (LINK_MODE.selectedNode) {
    LINK_MODE.selectedNode.classList.remove('link-source-selected');
  }
  
  // Retirer les classes de tous les nodes
  document.querySelectorAll('.drawflow-node').forEach(n => {
    n.classList.remove('link-source-selected');
    n.classList.remove('link-target-available');
  });
  
  document.body.classList.remove('link-mode-active');
  
  LINK_MODE.selectedNode = null;
  LINK_MODE.selectedNodeId = null;
}

/**
 * Crée une connexion entre deux nodes
 * @param {string} sourceNodeId - ID du node source
 * @param {string} targetNodeId - ID du node cible
 * @returns {boolean} - True si la connexion a réussi
 */
function createConnectionBetweenNodes(sourceNodeId, targetNodeId) {
  try {
    // Trouver les anchors disponibles
    const sourceOutput = findFirstAvailableOutput(sourceNodeId);
    const targetInput = findFirstAvailableInput(targetNodeId);
    
    if (!sourceOutput || !targetInput) {
      console.warn('Impossible de créer la connexion: anchors non trouvés');
      return false;
    }
    
    window.DrawflowEditor.editor.addConnection(
      parseInt(sourceNodeId, 10),
      parseInt(targetNodeId, 10),
      sourceOutput,
      targetInput
    );
    
    window.DrawflowEditor.analyzeGraph();
    window.DrawflowEditor.updateConnectedInputs();
    
    vibrate([30, 20, 30]); // Double vibration pour confirmer
    
    return true;
  } catch (err) {
    console.error('Erreur lors de la création de la connexion:', err);
    return false;
  }
}

/**
 * Supprime une connexion entre deux nodes
 */
function removeConnection(sourceNodeId, targetNodeId, outputName, inputName) {
  try {
    window.DrawflowEditor.editor.removeSingleConnection(
      sourceNodeId,
      parseInt(targetNodeId, 10),
      outputName,
      inputName
    );
    window.DrawflowEditor.analyzeGraph();
    window.DrawflowEditor.updateConnectedInputs();
  } catch (err) {
    console.error('Error removing connection:', err);
  }
}

/**
 * Supprime une connexion à partir de son élément SVG
 * @param {SVGElement} connectionElement - L'élément SVG de la connexion
 */
function removeConnectionByElement(connectionElement) {
  try {
    // Extraire les infos de la connexion depuis les classes
    const classList = connectionElement.classList;
    let nodeIn = null;
    let nodeOut = null;
    let inputClass = null;
    let outputClass = null;
    
    classList.forEach(cls => {
      if (cls.startsWith('node_in_node-')) {
        nodeIn = cls.replace('node_in_node-', '');
      } else if (cls.startsWith('node_out_node-')) {
        nodeOut = cls.replace('node_out_node-', '');
      } else if (cls.startsWith('input_')) {
        inputClass = cls;
      } else if (cls.startsWith('output_')) {
        outputClass = cls;
      }
    });
    
    if (nodeIn && nodeOut && inputClass && outputClass) {
      window.DrawflowEditor.editor.removeSingleConnection(
        parseInt(nodeOut, 10),
        parseInt(nodeIn, 10),
        outputClass,
        inputClass
      );
      window.DrawflowEditor.analyzeGraph();
      window.DrawflowEditor.updateConnectedInputs();
      vibrate([40, 30, 40]);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error removing connection by element:', err);
    return false;
  }
}

/**
 * Duplique un node
 */
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
  window.DrawflowEditor.editor.addNode(
    name,
    inputsCount,
    outputsCount,
    newX,
    newY,
    klass,
    nodeData,
    html
  );
  setTimeout(() => {
    window.DrawflowEditor.analyzeGraph();
  }, 10);
  return true;
}

/**
 * Vérifie si un tap est un tap rapide (vs un drag ou long press)
 */
function isTapGesture(startTime, startX, startY, endX, endY) {
  const elapsed = Date.now() - startTime;
  const dx = Math.abs(endX - startX);
  const dy = Math.abs(endY - startY);
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return elapsed < LINK_MODE.tapThreshold && distance < LINK_MODE.moveThreshold;
}

// ============================================
// GESTION DES ÉVÉNEMENTS TACTILES
// ============================================

document.addEventListener(
  'touchstart',
  (e) => {
    if (shouldIgnoreForPinch(e)) {
      return;
    }
    
    // Ignorer les événements sur les contrôles interactifs (sauf en mode liaison)
    const isLinkModeActive = LINK_MODE.selectedNodeId !== null;
    
    if (
      e.target.closest('.invert-signal-toggle') ||
      e.target.closest('.switch-label') ||
      e.target.closest('.condition-invert-control') ||
      e.target.closest('.delay-control') ||
      e.target.closest('.switch-mode-toggle') ||
      e.target.closest('.timer-duration-input') ||
      e.target.closest('.toggle-switch') ||
      e.target.closest('.condition-settings') ||
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'SELECT' ||
      e.target.tagName === 'TEXTAREA'
    ) {
      // En mode liaison, on bloque les inputs mais on permet le tap sur le node parent
      if (isLinkModeActive) {
        e.preventDefault();
        e.stopPropagation();
        // Continuer pour permettre la liaison avec le node parent
      } else {
        return;
      }
    }

    const touch = e.touches[0];
    const node = e.target.closest('.drawflow-node');
    let connection = e.target.closest('.connection');
    
    // Si pas de connexion directement touchée et pas sur un node, chercher une connexion proche
    // Zone de détection très large (70px) pour faciliter la sélection
    if (!connection && !node && !isLinkModeActive) {
      const result = findNearestConnection(touch.clientX, touch.clientY, 70);
      connection = result.connection;
      
      // Feedback visuel immédiat si une connexion est détectée
      if (connection) {
        connection.classList.add('hover-highlight');
        vibrate(20); // Petite vibration pour confirmer la détection
      }
    }
    
    // Gestion du long press sur une connexion pour la supprimer
    if (connection && !isLinkModeActive) {
      LONG_PRESS_CONNECTION.startX = touch.clientX;
      LONG_PRESS_CONNECTION.startY = touch.clientY;
      LONG_PRESS_CONNECTION.connection = connection;
      LONG_PRESS_CONNECTION.timer = setTimeout(() => {
        // eslint-disable-next-line no-alert
        if (confirm('Supprimer cette liaison ?')) {
          removeConnectionByElement(LONG_PRESS_CONNECTION.connection);
        }
        LONG_PRESS_CONNECTION.timer = null;
        LONG_PRESS_CONNECTION.connection = null;
      }, LONG_PRESS_CONNECTION.delay);
      e.preventDefault();
      return;
    }
    
    // Enregistrer le début du tap
    LINK_MODE.tapStartTime = Date.now();
    LINK_MODE.tapStartX = touch.clientX;
    LINK_MODE.tapStartY = touch.clientY;
    LINK_MODE.isTap = true;

    // Double-tap pour dupliquer
    if (node) {
      const now = Date.now();
      const nodeId = node.id.replace('node-', '');

      if (TAP.node === nodeId && now - TAP.time < TAP.delay) {
        // Double-tap détecté: dupliquer le node
        duplicateNode(nodeId);
        clearLinkSelection();
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

    // Setup long-press for node deletion (hold 800ms without moving)
    if (node) {
      LONG_PRESS_NODE.startX = touch.clientX;
      LONG_PRESS_NODE.startY = touch.clientY;
      LONG_PRESS_NODE.node = node.id.replace('node-', '');
      LONG_PRESS_NODE.timer = setTimeout(() => {
        const nodeId = LONG_PRESS_NODE.node;
        // eslint-disable-next-line no-alert
        if (confirm('Supprimer ce nœud ?')) {
          try {
            window.DrawflowEditor.editor.removeNodeId('node-' + nodeId);
            window.DrawflowEditor.analyzeGraph();
            clearLinkSelection();
          } catch (err) {
            console.error('Error removing node via long-press:', err);
          }
        }
        LONG_PRESS_NODE.timer = null;
        LONG_PRESS_NODE.node = null;
      }, LONG_PRESS_NODE.delay);
    }

    // Déplacement de nœud (préparation)
    if (node) {
      NODE_DRAG.active = true;
      NODE_DRAG.node = node;
      NODE_DRAG.startX = touch.clientX;
      NODE_DRAG.startY = touch.clientY;

      const nodeId = node.id.replace('node-', '');
      const data = window.DrawflowEditor.editor.drawflow.drawflow.Home.data[nodeId];
      if (data) {
        NODE_DRAG.nodeX = data.pos_x;
        NODE_DRAG.nodeY = data.pos_y;
      }
    }
  },
  { passive: false }
);

document.addEventListener(
  'touchmove',
  (e) => {
    if (shouldIgnoreForPinch(e)) {
      return;
    }
    
    const touch = e.touches[0];
    
    // Vérifier si le mouvement dépasse le seuil de tap
    if (LINK_MODE.isTap) {
      const dx = Math.abs(touch.clientX - LINK_MODE.tapStartX);
      const dy = Math.abs(touch.clientY - LINK_MODE.tapStartY);
      if (dx > LINK_MODE.moveThreshold || dy > LINK_MODE.moveThreshold) {
        LINK_MODE.isTap = false;
      }
    }
    
    // Cancel node long press if user moves finger
    if (LONG_PRESS_NODE.timer) {
      const dx = Math.abs(touch.clientX - LONG_PRESS_NODE.startX);
      const dy = Math.abs(touch.clientY - LONG_PRESS_NODE.startY);
      const moved = Math.sqrt(dx * dx + dy * dy) > 5;
      if (moved) {
        clearTimeout(LONG_PRESS_NODE.timer);
        LONG_PRESS_NODE.timer = null;
        LONG_PRESS_NODE.node = null;
      }
    }
    
    // Cancel connection long press if user moves finger
    if (LONG_PRESS_CONNECTION.timer) {
      const dx = Math.abs(touch.clientX - LONG_PRESS_CONNECTION.startX);
      const dy = Math.abs(touch.clientY - LONG_PRESS_CONNECTION.startY);
      const moved = Math.sqrt(dx * dx + dy * dy) > 5;
      if (moved) {
        clearTimeout(LONG_PRESS_CONNECTION.timer);
        LONG_PRESS_CONNECTION.timer = null;
        // Retirer la surbrillance de la connexion
        if (LONG_PRESS_CONNECTION.connection) {
          LONG_PRESS_CONNECTION.connection.classList.remove('hover-highlight');
        }
        LONG_PRESS_CONNECTION.connection = null;
      }
    }

    // Déplacement de nœud
    if (NODE_DRAG.active && NODE_DRAG.node && !LINK_MODE.isTap) {
      NODE_DRAG.node.classList.add('dragging');
      
      const dx = (touch.clientX - NODE_DRAG.startX) / window.DrawflowEditor.ZOOM.current;
      const dy = (touch.clientY - NODE_DRAG.startY) / window.DrawflowEditor.ZOOM.current;

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
  },
  { passive: false }
);

document.addEventListener(
  'touchend',
  (e) => {
    if (shouldIgnoreForPinch(e)) {
      return;
    }
    
    // Annuler les timers
    if (LONG_PRESS_NODE.timer) {
      clearTimeout(LONG_PRESS_NODE.timer);
      LONG_PRESS_NODE.timer = null;
      LONG_PRESS_NODE.node = null;
    }
    
    if (LONG_PRESS_CONNECTION.timer) {
      clearTimeout(LONG_PRESS_CONNECTION.timer);
      LONG_PRESS_CONNECTION.timer = null;
    }
    
    // Toujours retirer la surbrillance des connexions au touchend
    document.querySelectorAll('.connection.hover-highlight').forEach(c => {
      c.classList.remove('hover-highlight');
    });
    LONG_PRESS_CONNECTION.connection = null;

    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const node = element?.closest('.drawflow-node');
    
    // Vérifier si c'était un tap rapide
    const wasTap = LINK_MODE.isTap && isTapGesture(
      LINK_MODE.tapStartTime,
      LINK_MODE.tapStartX,
      LINK_MODE.tapStartY,
      touch.clientX,
      touch.clientY
    );
    
    if (wasTap) {
      if (node) {
        const nodeId = node.id.replace('node-', '');
        
        // Si un node est déjà sélectionné
        if (LINK_MODE.selectedNodeId) {
          // Si c'est le même node, désélectionner
          if (LINK_MODE.selectedNodeId === nodeId) {
            clearLinkSelection();
          } else {
            // Créer une connexion entre les deux nodes
            const success = createConnectionBetweenNodes(LINK_MODE.selectedNodeId, nodeId);
            clearLinkSelection();
            
            if (!success) {
              // Montrer un feedback d'erreur si la connexion échoue
              node.classList.add('link-error');
              setTimeout(() => node.classList.remove('link-error'), 300);
            }
          }
        } else {
          // Sélectionner ce node comme source
          selectNodeForLink(node, nodeId);
        }
        
        e.preventDefault();
      } else {
        // Tap dans le vide - annuler la sélection
        if (LINK_MODE.selectedNodeId) {
          clearLinkSelection();
          vibrate(20);
        }
      }
    }

    // Fin du déplacement de nœud
    if (NODE_DRAG.active && NODE_DRAG.node) {
      NODE_DRAG.node.classList.remove('dragging');
      NODE_DRAG.active = false;
      NODE_DRAG.node = null;
    }
    
    LINK_MODE.isTap = false;
  },
  { passive: false }
);

document.addEventListener(
  'touchcancel',
  () => {
    if (LONG_PRESS_NODE.timer) {
      clearTimeout(LONG_PRESS_NODE.timer);
      LONG_PRESS_NODE.timer = null;
      LONG_PRESS_NODE.node = null;
    }
    
    if (LONG_PRESS_CONNECTION.timer) {
      clearTimeout(LONG_PRESS_CONNECTION.timer);
      LONG_PRESS_CONNECTION.timer = null;
    }
    
    // Retirer toutes les surbrillances de connexions
    document.querySelectorAll('.connection.hover-highlight').forEach(c => {
      c.classList.remove('hover-highlight');
    });
    LONG_PRESS_CONNECTION.connection = null;

    if (NODE_DRAG.active && NODE_DRAG.node) {
      NODE_DRAG.node.classList.remove('dragging');
      NODE_DRAG.active = false;
      NODE_DRAG.node = null;
    }
    
    LINK_MODE.isTap = false;
  },
  { passive: false }
);

// ============================================
// GESTION DES CLICS SOURIS (Desktop)
// ============================================

document.addEventListener('click', (e) => {
  // Ignorer les contrôles interactifs
  if (
    e.target.closest('.invert-signal-toggle') ||
    e.target.closest('.switch-label') ||
    e.target.closest('.condition-invert-control') ||
    e.target.closest('.delay-control') ||
    e.target.closest('.toggle-switch') ||
    e.target.closest('.condition-settings') ||
    e.target.tagName === 'INPUT' ||
    e.target.tagName === 'SELECT' ||
    e.target.tagName === 'TEXTAREA'
  ) {
    return;
  }

  const node = e.target.closest('.drawflow-node');
  
  if (node) {
    const nodeId = node.id.replace('node-', '');
    
    // Si un node est déjà sélectionné
    if (LINK_MODE.selectedNodeId) {
      // Si c'est le même node, désélectionner
      if (LINK_MODE.selectedNodeId === nodeId) {
        clearLinkSelection();
      } else {
        // Créer une connexion
        const success = createConnectionBetweenNodes(LINK_MODE.selectedNodeId, nodeId);
        clearLinkSelection();
        
        if (!success) {
          node.classList.add('link-error');
          setTimeout(() => node.classList.remove('link-error'), 300);
        }
      }
    } else {
      // Sélectionner ce node comme source
      selectNodeForLink(node, nodeId);
    }
    
    e.stopPropagation();
  } else {
    // Clic dans le vide - annuler la sélection
    if (LINK_MODE.selectedNodeId) {
      clearLinkSelection();
    }
  }
});

// Double-clic pour dupliquer (Desktop)
document.addEventListener('dblclick', (ev) => {
  const node = ev.target.closest('.drawflow-node');
  if (node && node.id) {
    const nodeId = node.id.replace('node-', '');
    duplicateNode(nodeId);
    clearLinkSelection();
    ev.preventDefault();
    ev.stopPropagation();
  }
});

// ============================================
// EXPOSE FUNCTIONS
// ============================================

window.DrawflowEditor = window.DrawflowEditor || {};
window.DrawflowEditor.removeConnection = removeConnection;
window.DrawflowEditor.removeConnectionByElement = removeConnectionByElement;
window.DrawflowEditor.duplicateNode = duplicateNode;
window.DrawflowEditor.findFirstAvailableInput = findFirstAvailableInput;
window.DrawflowEditor.findFirstAvailableOutput = findFirstAvailableOutput;
window.DrawflowEditor.selectNodeForLink = selectNodeForLink;
window.DrawflowEditor.clearLinkSelection = clearLinkSelection;
window.DrawflowEditor.createConnectionBetweenNodes = createConnectionBetweenNodes;
window.DrawflowEditor.findNearestConnection = findNearestConnection;
