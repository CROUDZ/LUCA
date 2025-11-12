/**
 * Script de démonstration du système de signaux
 * 
 * Pour exécuter: npx ts-node src/demo/runSignalDemo.ts
 */

import '../engine/nodes'; // Charger toutes les nodes
import { initializeSignalSystem } from '../engine/SignalSystem';
import { setFlashlightState } from '../engine/nodes/FlashLightNode';
import { triggerNode } from '../engine/nodes/TriggerNode';
import { getPingCount, resetPingCount } from '../engine/nodes/PingNode';
import { parseDrawflowGraph } from '../engine/engine';
import type { DrawflowExport } from '../types';

async function runDemo() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   DÉMONSTRATION DU SYSTÈME DE SIGNAUX         ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // Créer un graphe simple: Trigger -> FlashLight -> Ping
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
            name: 'FlashLight Check',
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
            name: 'Ping Action',
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

  console.log('📊 Création du graphe...');
  const graph = parseDrawflowGraph(drawflowData);
  console.log(`   ✓ ${graph.nodes.size} nodes créées`);
  console.log(`   ✓ ${graph.edges.length} connexions\n`);

  console.log('🔧 Initialisation du système de signaux...');
  const signalSystem = initializeSignalSystem(graph);
  console.log('   ✓ Système initialisé\n');

  // Scénario 1: Lampe désactivée
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📱 SCÉNARIO 1: Lampe torche DÉSACTIVÉE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  resetPingCount();
  setFlashlightState(false);
  console.log('💡 État de la lampe: ❌ OFF');
  console.log('🚀 Déclenchement du signal...\n');
  
  triggerNode(1, { test: 'scenario_1' });
  await new Promise(resolve => setTimeout(resolve, 300));
  
  console.log(`\n📊 Résultat: ${getPingCount()} ping(s) reçu(s)`);
  console.log('   ℹ️  Le signal a été BLOQUÉ par la condition FlashLight\n');

  // Scénario 2: Lampe activée
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📱 SCÉNARIO 2: Lampe torche ACTIVÉE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  resetPingCount();
  setFlashlightState(true);
  console.log('💡 État de la lampe: ✅ ON');
  console.log('🚀 Déclenchement du signal...\n');
  
  triggerNode(1, { test: 'scenario_2' });
  await new Promise(resolve => setTimeout(resolve, 300));
  
  console.log(`\n📊 Résultat: ${getPingCount()} ping(s) reçu(s)`);
  console.log('   ℹ️  Le signal a été PROPAGÉ avec succès!\n');

  // Scénario 3: Signaux multiples
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📱 SCÉNARIO 3: Signaux multiples');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  resetPingCount();
  setFlashlightState(true);
  console.log('💡 État de la lampe: ✅ ON');
  console.log('🚀 Déclenchement de 5 signaux...\n');
  
  for (let i = 1; i <= 5; i++) {
    triggerNode(1, { test: `signal_${i}` });
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log(`\n📊 Résultat: ${getPingCount()} ping(s) reçu(s)`);
  console.log('   ℹ️  Tous les signaux ont été traités!\n');

  // Statistiques finales
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 STATISTIQUES DU SYSTÈME');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const stats = signalSystem.getStats();
  console.log(`   Handlers enregistrés: ${stats.registeredHandlers}`);
  console.log(`   Signaux en attente:   ${stats.queuedSignals}`);
  console.log(`   Traitement en cours:  ${stats.isProcessing ? 'Oui' : 'Non'}`);
  
  console.log('\n✅ Démonstration terminée!\n');
}

// Exécuter la démo
runDemo().catch(console.error);

export default runDemo;
