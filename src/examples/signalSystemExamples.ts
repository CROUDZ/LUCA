/**
 * Exemple d'utilisation du système de signaux
 * 
 * Ce fichier démontre comment créer et utiliser un graphe avec le système de signaux
 */

import { initializeSignalSystem } from '../engine/SignalSystem';
import { setFlashlightState } from '../engine/nodes/FlashLightNode';
import { triggerNode } from '../engine/nodes/TriggerNode';
import { getPingCount } from '../engine/nodes/PingNode';
import { parseDrawflowGraph } from '../engine/engine';
import type { DrawflowExport } from '../types';

/**
 * Exemple 1: Graphe simple Trigger -> FlashLight -> Ping
 */
export async function example1_SimpleConditionChain() {
  console.log('\n=== EXEMPLE 1: Chaîne simple avec condition ===\n');

  // Créer un graphe Drawflow
  const drawflowData: DrawflowExport = {
    drawflow: {
      Home: {
        data: {
          '1': {
            id: 1,
            name: 'Trigger',
            data: { type: 'input.trigger' },
            class: 'trigger-node',
            html: '',
            typenode: false,
            inputs: {},
            outputs: {
              output_1: {
                connections: [{ node: '2', output: 'input_1' }],
              },
            },
            pos_x: 100,
            pos_y: 100,
          },
          '2': {
            id: 2,
            name: 'FlashLight',
            data: { type: 'condition.flashlight' },
            class: 'condition-node',
            html: '',
            typenode: false,
            inputs: {
              input_1: {
                connections: [{ node: '1', input: 'output_1' }],
              },
            },
            outputs: {
              output_1: {
                connections: [{ node: '3', output: 'input_1' }],
              },
            },
            pos_x: 300,
            pos_y: 100,
          },
          '3': {
            id: 3,
            name: 'Ping',
            data: { type: 'action.ping' },
            class: 'action-node',
            html: '',
            typenode: false,
            inputs: {
              input_1: {
                connections: [{ node: '2', input: 'output_1' }],
              },
            },
            outputs: {},
            pos_x: 500,
            pos_y: 100,
          },
        },
      },
    },
  };

  // Parser le graphe
  const graph = parseDrawflowGraph(drawflowData);
  console.log('Graphe créé avec', graph.nodes.size, 'nodes');

  // Initialiser le système de signaux
  const signalSystem = initializeSignalSystem(graph);
  console.log('Système de signaux initialisé');

  // Exécuter les nodes pour enregistrer les handlers
  // (Dans une vraie app, cela serait fait automatiquement)
  
  console.log('\n--- Test 1: Lampe torche DÉSACTIVÉE ---');
  setFlashlightState(false);
  triggerNode(1, { message: 'Test 1' });
  await new Promise(resolve => setTimeout(resolve, 200));
  console.log('Pings reçus:', getPingCount());

  console.log('\n--- Test 2: Lampe torche ACTIVÉE ---');
  setFlashlightState(true);
  triggerNode(1, { message: 'Test 2' });
  await new Promise(resolve => setTimeout(resolve, 200));
  console.log('Pings reçus:', getPingCount());

  console.log('\n--- Test 3: Plusieurs signaux avec lampe activée ---');
  setFlashlightState(true);
  triggerNode(1, { message: 'Test 3a' });
  triggerNode(1, { message: 'Test 3b' });
  triggerNode(1, { message: 'Test 3c' });
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('Pings reçus:', getPingCount());

  const stats = signalSystem.getStats();
  console.log('\nStatistiques du système:', stats);
}

/**
 * Exemple 2: Graphe avec plusieurs branches
 * Trigger -> FlashLight -> Ping1
 *                       -> Ping2
 */
