# LUCA Modding System - Sécurité

## Vue d'ensemble des risques

Le système de modding permet l'exécution de code utilisateur. C'est intrinsèquement risqué.
Ce document détaille les mesures de sécurité implémentées et les limitations résiduelles.

## Matrice des risques

| Risque | Impact | Probabilité | Mitigation | Statut |
|--------|--------|-------------|------------|--------|
| Code malveillant | Critique | Moyen | Sandbox process, validation AST | ✅ Implémenté |
| Déni de service (CPU) | Haut | Moyen | Timeout, monitoring | ✅ Implémenté |
| Déni de service (mémoire) | Haut | Moyen | --max-old-space-size | ✅ Implémenté |
| Exfiltration de données | Critique | Faible | Permissions, pas de fs | ✅ Implémenté |
| Escalade de privilèges | Critique | Faible | Process isolé, no network default | ✅ Implémenté |
| Supply chain attack | Haut | Moyen | Signature, hash, review | ⚠️ Partiel |
| Race conditions IPC | Moyen | Faible | Message IDs, timeouts | ✅ Implémenté |
| Injection de commandes | Critique | Faible | Pas de shell, AST scan | ✅ Implémenté |

## Mesures de sécurité

### 1. Isolation par processus

Chaque mod s'exécute dans un processus Node.js séparé via `child_process.fork()`.

**Avantages:**
- Crash d'un mod n'affecte pas le core
- Mémoire isolée
- Possibilité de kill forcé

**Limitations:**
- Overhead de création de processus
- Pas d'isolation au niveau OS (pas de conteneur)

```javascript
const childProcess = fork(runnerPath, [], {
  execArgv: [
    '--max-old-space-size=128',
    '--unhandled-rejections=strict'
  ],
  stdio: ['pipe', 'pipe', 'pipe', 'ipc']
});
```

### 2. Limites de ressources

| Ressource | Limite | Configurée par |
|-----------|--------|----------------|
| Mémoire | 128 MB | `--max-old-space-size` |
| Temps d'exécution | 3000 ms | Timeout dans loader |
| Stockage | 10 MB | Vérifié dans runner |
| Requêtes réseau | 10/min | Rate limiter (à implémenter) |

### 3. Système de permissions

Les permissions doivent être déclarées dans `manifest.json` et sont vérifiées à l'exécution.

```json
{
  "permissions": [
    "storage.read",
    "storage.write",
    "network.http"
  ]
}
```

**Permissions disponibles:**

| Permission | Description | Risque | Nécessite review |
|------------|-------------|--------|------------------|
| `storage.read` | Lire le storage local du mod | Faible | Non |
| `storage.write` | Écrire dans le storage local | Faible | Non |
| `network.http` | Requêtes HTTP sortantes | Moyen | Oui |
| `network.ws` | WebSocket | Moyen | Oui |
| `device.flashlight` | Contrôle lampe torche | Faible | Non |
| `device.vibration` | Contrôle vibration | Faible | Non |
| `device.sensors` | Accès capteurs | Moyen | Oui |
| `system.notifications` | Notifications | Faible | Non |
| `system.clipboard` | Presse-papiers | Moyen | Oui |

### 4. Validation statique (AST)

Le validateur analyse le code source pour détecter les patterns dangereux:

**Patterns bloqués (critique):**
- `eval()`, `new Function()`
- `require('child_process')`, `import 'child_process'`
- `require('fs')`, `import 'fs'`
- `process.exit()`, `process.kill()`
- `vm` module
- `worker_threads`

**Patterns avertis (warning):**
- `process.env` access
- `global` manipulation
- `__proto__` usage
- Modules non whitelistés

### 5. Whitelist de modules

Seuls certains modules Node.js sont autorisés:

```javascript
const WHITELISTED_MODULES = [
  'path', 'url', 'util', 'events', 'stream',
  'string_decoder', 'buffer', 'querystring',
  'crypto', 'assert', 'timers', 'timers/promises',
  // NPM
  'lodash', 'moment', 'dayjs', 'uuid', 'validator'
];
```

