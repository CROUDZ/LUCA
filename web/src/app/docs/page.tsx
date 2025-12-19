'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'quickstart' | 'structure' | 'manifest' | 'code' | 'api' | 'permissions' | 'publish';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<Section>('quickstart');

  const sections: { id: Section; title: string; icon: string }[] = [
    { id: 'quickstart', title: 'Quickstart', icon: '🚀' },
    { id: 'structure', title: "Structure d'un mod", icon: '📁' },
    { id: 'manifest', title: 'Manifest.json', icon: '📋' },
    { id: 'code', title: 'Écrire le code', icon: '💻' },
    { id: 'api', title: 'API Runtime', icon: '⚡' },
    { id: 'permissions', title: 'Permissions', icon: '🔒' },
    { id: 'publish', title: 'Publier', icon: '📤' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">📦 Documentation des Mods LUCA</h1>
        <p className="text-gray-400 text-lg">
          Guide complet pour créer, tester et publier vos propres nodes personnalisés.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <nav className="lg:w-64 shrink-0">
          <div className="sticky top-8 bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Navigation</h3>
            <ul className="space-y-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      activeSection === section.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span>{section.icon}</span>
                    <span>{section.title}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <Link
                href="/mods/upload"
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>📤</span> Publier un mod
              </Link>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 lg:p-8">
            {activeSection === 'quickstart' && <QuickstartSection />}
            {activeSection === 'structure' && <StructureSection />}
            {activeSection === 'manifest' && <ManifestSection />}
            {activeSection === 'code' && <CodeSection />}
            {activeSection === 'api' && <ApiSection />}
            {activeSection === 'permissions' && <PermissionsSection />}
            {activeSection === 'publish' && <PublishSection />}
          </div>
        </main>
      </div>
    </div>
  );
}

// Composant pour les blocs de code
function CodeBlock({ language, children }: { language: string; children: string }) {
  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
        {language}
      </div>
      <pre className="bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm">
        <code className="text-green-400">{children}</code>
      </pre>
    </div>
  );
}

// Section Quickstart
function QuickstartSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">🚀 Quickstart en 5 minutes</h2>

      <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-4">
        <p className="text-blue-300">
          <strong>Prérequis :</strong> Node.js 18+ et connaissance de base de JavaScript/ES Modules
        </p>
      </div>

      <h3 className="text-xl font-semibold mt-8">Ce que vous pouvez faire</h3>
      <ul className="space-y-2 text-gray-300">
        <li className="flex items-center gap-2">
          <span className="text-green-500">✅</span> Créer de nouveaux types de nodes
        </li>
        <li className="flex items-center gap-2">
          <span className="text-green-500">✅</span> Implémenter de la logique personnalisée
        </li>
        <li className="flex items-center gap-2">
          <span className="text-green-500">✅</span> Stocker des données persistantes
        </li>
        <li className="flex items-center gap-2">
          <span className="text-green-500">✅</span> Faire des requêtes HTTP (avec permission)
        </li>
        <li className="flex items-center gap-2">
          <span className="text-green-500">✅</span> Interagir avec certains périphériques
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-8">Ce qui n&apos;est pas autorisé</h3>
      <ul className="space-y-2 text-gray-300">
        <li className="flex items-center gap-2">
          <span className="text-red-500">❌</span> Accéder au système de fichiers
        </li>
        <li className="flex items-center gap-2">
          <span className="text-red-500">❌</span> Exécuter des commandes système
        </li>
        <li className="flex items-center gap-2">
          <span className="text-red-500">❌</span> Modifier le code de LUCA
        </li>
        <li className="flex items-center gap-2">
          <span className="text-red-500">❌</span> Accéder aux données d&apos;autres mods
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-8">Étape 1 : Créer le manifest.json</h3>
      <CodeBlock language="json">{`{
  "manifest_version": 1,
  "name": "mon-premier-mod",
  "version": "1.0.0",
  "display_name": "Mon Premier Mod",
  "description": "Un mod qui double les valeurs",
  "author": {
    "name": "Votre Nom",
    "email": "votre@email.com"
  },
  "main": "main.mjs",
  "api_version": "1.0.0",
  "permissions": ["storage.read", "storage.write"],
  "node_types": [
    {
      "type": "doubler",
      "label": "Doubler",
      "category": "Math",
      "description": "Double la valeur d'entrée",
      "inputs": [
        { "id": "value", "label": "Valeur", "type": "number" }
      ],
      "outputs": [
        { "id": "result", "label": "Résultat", "type": "number" }
      ],
      "color": "#4CAF50"
    }
  ]
}`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8">Étape 2 : Créer le fichier main.mjs</h3>
      <CodeBlock language="javascript">{`// main.mjs - Point d'entrée du mod

export async function nodeInit(api) {
  api.log.info('Mon premier mod initialisé !');
}

export async function run({ nodeId, nodeType, inputs }, api) {
  const value = inputs.value || 0;
  const result = value * 2;
  
  api.log.debug(\`Doublé \${value} -> \${result}\`);
  
  return {
    outputs: { result }
  };
}

export async function onUnload(api) {
  api.log.info('Mod déchargé');
}`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8">Étape 3 : Publier 🎉</h3>
      <p className="text-gray-300">
        Votre mod est prêt ! Rendez-vous sur la page{' '}
        <Link href="/mods/upload" className="text-blue-400 hover:underline">
          Upload
        </Link>{' '}
        pour le publier.
      </p>
    </div>
  );
}