export async function example2_MultipleBranches() {
  console.log('\n=== EXEMPLE 2: Branches multiples ===\n');

  const drawflowData: DrawflowExport = {
    drawflow: {
      Home: {
        data: {
          '1': {
            id: 1,
            name: 'Trigger',
            data: { type: 'input.trigger' },
            class: 'trigger-node',
            html: '',
            typenode: false,
            inputs: {},
            outputs: {
              output_1: {
                connections: [{ node: '2', output: 'input_1' }],
              },
            },
            pos_x: 100,
            pos_y: 150,
          },
          '2': {
            id: 2,
            name: 'FlashLight',
            data: { type: 'condition.flashlight' },
            class: 'condition-node',
            html: '',
            typenode: false,
            inputs: {
              input_1: {
                connections: [{ node: '1', input: 'output_1' }],
              },
            },
            outputs: {
              output_1: {
                connections: [
                  { node: '3', output: 'input_1' },
                  { node: '4', output: 'input_1' },
                ],
              },
            },
            pos_x: 300,
            pos_y: 150,
          },
          '3': {
            id: 3,
            name: 'Ping1',
            data: { type: 'action.ping' },
            class: 'action-node',
            html: '',
            typenode: false,
            inputs: {
              input_1: {
                connections: [{ node: '2', input: 'output_1' }],
              },
            },
            outputs: {},
            pos_x: 500,
            pos_y: 100,
          },
          '4': {
            id: 4,
            name: 'Ping2',
            data: { type: 'action.ping' },
            class: 'action-node',
            html: '',
            typenode: false,
            inputs: {
              input_1: {
                connections: [{ node: '2', input: 'output_1' }],
              },
            },
            outputs: {},
            pos_x: 500,
            pos_y: 200,
          },
        },
      },
    },
  };

  const graph = parseDrawflowGraph(drawflowData);
  initializeSignalSystem(graph);

  console.log('--- Test avec lampe activée (devrait déclencher 2 pings) ---');
  setFlashlightState(true);
  triggerNode(1, { message: 'Multi-branch test' });
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('Total pings:', getPingCount());
}

/**
 * Exemple 3: Chaîne d'actions
 * Trigger -> Ping1 -> Ping2 -> Ping3
 */
export async function example3_ActionChain() {
  console.log('\n=== EXEMPLE 3: Chaîne d\'actions ===\n');

  const drawflowData: DrawflowExport = {
    drawflow: {
      Home: {
        data: {
          '1': {
            id: 1,
            name: 'Trigger',
            data: { type: 'input.trigger' },
            class: 'trigger-node',
            html: '',
            typenode: false,
            inputs: {},
            outputs: {
              output_1: {
                connections: [{ node: '2', output: 'input_1' }],
              },
            },
            pos_x: 100,
            pos_y: 100,
          },
          '2': {
            id: 2,
            name: 'Ping1',
            data: { type: 'action.ping' },
            class: 'action-node',
            html: '',
            typenode: false,
            inputs: {
              input_1: {
                connections: [{ node: '1', input: 'output_1' }],
              },
            },
            outputs: {
              output_1: {
                connections: [{ node: '3', output: 'input_1' }],
              },
            },
            pos_x: 250,
            pos_y: 100,
          },
          '3': {
            id: 3,
            name: 'Ping2',
            data: { type: 'action.ping' },
            class: 'action-node',
            html: '',
            typenode: false,
            inputs: {
              input_1: {
                connections: [{ node: '2', input: 'output_1' }],
              },
            },
            outputs: {
              output_1: {
                connections: [{ node: '4', output: 'input_1' }],
              },
            },
            pos_x: 400,
            pos_y: 100,
          },
          '4': {
            id: 4,
            name: 'Ping3',
            data: { type: 'action.ping' },
            class: 'action-node',
            html: '',
            typenode: false,
            inputs: {
              input_1: {
                connections: [{ node: '3', input: 'output_1' }],
              },
            },
            outputs: {},
            pos_x: 550,
            pos_y: 100,
          },
        },
      },
    },
  };

  const graph = parseDrawflowGraph(drawflowData);
  initializeSignalSystem(graph);

  console.log('--- Déclenchement de la chaîne ---');
  triggerNode(1, { message: 'Chain test' });
  await new Promise(resolve => setTimeout(resolve, 400));
  console.log('Total pings (devrait être 3):', getPingCount());
}

/**
 * Fonction pour exécuter tous les exemples
 */
export async function runAllExamples() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  EXEMPLES DU SYSTÈME DE SIGNAUX - LUCA       ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  await example1_SimpleConditionChain();
  await new Promise(resolve => setTimeout(resolve, 500));

  await example2_MultipleBranches();
  await new Promise(resolve => setTimeout(resolve, 500));

  await example3_ActionChain();

  console.log('\n✅ Tous les exemples terminés!\n');
}