### 6. Signature et intégrité

Chaque mod doit inclure dans son manifest:

```json
{
  "integrity": {
    "hash": "sha256:abc123...",
    "signature": "ed25519:xyz789...",
    "key_id": "luca-community-key-2024"
  }
}
```

**Processus de vérification:**
1. Calculer SHA-256 du fichier main
2. Comparer avec le hash déclaré
3. Vérifier la signature ed25519
4. Valider que la clé est trustée

### 7. API Runtime limitée

Le mod n'a accès qu'à une API contrôlée:

```javascript
const api = {
  mod: { name, version },
  storage: { get, set, delete, list },
  log: { debug, info, warn, error },
  http: { request }, // Si permission
  emit: (output, value) => {},
  config: {}
};
```

Pas d'accès à:
- `process`
- `require` / `import` dynamique
- `fs`, `net`, `child_process`
- Variables globales

### 8. Crash recovery

En cas de crash d'un runner:
1. Toutes les requêtes en attente sont rejetées
2. Le mod est marqué en erreur
3. Après cooldown, tentative de restart
4. Maximum 3 restarts avant abandon

```javascript
if (mod.restartCount < CONFIG.maxRestarts) {
  mod.restartCount++;
  setTimeout(() => activateMod(modName), CONFIG.restartCooldown);
}
```

## Limitations connues

### Ce que le système NE protège PAS contre:

1. **Bugs dans Node.js lui-même**
   - Si une vulnérabilité existe dans V8 ou Node.js, un mod peut potentiellement l'exploiter

2. **Attaques side-channel**
   - Timing attacks
   - Mesure de consommation mémoire

3. **Code natif**
   - Si un mod bundle un addon natif (bien que interdit par validation)

4. **Social engineering**
   - Un mod peut afficher des UI trompeuses
   - Doit être vérifié par review manuelle

5. **Isolation réseau**
   - Pas de firewall au niveau process
   - Un mod avec permission `network.http` peut contacter n'importe quelle URL

### Recommandations pour amélioration future:

1. **Conteneurisation** (Docker/Podman pour chaque runner)
2. **Seccomp profiles** pour limiter les syscalls
3. **Network namespaces** pour isolation réseau
4. **eBPF** pour monitoring granulaire
5. **Signature obligatoire** avec clés révocables

## Processus de review

### Checklist de review de sécurité

- [ ] Manifest complet et valide
- [ ] Hash et signature vérifiés
- [ ] Pas de patterns dangereux détectés
- [ ] Permissions justifiées
- [ ] Code source lisible et compréhensible
- [ ] Pas de dépendances suspectes
- [ ] Tests fournis
- [ ] Description et documentation claires

### Niveaux de vérification

| Niveau | Badge | Critères |
|--------|-------|----------|
| Non vérifié | ⚪ | Upload accepté, validation automatique passée |
| Vérifié | 🟢 | Review manuelle passée |
| Certifié | ⭐ | Review approfondie + tests + auteur vérifié |

## Réponse aux incidents

### En cas de mod malveillant détecté:

1. **Désactivation immédiate** via API admin
2. **Notification** aux utilisateurs ayant installé le mod
3. **Analyse** du comportement et des dégâts potentiels
4. **Blocage** de l'auteur
5. **Post-mortem** et amélioration des détections

### Canaux de signalement

- Issue sur le repo GitHub
- Email: security@luca-app.example
- Discord: #security-reports

## Audit de sécurité

Ce système devrait subir un audit de sécurité par un tiers avant mise en production avec des mods communautaires non vérifiés.

**Points à auditer:**
1. Isolation du runner
2. Validation AST et regex
3. Communication IPC
4. Gestion des permissions
5. Stockage des secrets (JWT, clés)
6. API REST et authentification
