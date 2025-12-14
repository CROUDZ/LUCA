# 📦 Guide de développement de Mods LUCA

Bienvenue dans le guide officiel pour créer des mods pour LUCA ! Ce document vous accompagnera pas à pas dans la création, le test et la publication de vos propres nodes personnalisés.

## Table des matières

1. [Introduction](#introduction)
2. [Prérequis](#prérequis)
3. [Quickstart en 5 minutes](#quickstart-en-5-minutes)
4. [Structure d'un mod](#structure-dun-mod)
5. [Le fichier manifest.json](#le-fichier-manifestjson)
6. [Écrire le code du mod](#écrire-le-code-du-mod)
7. [API Runtime disponible](#api-runtime-disponible)
8. [Système de permissions](#système-de-permissions)
9. [Tester localement](#tester-localement)
10. [Valider et signer](#valider-et-signer)
11. [Publier sur le registry](#publier-sur-le-registry)
12. [Bonnes pratiques](#bonnes-pratiques)
13. [FAQ](#faq)
14. [Exemples](#exemples)

---

## Introduction

Le système de modding LUCA permet à la communauté de créer des **nodes personnalisés** qui étendent les fonctionnalités de l'application. Chaque mod s'exécute dans un **environnement isolé** (sandbox) pour garantir la sécurité.

### Ce que vous pouvez faire

- ✅ Créer de nouveaux types de nodes
- ✅ Implémenter de la logique personnalisée
- ✅ Stocker des données persistantes
- ✅ Faire des requêtes HTTP (avec permission)
- ✅ Interagir avec certains périphériques (avec permission)

### Ce qui n'est pas autorisé

- ❌ Accéder au système de fichiers
- ❌ Exécuter des commandes système
- ❌ Modifier le code de LUCA
- ❌ Accéder aux données d'autres mods

---

## Prérequis

- **Node.js 18+** installé
- Un éditeur de code (VS Code recommandé)
- Connaissance de base de JavaScript/ES Modules

```bash
# Vérifier votre version de Node.js
node --version  # Doit être >= 18.0.0
```

---

## Quickstart en 5 minutes

### 1. Créer le dossier du mod

```bash
mkdir mon-premier-mod
cd mon-premier-mod
```

### 2. Créer le manifest.json

```json
{
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
      "inputs": [{ "id": "value", "label": "Valeur", "type": "number" }],
      "outputs": [{ "id": "result", "label": "Résultat", "type": "number" }],
      "color": "#4CAF50"
    }
  ],
  "compatibility": {
    "luca_min": "1.0.0",
    "platforms": ["android", "ios", "web"]
  }
}
```

### 3. Créer le fichier main.mjs

```javascript
// main.mjs - Point d'entrée du mod

export async function nodeInit(api) {
  api.log.info('Mon premier mod initialisé !');
}

export async function run({ nodeId, nodeType, inputs }, api) {
  const value = inputs.value || 0;
  const result = value * 2;

  api.log.debug(`Doublé ${value} -> ${result}`);

  return {
    outputs: { result },
  };
}

export async function onUnload(api) {
  api.log.info('Mod déchargé');
}
```

### 4. Valider le mod

```bash
# Depuis le dossier LUCA
node src/mods/core/validator.mjs ./mon-premier-mod
```

### 5. C'est prêt ! 🎉

Votre mod peut maintenant être installé dans LUCA.

---

## Structure d'un mod

```
mon-mod/
├── manifest.json      # Métadonnées obligatoires
├── main.mjs           # Point d'entrée (code principal)
├── README.md          # Documentation (recommandé)
├── LICENSE            # Licence (recommandé)
├── assets/            # Ressources optionnelles
│   └── icon.png
└── lib/               # Modules internes optionnels
    └── helpers.mjs
```

### Fichiers obligatoires

| Fichier         | Description                                    |
| --------------- | ---------------------------------------------- |
| `manifest.json` | Métadonnées, permissions, définition des nodes |
| `main.mjs`      | Code JavaScript ESM principal                  |

### Fichiers recommandés

| Fichier        | Description                         |
| -------------- | ----------------------------------- |
| `README.md`    | Documentation pour les utilisateurs |
| `LICENSE`      | Licence open-source                 |
| `CHANGELOG.md` | Historique des versions             |

---

## Le fichier manifest.json

Le manifest est le cœur de votre mod. Il définit toutes les métadonnées.

### Champs obligatoires

```json
{
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
}
```

### Définir un node_type

```json
{
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
}
```

### Types de ports

| Type      | Description                 |
| --------- | --------------------------- |
| `any`     | Accepte n'importe quel type |
| `number`  | Nombre (entier ou décimal)  |
| `string`  | Chaîne de caractères        |
| `boolean` | Vrai/Faux                   |
| `object`  | Objet JSON                  |
| `array`   | Tableau                     |
| `signal`  | Signal de déclenchement     |

---

## Écrire le code du mod

### Cycle de vie

```javascript
// 1. Initialisation (appelée une fois au chargement)
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
}
```

### Paramètres de run()

```javascript
export async function run(params, api) {
  const {
    nodeId, // ID unique du node (ex: "node-abc123")
    nodeType, // Type défini dans manifest (ex: "doubler")
    inputs, // Valeurs des ports d'entrée { input1: value1, ... }
    config, // Configuration du node { option1: true, ... }
  } = params;

  // Votre logique ici...

  return {
    outputs: {
      output1: result1,
      output2: result2,
    },
  };
}
```

### Gérer plusieurs types de nodes

```javascript
export async function run({ nodeType, inputs, config }, api) {
  switch (nodeType) {
    case 'addition':
      return { outputs: { result: inputs.a + inputs.b } };

    case 'multiplication':
      return { outputs: { result: inputs.a * inputs.b } };

    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
}
```

---

## API Runtime disponible

L'objet `api` passé à vos fonctions donne accès aux services LUCA.

### api.log - Logging

```javascript
api.log.debug('Message de debug', { data: 123 });
api.log.info('Information');
api.log.warn('Attention !');
api.log.error('Erreur', { error: err.message });
```

### api.storage - Stockage persistant

```javascript
// Lire une valeur
const value = await api.storage.get('ma-cle');

// Écrire une valeur
await api.storage.set('ma-cle', { count: 42 });

// Supprimer
await api.storage.delete('ma-cle');

// Lister les clés
const keys = await api.storage.list();
```

> ⚠️ Nécessite les permissions `storage.read` et/ou `storage.write`

### api.http - Requêtes HTTP

```javascript
// GET
const response = await api.http.request('https://api.example.com/data');
const data = response.json();

// POST
const response = await api.http.request('https://api.example.com/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: { key: 'value' },
});
```

> ⚠️ Nécessite la permission `network.http`

### api.emit - Émettre des signaux

```javascript
// Émettre vers un port de sortie
api.emit('onComplete', { success: true });
```

### api.mod - Informations du mod

```javascript
console.log(api.mod.name); // "mon-mod"
console.log(api.mod.version); // "1.0.0"
```

### api.config - Configuration du node

```javascript
const { threshold, mode } = api.config;
```

---

## Système de permissions

Déclarez uniquement les permissions nécessaires dans `manifest.json`.

| Permission             | Description             | Niveau de risque |
| ---------------------- | ----------------------- | ---------------- |
| `storage.read`         | Lire le stockage du mod | 🟢 Faible        |
| `storage.write`        | Écrire dans le stockage | 🟢 Faible        |
| `network.http`         | Requêtes HTTP           | 🟡 Moyen         |
| `network.ws`           | WebSocket               | 🟡 Moyen         |
| `device.flashlight`    | Lampe torche            | 🟢 Faible        |
| `device.vibration`     | Vibration               | 🟢 Faible        |
| `device.sensors`       | Capteurs                | 🟡 Moyen         |
| `system.notifications` | Notifications           | 🟢 Faible        |
| `system.clipboard`     | Presse-papiers          | 🟡 Moyen         |

### Exemple

```json
{
  "permissions": ["storage.read", "storage.write", "network.http"]
}
```

---

## Tester localement

### 1. Valider le manifest

```bash
node src/mods/core/validator.mjs ./mon-mod
```

### 2. Mode strict (warnings = erreurs)

```bash
node src/mods/core/validator.mjs ./mon-mod --strict
```

### 3. Sortie JSON

```bash
node src/mods/core/validator.mjs ./mon-mod --json
```

### 4. Tester l'exécution

Créez un fichier de test :

```javascript
// test-mod.mjs
import * as mod from './mon-mod/main.mjs';

// Mock API
const mockApi = {
  mod: { name: 'test', version: '1.0.0' },
  storage: {
    get: async (key) => null,
    set: async (key, value) => console.log('SET', key, value),
    delete: async (key) => {},
    list: async () => [],
  },
  log: {
    debug: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error,
  },
  emit: (output, value) => console.log('EMIT', output, value),
  config: {},
};

// Test init
await mod.nodeInit(mockApi);

// Test run
const result = await mod.run(
  {
    nodeId: 'test-node',
    nodeType: 'doubler',
    inputs: { value: 21 },
    config: {},
  },
  mockApi
);

console.log('Result:', result);
// Expected: { outputs: { result: 42 } }
```

```bash
node test-mod.mjs
```

---

## Valider et signer

### Générer une paire de clés (une seule fois)

```bash
# Installer tweetnacl-cli
npm install -g tweetnacl-cli

# Générer les clés
tweetnacl-cli keygen > keypair.json
```

### Signer le mod

```bash
node src/mods/core/validator.mjs ./mon-mod --sign --key ./private.key
```

Le manifest sera mis à jour avec les informations d'intégrité :

```json
{
  "integrity": {
    "hash": "sha256:abc123...",
    "signature": "ed25519:xyz789...",
    "key_id": "my-key"
  }
}
```

---

## Publier sur le registry

### 1. Créer un compte

```bash
curl -X POST http://registry.luca-app.example/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"monuser","password":"monpass","email":"mon@email.com"}'
```

### 2. Obtenir un token

```bash
curl -X POST http://registry.luca-app.example/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"monuser","password":"monpass"}'
```

### 3. Packager le mod

```bash
cd mon-mod
zip -r ../mon-mod-1.0.0.zip .
```

### 4. Uploader

```bash
curl -X POST http://registry.luca-app.example/api/mods/upload \
  -H "Authorization: Bearer <votre-token>" \
  -F "mod=@mon-mod-1.0.0.zip"
```

### 5. Vérifier la publication

```bash
curl http://registry.luca-app.example/api/mods/mon-mod
```

---

## Bonnes pratiques

### ✅ À faire

1. **Documenter** votre mod avec un README clair
2. **Valider** les inputs avant de les utiliser
3. **Logger** les opérations importantes
4. **Gérer les erreurs** proprement
5. **Tester** localement avant de publier
6. **Versionner** avec semver (1.0.0, 1.1.0, 2.0.0...)
7. **Minimiser** les permissions demandées

### ❌ À éviter

1. **Ne pas** stocker de données sensibles
2. **Ne pas** faire de boucles infinies
3. **Ne pas** bloquer avec des opérations synchrones longues
4. **Ne pas** ignorer les erreurs
5. **Ne pas** utiliser eval() ou Function()

### Exemple de gestion d'erreur

```javascript
export async function run({ inputs }, api) {
  try {
    if (typeof inputs.value !== 'number') {
      throw new Error('Input must be a number');
    }

    const result = await someAsyncOperation(inputs.value);
    return { outputs: { result } };
  } catch (error) {
    api.log.error('Execution failed', { error: error.message });
    throw error; // Re-throw pour signaler l'échec
  }
}
```

---

## FAQ

### Q: Mon mod peut-il accéder à Internet ?

**R:** Oui, avec la permission `network.http`. Les requêtes passent par le proxy LUCA qui peut appliquer des restrictions.

### Q: Comment débugger mon mod ?

**R:** Utilisez `api.log.debug()` pour logger. Les logs apparaissent dans la console LUCA et peuvent être exportés.

### Q: Puis-je utiliser des packages npm ?

**R:** Oui, mais ils doivent être bundlés avec votre mod (via esbuild/webpack) et ne pas utiliser de fonctionnalités interdites.

### Q: Quelle est la limite de taille d'un mod ?

**R:** 10 MB maximum pour le package zip. Le stockage est limité à 10 MB par mod.

### Q: Mon mod peut-il communiquer avec d'autres mods ?

**R:** Non, chaque mod est isolé. Utilisez les ports de sortie pour communiquer via le graphe.

### Q: Combien de temps peut durer une exécution ?

**R:** Maximum 3 secondes par appel `run()`. Pour des opérations longues, divisez le travail.

---

## Exemples

### Compteur persistant

```javascript
export async function nodeInit(api) {
  const count = (await api.storage.get('count')) || 0;
  api.log.info(`Counter initialized at ${count}`);
}

export async function run({ inputs }, api) {
  let count = (await api.storage.get('count')) || 0;

  if (inputs.increment) {
    count++;
    await api.storage.set('count', count);
  }

  if (inputs.reset) {
    count = 0;
    await api.storage.set('count', count);
  }

  return { outputs: { count } };
}
```

### Requête API externe

```javascript
export async function run({ inputs }, api) {
  const { city } = inputs;

  try {
    const response = await api.http.request(
      `https://api.weather.example/v1/current?city=${encodeURIComponent(city)}`
    );

    const data = response.json();

    return {
      outputs: {
        temperature: data.temp,
        description: data.weather,
      },
    };
  } catch (error) {
    api.log.error('Weather API failed', { error: error.message });
    return {
      outputs: {
        temperature: null,
        description: 'Error fetching weather',
      },
    };
  }
}
```

### Node avec configuration

```javascript
export async function run({ inputs, config }, api) {
  const { value } = inputs;
  const { multiplier = 2, addOffset = 0 } = config;

  const result = value * multiplier + addOffset;

  return { outputs: { result } };
}
```

---

## Support

- 📖 **Documentation**: [https://docs.luca-app.example/mods](https://docs.luca-app.example/mods)
- 💬 **Discord**: [https://discord.gg/luca](https://discord.gg/luca)
- 🐛 **Issues**: [https://github.com/CROUDZ/LUCA/issues](https://github.com/CROUDZ/LUCA/issues)
- 📧 **Email**: mods@luca-app.example

---

## Licence

Les mods publiés sur le registry officiel doivent être sous licence open-source compatible (MIT, Apache 2.0, GPL, etc.).

---

_Dernière mise à jour: Décembre 2024_
_Version de l'API: 1.0.0_
