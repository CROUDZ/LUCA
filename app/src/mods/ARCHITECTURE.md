# LUCA Modding System - Architecture

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LUCA CORE APPLICATION                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Engine    │    │  Node       │    │   Graph     │    │     UI      │  │
│  │  (existing) │◄──►│  Registry   │◄──►│  Storage    │◄──►│  (React)    │  │
│  └─────────────┘    └──────┬──────┘    └─────────────┘    └─────────────┘  │
│                            │                                                │
│                            ▼                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         MOD SYSTEM LAYER                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Loader    │  │  Validator  │  │  Registry   │  │   Sandbox   │  │  │
│  │  │  (loader.   │  │ (validator. │  │   Client    │  │   Manager   │  │  │
│  │  │   mjs)      │  │   mjs)      │  │             │  │             │  │  │
│  │  └──────┬──────┘  └─────────────┘  └─────────────┘  └──────┬──────┘  │  │
│  │         │                                                   │         │  │
│  │         └───────────────────┬───────────────────────────────┘         │  │
│  │                             │                                          │  │
│  │                             ▼                                          │  │
│  │         ┌───────────────────────────────────────────┐                 │  │
│  │         │           IPC MESSAGE BUS                  │                 │  │
│  │         │        (JSON-RPC over stdio)               │                 │  │
│  │         └───────────────────┬───────────────────────┘                 │  │
│  └─────────────────────────────┼────────────────────────────────────────┘  │
│                                │                                           │
└────────────────────────────────┼───────────────────────────────────────────┘
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     │                           │                           │
     ▼                           ▼                           ▼
┌─────────────┐           ┌─────────────┐           ┌─────────────┐
│   RUNNER    │           │   RUNNER    │           │   RUNNER    │
│  PROCESS 1  │           │  PROCESS 2  │           │  PROCESS N  │
│  (isolated) │           │  (isolated) │           │  (isolated) │
├─────────────┤           ├─────────────┤           ├─────────────┤
│  MOD A      │           │  MOD B      │           │  MOD C      │
│  main.mjs   │           │  main.mjs   │           │  main.mjs   │
└─────────────┘           └─────────────┘           └─────────────┘


                    REGISTRY SERVER (Optional - Remote)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   REST API  │    │  Validator  │    │   Storage   │    │   Webhook   │  │
│  │  (Express)  │    │   Service   │    │  (SQLite/   │    │     CI      │  │
│  │             │    │             │    │   S3/Mongo) │    │             │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Composants principaux

### 1. **Mod Loader** (`core/loader.mjs`)

- Charge et valide les manifests
- Fork des processus runners isolés
- Gère le cycle de vie (install, enable, disable, unload, update)
- Communique via IPC JSON-RPC

### 2. **Sandbox Runner** (`core/runner.js`)

- Processus enfant isolé par mod
- Charge `main.mjs` du mod de manière sécurisée
- Expose une API runtime limitée
- Applique timeouts et limites mémoire
- Capture et transmet les logs

### 3. **Validator** (`core/validator.mjs`)

- Valide le manifest.json
- Analyse statique AST pour patterns dangereux
- Vérifie signatures ed25519
- Checksum SHA-256

### 4. **Registry API** (`registry/server.js`)

- REST API pour upload/download de mods
- Validation automatique
- Stockage (SQLite + filesystem)
- Authentification JWT

### 5. **Sandbox Manager** (`core/sandbox-manager.mjs`)

- Pool de runners
- Gestion des ressources (CPU, RAM)
- Crash recovery automatique
- Monitoring et métriques

## Flux de données

```
[Auteur de Mod]
      │
      ▼ (1) Crée mod + manifest.json
[validator.mjs] ◄── Validation locale
      │
      ▼ (2) Package .zip signé
[Registry API] ◄── Upload + validation serveur
      │
      ▼ (3) Stocké et indexé
[LUCA Client]
      │
      ▼ (4) Télécharge mod
[Loader] ◄── Vérifie signature/hash
      │
      ▼ (5) Fork runner isolé
[Runner Process] ◄── Charge main.mjs
      │
      ▼ (6) Enregistre node types
[Node Registry] ◄── Disponible dans l'UI
      │
      ▼ (7) Utilisateur utilise le node
[Engine] ◄── Appelle runner.run(payload)
```

## Protocole IPC (JSON-RPC 2.0)

### Request (Core → Runner)

```json
{
  "jsonrpc": "2.0",
  "id": "uuid-1234",
  "method": "run",
  "params": {
    "nodeId": "node-abc",
    "inputs": { "value": 42 },
    "context": { "executionId": "exec-xyz" }
  }
}
```

### Response (Runner → Core)

```json
{
  "jsonrpc": "2.0",
  "id": "uuid-1234",
  "result": {
    "outputs": { "result": 84 },
    "logs": [{ "level": "info", "message": "Processed", "timestamp": 1699999999 }]
  }
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": "uuid-1234",
  "error": {
    "code": -32000,
    "message": "Execution timeout",
    "data": { "timeout": 3000 }
  }
}
```

## Permissions système

| Permission             | Description                         | Risque |
| ---------------------- | ----------------------------------- | ------ |
| `storage.read`         | Lecture storage local du mod        | Faible |
| `storage.write`        | Écriture storage local du mod       | Faible |
| `network.http`         | Requêtes HTTP sortantes (whitelist) | Moyen  |
| `network.ws`           | WebSocket (whitelist)               | Moyen  |
| `device.flashlight`    | Contrôle lampe torche               | Faible |
| `device.vibration`     | Contrôle vibration                  | Faible |
| `device.sensors`       | Accès capteurs                      | Moyen  |
| `system.notifications` | Notifications système               | Faible |

## Limites par défaut

- **Timeout exécution**: 3000ms par appel `run()`
- **Mémoire max**: 128MB par runner (`--max-old-space-size=128`)
- **CPU**: Pas de limite hard (monitoring soft)
- **Stockage**: 10MB par mod
- **Requêtes réseau**: 10/minute (si permission accordée)

## Versioning

- **API Version**: `1.0.0` (semver)
- **Manifest Version**: `1`
- Compatibilité ascendante garantie pour versions mineures
