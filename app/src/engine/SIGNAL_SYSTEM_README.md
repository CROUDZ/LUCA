# Système de Signaux - Documentation

## Vue d'ensemble

Le nouveau **SignalSystem** est basé entièrement sur des **signaux continus** avec des états **ON/OFF**. Ce système est conçu pour être stable, prévisible et facile à déboguer.

## Concept principal

### États ON/OFF

Chaque node dans le graphe peut être dans l'un de ces deux états :
- **ON** : La node est active
- **OFF** : La node est inactive (état par défaut)

### Propagation des signaux

Quand une node change d'état (ON → OFF ou OFF → ON), ce changement se propage automatiquement à travers le graphe via les connexions :

```
Node Source (ON) → Node Action 1 (ON) → Node Action 2 (ON)
                                      ↘ Node Action 3 (ON)
```

Quand la source passe à OFF, tout le graphe reçoit l'état OFF :

```
Node Source (OFF) → Node Action 1 (OFF) → Node Action 2 (OFF)
                                        ↘ Node Action 3 (OFF)
```

## API Principale

### Changer l'état d'une node

```typescript
// Activer une node (passer à ON)
await signalSystem.activateNode(nodeId, data, context);

// Désactiver une node (passer à OFF)
await signalSystem.deactivateNode(nodeId, data, context);

// Basculer l'état d'une node (ON <-> OFF)
const newState = await signalSystem.toggleNode(nodeId, data, context);

// Contrôle précis de l'état
await signalSystem.setNodeState(nodeId, 'ON', data, context);
```

### Consulter l'état

```typescript
// Obtenir l'état actuel d'une node
const state = signalSystem.getNodeState(nodeId); // 'ON' ou 'OFF'

// Vérifier si une node est active
const isActive = signalSystem.isNodeActive(nodeId); // boolean

// Obtenir toutes les nodes actives
const activeNodes = signalSystem.getActiveNodes(); // number[]

// Obtenir les données associées à l'état
const data = signalSystem.getNodeData(nodeId);
```

### Gestion des handlers

```typescript
// Enregistrer un handler pour une node
signalSystem.registerHandler(nodeId, async (signal: Signal) => {
  // Traiter le signal
  console.log(`État reçu: ${signal.state}`); // 'ON' ou 'OFF'
  
  // Décider de la propagation
  return {
    propagate: true, // Continuer la propagation
    state: signal.state, // État à propager (optionnel, par défaut = état reçu)
    data: { /* données */ }, // Données à transmettre (optionnel)
    targetOutputs: [nodeId1, nodeId2], // Sorties spécifiques (optionnel)
  };
});

// Désinscrire un handler
signalSystem.unregisterHandler(nodeId);
```

## Gestion intelligente des connexions multiples

Le système gère automatiquement les cas où une node reçoit des signaux de plusieurs sources :

- Une node passe à **ON** dès qu'**au moins une** source est ON
- Une node passe à **OFF** seulement quand **toutes** les sources sont OFF

```
Source A (ON)  ─┐
                ├→ Node Cible (ON)
Source B (OFF) ─┘

Source A (OFF) ─┐
                ├→ Node Cible (OFF)  // OFF car toutes les sources sont OFF
Source B (OFF) ─┘
```

Cela évite les comportements imprévisibles et les clignotements.

## Exemples d'utilisation

### Exemple 1 : Node Action simple

```typescript
// Dans une node d'action (ex: allumer une LED)
signalSystem.registerHandler(nodeId, async (signal: Signal) => {
  if (signal.state === 'ON') {
    // Allumer la LED
    await turnOnLED();
  } else {
    // Éteindre la LED
    await turnOffLED();
  }
  
  // Propager l'état aux nodes suivantes
  return { propagate: true };
});
```

### Exemple 2 : Node Condition

```typescript
// Dans une node de condition (ex: vérifier la température)
signalSystem.registerHandler(nodeId, async (signal: Signal) => {
  if (signal.state === 'OFF') {
    // Propager OFF directement
    return { propagate: true };
  }
  
  // État ON : vérifier la condition
  const temperature = await getTemperature();
  const threshold = settings.threshold || 25;
  
  if (temperature > threshold) {
    // Condition remplie : propager ON
    return { 
      propagate: true,
      data: { temperature, threshold }
    };
  } else {
    // Condition non remplie : bloquer
    return { propagate: false };
  }
});
```

### Exemple 3 : Node avec branches conditionnelles

```typescript
// Node If/Else avec sorties multiples
signalSystem.registerHandler(nodeId, async (signal: Signal) => {
  if (signal.state === 'OFF') {
    // Propager OFF à toutes les branches
    return { propagate: true };
  }
  
  const condition = evaluateCondition(signal.data);
  
  if (condition) {
    // Propager ON uniquement vers la branche "then" (sortie 0)
    return { 
      propagate: true,
      targetOutputs: [node.outputs[0]]
    };
  } else {
    // Propager ON uniquement vers la branche "else" (sortie 1)
    return { 
      propagate: true,
      targetOutputs: [node.outputs[1]]
    };
  }
});
```

### Exemple 4 : Interaction utilisateur (toggle)

```typescript
// Bouton pour basculer l'état d'une node
const handleButtonPress = async () => {
  const newState = await signalSystem.toggleNode(sourceNodeId);
  console.log(`Nouvel état: ${newState}`); // 'ON' ou 'OFF'
};
```

## Système d'événements

Le SignalSystem émet des événements pour le feedback visuel et le débogage :