// Section Structure
function StructureSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">📁 Structure d&apos;un mod</h2>

      <CodeBlock language="text">{`mon-mod/
├── manifest.json      # Métadonnées obligatoires
├── main.mjs           # Point d'entrée (code principal)
├── README.md          # Documentation (recommandé)
├── LICENSE            # Licence (recommandé)
├── assets/            # Ressources optionnelles
│   └── icon.png
└── lib/               # Modules internes optionnels
    └── helpers.mjs`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8">Fichiers obligatoires</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4">Fichier</th>
              <th className="text-left py-3 px-4">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-700">
              <td className="py-3 px-4 font-mono text-blue-400">manifest.json</td>
              <td className="py-3 px-4 text-gray-300">
                Métadonnées, permissions, définition des nodes
              </td>
            </tr>
            <tr className="border-b border-gray-700">
              <td className="py-3 px-4 font-mono text-blue-400">main.mjs</td>
              <td className="py-3 px-4 text-gray-300">Code JavaScript ESM principal</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-xl font-semibold mt-8">Fichiers recommandés</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4">Fichier</th>
              <th className="text-left py-3 px-4">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-700">
              <td className="py-3 px-4 font-mono text-green-400">README.md</td>
              <td className="py-3 px-4 text-gray-300">Documentation pour les utilisateurs</td>
            </tr>
            <tr className="border-b border-gray-700">
              <td className="py-3 px-4 font-mono text-green-400">LICENSE</td>
              <td className="py-3 px-4 text-gray-300">Licence open-source</td>
            </tr>
            <tr className="border-b border-gray-700">
              <td className="py-3 px-4 font-mono text-green-400">CHANGELOG.md</td>
              <td className="py-3 px-4 text-gray-300">Historique des versions</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Section Manifest
function ManifestSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">📋 Le fichier manifest.json</h2>
      <p className="text-gray-300">
        Le manifest est le cœur de votre mod. Il définit toutes les métadonnées.
      </p>

      <h3 className="text-xl font-semibold mt-8">Champs obligatoires</h3>
      <CodeBlock language="json">{`{
  "manifest_version": 1,
  "name": "nom-du-mod",
  "version": "1.0.0",
  "display_name": "Nom Affiché",
  "description": "Description courte du mod",
  "author": {
    "name": "Votre Nom"
  },
  "main": "main.mjs",
  "api_version": "1.0.0",
  "permissions": [],
  "node_types": [],
  "compatibility": {
    "luca_min": "1.0.0"
  }
}`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8">Définir un node_type</h3>
      <CodeBlock language="json">{`{
  "node_types": [
    {
      "type": "identifiant-unique",
      "label": "Nom affiché",
      "category": "Catégorie",
      "description": "Description du node",
      "inputs": [
        {
          "id": "input1",
          "label": "Entrée 1",
          "type": "number",
          "required": true,
          "default": 0
        }
      ],
      "outputs": [
        {
          "id": "output1",
          "label": "Sortie 1",
          "type": "number"
        }
      ],
      "config": {
        "option1": true,
        "option2": "valeur"
      },
      "color": "#FF5722",
      "icon": "calculator"
    }
  ]
}`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8">Types de ports</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4">Type</th>
              <th className="text-left py-3 px-4">Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['any', "Accepte n'importe quel type"],
              ['number', 'Nombre (entier ou décimal)'],
              ['string', 'Chaîne de caractères'],
              ['boolean', 'Vrai/Faux'],
              ['object', 'Objet JSON'],
              ['array', 'Tableau'],
              ['signal', 'Signal de déclenchement'],
            ].map(([type, desc]) => (
              <tr key={type} className="border-b border-gray-700">
                <td className="py-3 px-4 font-mono text-purple-400">{type}</td>
                <td className="py-3 px-4 text-gray-300">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Section Code
function CodeSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">💻 Écrire le code du mod</h2>

      <h3 className="text-xl font-semibold mt-8">Cycle de vie</h3>
      <CodeBlock language="javascript">{`// 1. Initialisation (appelée une fois au chargement)
export async function nodeInit(api) {
  // Initialiser l'état, charger des données
}

// 2. Exécution (appelée à chaque trigger d'un node)
export async function run({ nodeId, nodeType, inputs, config }, api) {
  // Logique métier
  return { outputs: { ... } };
}

// 3. Déchargement (appelée avant fermeture)
export async function onUnload(api) {
  // Nettoyage, sauvegarde finale
}`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8">Paramètres de run()</h3>
      <CodeBlock language="javascript">{`export async function run(params, api) {
  const {
    nodeId,    // ID unique du node (ex: "node-abc123")
    nodeType,  // Type défini dans manifest (ex: "doubler")
    inputs,    // Valeurs des ports d'entrée { input1: value1, ... }
    config     // Configuration du node { option1: true, ... }
  } = params;
  
  // Votre logique ici...
  
  return {
    outputs: {
      output1: result1,
      output2: result2
    }
  };
}`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8">Gérer plusieurs types de nodes</h3>
      <CodeBlock language="javascript">{`export async function run({ nodeType, inputs, config }, api) {
  switch (nodeType) {
    case 'addition':
      return { outputs: { result: inputs.a + inputs.b } };
    
    case 'multiplication':
      return { outputs: { result: inputs.a * inputs.b } };
    
    default:
      throw new Error(\`Unknown node type: \${nodeType}\`);
  }
}`}</CodeBlock>
    </div>
  );
}

// Section API
function ApiSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">⚡ API Runtime disponible</h2>
      <p className="text-gray-300">
        L&apos;objet <code className="text-blue-400">api</code> passé à vos fonctions donne accès
        aux services LUCA.
      </p>

      <h3 className="text-xl font-semibold mt-8">api.log - Logging</h3>
      <CodeBlock language="javascript">{`api.log.debug('Message de debug', { data: 123 });
api.log.info('Information');
api.log.warn('Attention !');
api.log.error('Erreur', { error: err.message });`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8">api.storage - Stockage persistant</h3>
      <div className="bg-yellow-600/20 border border-yellow-500 rounded-lg p-3 mb-4">
        <p className="text-yellow-300 text-sm">
          ⚠️ Nécessite les permissions <code>storage.read</code> et/ou <code>storage.write</code>
        </p>
      </div>
      <CodeBlock language="javascript">{`// Lire une valeur
const value = await api.storage.get('ma-cle');

// Écrire une valeur
await api.storage.set('ma-cle', { count: 42 });

// Supprimer
await api.storage.delete('ma-cle');

// Lister les clés
const keys = await api.storage.list();`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8">api.http - Requêtes HTTP</h3>
      <div className="bg-yellow-600/20 border border-yellow-500 rounded-lg p-3 mb-4">
        <p className="text-yellow-300 text-sm">
          ⚠️ Nécessite la permission <code>network.http</code>
        </p>
      </div>
      <CodeBlock language="javascript">{`// GET
const response = await api.http.request('https://api.example.com/data');
const data = response.json();

// POST
const response = await api.http.request('https://api.example.com/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' })
});`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8">api.emit - Émettre des événements</h3>
      <CodeBlock language="javascript">{`// Émettre vers un port de sortie spécifique
api.emit('output1', { value: 42 });

// Émettre un événement global
api.emit('customEvent', { data: 'something' });`}</CodeBlock>
    </div>
  );
}

// Section Permissions
function PermissionsSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">🔒 Système de permissions</h2>
      <p className="text-gray-300">
        Les permissions doivent être déclarées dans{' '}
        <code className="text-blue-400">manifest.json</code> et sont vérifiées à l&apos;exécution.
      </p>

      <CodeBlock language="json">{`{
  "permissions": [
    "storage.read",
    "storage.write",
    "network.http"
  ]
}`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8">Permissions disponibles</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4">Permission</th>
              <th className="text-left py-3 px-4">Description</th>
              <th className="text-left py-3 px-4">Risque</th>
              <th className="text-left py-3 px-4">Review</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['storage.read', 'Lire le storage local du mod', 'Faible', 'Non'],
              ['storage.write', 'Écrire dans le storage local', 'Faible', 'Non'],
              ['network.http', 'Requêtes HTTP sortantes', 'Moyen', 'Oui'],
              ['network.ws', 'WebSocket', 'Moyen', 'Oui'],
              ['device.flashlight', 'Contrôle lampe torche', 'Faible', 'Non'],
              ['device.vibration', 'Contrôle vibration', 'Faible', 'Non'],
              ['device.sensors', 'Accès capteurs', 'Moyen', 'Oui'],
              ['system.notifications', 'Notifications', 'Faible', 'Non'],
              ['system.clipboard', 'Presse-papiers', 'Moyen', 'Oui'],
            ].map(([perm, desc, risk, review]) => (
              <tr key={perm} className="border-b border-gray-700">
                <td className="py-3 px-4 font-mono text-purple-400">{perm}</td>
                <td className="py-3 px-4 text-gray-300">{desc}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      risk === 'Faible'
                        ? 'bg-green-600/30 text-green-400'
                        : risk === 'Moyen'
                          ? 'bg-yellow-600/30 text-yellow-400'
                          : 'bg-red-600/30 text-red-400'
                    }`}
                  >
                    {risk}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-400">{review}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-xl font-semibold mt-8">Mesures de sécurité</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="font-semibold text-green-400 mb-2">✅ Isolation par processus</h4>
          <p className="text-sm text-gray-400">
            Chaque mod s&apos;exécute dans un processus Node.js séparé. Un crash n&apos;affecte pas
            l&apos;app.
          </p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="font-semibold text-green-400 mb-2">✅ Limites de ressources</h4>
          <p className="text-sm text-gray-400">
            Mémoire : 128 MB, Timeout : 3000 ms, Stockage : 10 MB
          </p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="font-semibold text-green-400 mb-2">✅ Validation statique</h4>
          <p className="text-sm text-gray-400">
            Analyse AST pour détecter les patterns dangereux (eval, require fs, etc.)
          </p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="font-semibold text-green-400 mb-2">✅ Checksum & Signature</h4>
          <p className="text-sm text-gray-400">
            Hash SHA-256 et signature ed25519 optionnelle pour vérifier l&apos;intégrité
          </p>
        </div>
      </div>
    </div>
  );
}

// Section Publier
function PublishSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">📤 Publier votre mod</h2>

      <h3 className="text-xl font-semibold mt-8">Option 1 : Via l&apos;interface web</h3>
      <ol className="list-decimal list-inside space-y-3 text-gray-300">
        <li>
          Rendez-vous sur la page{' '}
          <Link href="/mods/upload" className="text-blue-400 hover:underline">
            Upload
          </Link>
        </li>
        <li>Remplissez les informations (nom, description, catégorie)</li>
        <li>Collez votre code JavaScript dans l&apos;éditeur</li>
        <li>Cliquez sur &quot;Publier&quot;</li>
      </ol>

      <h3 className="text-xl font-semibold mt-8">Option 2 : Via l&apos;API</h3>
      <CodeBlock language="bash">{`curl -X POST https://luca-mods.vercel.app/api/mods \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "mon-mod",
    "displayName": "Mon Mod",
    "description": "Description",
    "version": "1.0.0",
    "category": "Logic",
    "mainCode": "export async function run({ inputs }, api) { ... }",
    "manifest": { ... },
    "nodeTypes": { ... }
  }'`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8">Checklist avant publication</h3>
      <div className="bg-gray-700/50 rounded-lg p-4">
        <ul className="space-y-2">
          {[
            'manifest.json valide avec tous les champs requis',
            'Toutes les permissions nécessaires déclarées',
            'Code testé localement',
            'README.md avec documentation',
            'Version semver correcte (ex: 1.0.0)',
            'Pas de code malveillant (eval, require fs, etc.)',
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-gray-300">
              <input type="checkbox" className="rounded bg-gray-600 border-gray-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <h3 className="text-xl font-semibold mt-8">Processus de review</h3>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-yellow-600/20 border border-yellow-500 rounded-lg p-4 text-center">
          <div className="text-3xl mb-2">📝</div>
          <div className="font-semibold text-yellow-400">1. Soumis</div>
          <p className="text-sm text-gray-400 mt-1">En attente de validation</p>
        </div>
        <div className="flex-1 bg-blue-600/20 border border-blue-500 rounded-lg p-4 text-center">
          <div className="text-3xl mb-2">🔍</div>
          <div className="font-semibold text-blue-400">2. En review</div>
          <p className="text-sm text-gray-400 mt-1">Vérification automatique + manuelle</p>
        </div>
        <div className="flex-1 bg-green-600/20 border border-green-500 rounded-lg p-4 text-center">
          <div className="text-3xl mb-2">✅</div>
          <div className="font-semibold text-green-400">3. Approuvé</div>
          <p className="text-sm text-gray-400 mt-1">Disponible pour tous</p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/mods/upload"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors text-lg"
        >
          <span>🚀</span> Publier mon premier mod
        </Link>
      </div>
    </div>
  );
}