```typescript
// S'abonner à un événement
const unsubscribe = signalSystem.subscribeToEvent(
  'signal.propagated',
  nodeId,
  (data) => {
    console.log(`Signal propagé de ${data.fromNodeId} vers ${data.toNodeId}`);
    console.log(`État: ${data.state}`);
  }
);

// Se désabonner
unsubscribe();

// Émettre un événement personnalisé
signalSystem.emitEvent('custom.event', { myData: 'value' });
```

### Événements système disponibles

- `signal.state.on` : Une node est passée à ON
- `signal.state.off` : Une node est passée à OFF
- `signal.propagated` : Un signal a été propagé d'une node à une autre
- `signal.blocked` : Un signal a été bloqué par une condition

## Variables partagées

Le contexte global permet de partager des variables entre toutes les nodes :

```typescript
// Définir une variable
signalSystem.setVariable('temperature', 23.5);

// Obtenir une variable
const temp = signalSystem.getVariable('temperature', 0); // 0 = valeur par défaut

// Vérifier l'existence
if (signalSystem.hasVariable('temperature')) {
  // ...
}

// Supprimer une variable
signalSystem.deleteVariable('temperature');

// Obtenir toutes les variables
const allVars = signalSystem.getAllVariables();
```

## Statistiques et débogage

```typescript
const stats = signalSystem.getStats();
console.log({
  registeredHandlers: stats.registeredHandlers,
  totalSignals: stats.totalSignals,
  failedSignals: stats.failedSignals,
  averageExecutionTime: stats.averageExecutionTime,
  activeNodes: stats.activeNodes,
  processingSignals: stats.processingSignals,
});
```

## Arrêt et réinitialisation

```typescript
// Arrêter toutes les nodes actives
await signalSystem.stopAllActiveNodes();

// Réinitialiser complètement le système
signalSystem.reset();

// Réinitialiser le système global (singleton)
resetSignalSystem();
```

## Bonnes pratiques

### 1. Toujours gérer l'état OFF

Les handlers doivent toujours traiter les deux états :

```typescript
✅ BON
signalSystem.registerHandler(nodeId, async (signal) => {
  if (signal.state === 'ON') {
    await startAction();
  } else {
    await stopAction();
  }
  return { propagate: true };
});

❌ MAUVAIS
signalSystem.registerHandler(nodeId, async (signal) => {
  // Oubli de gérer l'état OFF !
  if (signal.state === 'ON') {
    await startAction();
  }
  return { propagate: true };
});
```

### 2. Propager OFF pour nettoyer l'état

Même si une condition n'est pas remplie pour ON, propagez toujours OFF :

```typescript
✅ BON
if (signal.state === 'OFF') {
  return { propagate: true }; // Nettoyer l'état des nodes suivantes
}

❌ MAUVAIS
if (signal.state === 'OFF') {
  return { propagate: false }; // Les nodes suivantes restent bloquées dans l'ancien état
}
```

### 3. Utiliser des données immuables

Ne modifiez pas directement les données du signal :

```typescript
✅ BON
return { 
  propagate: true,
  data: { ...signal.data, newField: value }
};

❌ MAUVAIS
signal.data.newField = value; // Mutation !
return { propagate: true };
```

### 4. Gérer les erreurs

Les erreurs dans les handlers sont automatiquement capturées, mais il est bon de les gérer :

```typescript
signalSystem.registerHandler(nodeId, async (signal) => {
  try {
    if (signal.state === 'ON') {
      await riskyOperation();
    }
    return { propagate: true };
  } catch (error) {
    logger.error('Erreur dans le handler:', error);
    // Propager OFF en cas d'erreur
    return { propagate: true, state: 'OFF' };
  }
});
```

## Migration depuis l'ancien système

### Anciennes méthodes → Nouvelles méthodes

| Ancienne méthode | Nouvelle méthode | Notes |
|-----------------|------------------|-------|
| `emitSignal(nodeId, data)` | `activateNode(nodeId, data)` | Active la node (ON) |
| `toggleContinuousSignal(nodeId, data, context, { forceState: 'start' })` | `activateNode(nodeId, data, context)` | Simplifié |
| `toggleContinuousSignal(nodeId, data, context, { forceState: 'stop' })` | `deactivateNode(nodeId, data, context)` | Simplifié |
| `isContinuousSignalActive(nodeId)` | `isNodeActive(nodeId)` | Plus clair |
| `getContinuousSignalData(nodeId)` | `getNodeData(nodeId)` | Plus simple |

### Adapter les handlers

Avant :
```typescript
signalSystem.registerHandler(nodeId, async (signal) => {
  if (signal.continuous && signal.state === 'start') {
    // Logique de démarrage
  } else if (signal.continuous && signal.state === 'stop') {
    // Logique d'arrêt
  }
  return { propagate: true };
});
```

Après :
```typescript
signalSystem.registerHandler(nodeId, async (signal) => {
  if (signal.state === 'ON') {
    // Logique de démarrage
  } else {
    // Logique d'arrêt
  }
  return { propagate: true };
});
```

## Avantages du nouveau système

1. **Simplicité** : Seulement deux états (ON/OFF) au lieu de plusieurs types de signaux
2. **Prévisibilité** : Le comportement est toujours clair et déterministe
3. **Stabilité** : Gestion automatique des connexions multiples et prévention des boucles
4. **Performance** : Propagation directe sans queue de signaux
5. **Débogage** : États clairs et événements détaillés pour comprendre ce qui se passe

## Conclusion

Le nouveau SignalSystem est conçu pour être simple, stable et efficace. Tous les signaux sont maintenant continus avec des états ON/OFF, ce qui rend le système beaucoup plus facile à comprendre et à déboguer.
