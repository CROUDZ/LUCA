# 🎯 Guide des Nodes de Condition

Ce guide explique comment créer des **nodes de condition** en utilisant le nouveau système `ConditionHandler` de LUCA.

## Table des matières

1. [Introduction](#introduction)
2. [Concepts clés](#concepts-clés)
3. [Les trois modes](#les-trois-modes)
4. [Créer un node de condition](#créer-un-node-de-condition)
5. [API ConditionHandler](#api-conditionhandler)
6. [Exemples complets](#exemples-complets)

---

## Introduction

Les nodes de condition sont des nodes qui évaluent une condition et propagent un signal en fonction du résultat. Le système `ConditionHandler` centralise toute la logique de gestion des conditions, permettant une implémentation uniforme et robuste.

### Avantages du ConditionHandler

- ✅ **Uniformité** : Tous les nodes de condition se comportent de la même manière
- ✅ **Trois modes** : Continu, Timer, Switch - tous gérés automatiquement
- ✅ **Abonnements** : Support des événements internes et externes
- ✅ **Factory pattern** : Création simplifiée des nodes

---

## Concepts clés

### Signal d'entrée vs Condition

- **Signal d'entrée** : Signal reçu sur l'input (ON/OFF)
- **Condition** : État booléen évalué par le node (ex: "la lampe torche est allumée")
- **Signal de sortie** : Résultat de la combinaison signal + condition selon le mode

### Flux de données

```
Signal IN (ON) → Évaluation condition → Mode processing → Signal OUT
```

---

## Les trois modes

### 1. Mode Continu (`timerDuration = 0`, `switchMode = false`)

La sortie reflète directement l'état de la condition quand un signal ON arrive.

```
Signal ON + Condition TRUE  → Output ON
Signal ON + Condition FALSE → Output OFF (signal bloqué)
Signal OFF                  → Output OFF
```

### 2. Mode Timer (`timerDuration > 0`)

Quand la condition est remplie et un signal ON arrive, la sortie reste ON pendant la durée spécifiée.

```
Signal ON + Condition TRUE  → Output ON pendant X secondes
Signal ON + Condition FALSE → Output OFF
```

### 3. Mode Switch (`switchMode = true`)

La sortie bascule (toggle) quand la condition **devient** vraie.

```
Condition becomes TRUE → Toggle output state
Condition becomes FALSE → Keep current state
```

---

## Créer un node de condition

### Pour les développeurs LUCA (TypeScript)

```typescript
import { registerConditionNode } from '../engine/ConditionHandler';

// Enregistrer le node
registerConditionNode({
  type: 'my-condition',
  label: 'Ma Condition',
  category: 'Conditions',
  description: 'Description de ma condition',
  color: '#4CAF50',
  icon: 'check',
  iconFamily: 'material',

  // Fonction qui évalue la condition
  checkCondition: async () => {
    // Retourne true si la condition est remplie
    return someStateCheck();
  },

  // Optionnel: s'abonner à un événement interne
  eventSubscription: {
    eventName: 'my.event.changed',
    extractState: (eventData) => eventData.isActive,
  },

  // Optionnel: s'abonner à un capteur externe
  externalSubscription: {
    setup: (onStateChange) => {
      // S'abonner au capteur
      const subscription = sensor.onChange((value) => {
        onStateChange(value > threshold);
      });

      // Retourner la fonction de cleanup
      return () => subscription.unsubscribe();
    },
  },
});
```

### Pour les développeurs de Mods (JavaScript)

```javascript
// Dans main.mjs

const conditionNodes = {
  'battery-level': {
    config: {
      type: 'battery-level',
      label: 'Battery Level',
      category: 'Conditions',
      description: 'Triggers when battery is above threshold',
      color: '#4CAF50',
      icon: 'battery-full',
      iconFamily: 'material',
    },
    createRuntime: (nodeData) => ({
      checkCondition: () => {
        const threshold = nodeData.threshold ?? 50;
        return currentBatteryLevel >= threshold;
      },
      externalSubscription: {
        setup: (onStateChange) => {
          const intervalId = setInterval(() => {
            const threshold = nodeData.threshold ?? 50;
            onStateChange(currentBatteryLevel >= threshold);
          }, 5000);

          return () => clearInterval(intervalId);
        },
      },
    }),
  },
};

// Enregistrer lors de l'init
function handleInit(params) {
  for (const [type, def] of Object.entries(conditionNodes)) {
    sendNotification('registerConditionNode', {
      config: def.config,
      nodeType: type,
    });
  }
}
```

---

## API ConditionHandler

### Types principaux

```typescript
interface ConditionSettings {
  timerDuration: number; // 0 = continu, >0 = timer en secondes
  switchMode: boolean; // true = mode switch
}

interface ConditionNodeConfig {
  type: string;
  label: string;
  category: string;
  description?: string;
  color?: string;
  icon?: string;
  iconFamily?: 'material' | 'fontawesome';

  checkCondition: () => boolean | Promise<boolean>;

  eventSubscription?: {
    eventName: string;
    extractState?: (data: unknown) => boolean;
  };

  externalSubscription?: {
    setup: (onStateChange: (state: boolean) => void) => () => void;
  };
}
```

### Fonctions exposées

```typescript
// Créer et enregistrer un node de condition
function registerConditionNode(config: ConditionNodeConfig): NodeDefinition;

// Créer un node sans l'enregistrer (pour customisation)
function createConditionNode(config: ConditionNodeConfig): NodeDefinition;

// Initialiser l'état de condition pour une instance
function initConditionState(nodeId: string, settings: ConditionSettings): void;

// Créer le handler de signal pour une instance
function createConditionSignalHandler(
  nodeId: string,
  checkCondition: () => boolean | Promise<boolean>,
  callbacks: ConditionCallbacks
): (signal: Signal) => void;
```

---

## Exemples complets

### Exemple 1: Condition de luminosité

```typescript
registerConditionNode({
  type: 'light-level-condition',
  label: 'Light Level',
  category: 'Conditions',
  description: 'Triggers when ambient light is above threshold',
  color: '#FFC107',
  icon: 'wb-sunny',
  iconFamily: 'material',

  checkCondition: () => {
    const threshold = getCurrentNodeData().threshold ?? 50;
    return getLightSensorValue() >= threshold;
  },

  externalSubscription: {
    setup: (onStateChange) => {
      return subscribeLightSensor((value) => {
        const threshold = getCurrentNodeData().threshold ?? 50;
        onStateChange(value >= threshold);
      });
    },
  },
});
```

### Exemple 2: Condition de plage horaire

```typescript
registerConditionNode({
  type: 'time-range-condition',
  label: 'Time Range',
  category: 'Conditions',
  description: 'Triggers when current time is within range',
  color: '#FF9800',
  icon: 'schedule',
  iconFamily: 'material',

  checkCondition: () => {
    const { startHour, endHour } = getCurrentNodeData();
    const hour = new Date().getHours();
    return hour >= startHour && hour <= endHour;
  },

  // Vérifier toutes les minutes
  externalSubscription: {
    setup: (onStateChange) => {
      const intervalId = setInterval(() => {
        const { startHour, endHour } = getCurrentNodeData();
        const hour = new Date().getHours();
        onStateChange(hour >= startHour && hour <= endHour);
      }, 60000);

      return () => clearInterval(intervalId);
    },
  },
});
```

### Exemple 3: Condition basée sur un événement interne

```typescript
registerConditionNode({
  type: 'bluetooth-connected',
  label: 'Bluetooth Connected',
  category: 'Conditions',
  description: 'Triggers when a specific Bluetooth device is connected',
  color: '#2196F3',
  icon: 'bluetooth',
  iconFamily: 'material',

  checkCondition: () => {
    const { targetDevice } = getCurrentNodeData();
    return isBluetoothDeviceConnected(targetDevice);
  },

  // S'abonner aux événements Bluetooth
  eventSubscription: {
    eventName: 'bluetooth.connection.changed',
    extractState: (eventData) => {
      const { targetDevice } = getCurrentNodeData();
      return eventData.connectedDevices.includes(targetDevice);
    },
  },
});
```

---

## Bonnes pratiques

### 1. Toujours implémenter `checkCondition`

C'est la fonction de base qui évalue l'état de la condition. Elle sera appelée quand un signal arrive.

### 2. Utiliser les abonnements pour les mises à jour en temps réel

- `eventSubscription` pour les événements internes LUCA (EventBus)
- `externalSubscription` pour les sources externes (capteurs, timers)

### 3. Gérer le cleanup

Retournez toujours une fonction de cleanup dans `externalSubscription.setup` pour éviter les fuites de mémoire.

### 4. Penser aux trois modes

Votre `checkCondition` doit fonctionner correctement dans les trois modes. Le `ConditionHandler` gère automatiquement la logique de mode.

### 5. Valeurs par défaut

Définissez toujours des valeurs par défaut sensées pour les paramètres du node.

```typescript
const threshold = nodeData.threshold ?? 50; // Défaut à 50 si non défini
```

---

## Migration depuis l'ancien système

Si vous avez des nodes de condition existants, voici comment les migrer :

### Avant (ancien système)

```typescript
// Ancien code avec gestion manuelle
const oldNode: NodeDefinition = {
  type: 'my-condition',
  inputs: [{ id: 'signal', type: 'signal' }],
  outputs: [{ id: 'output', type: 'signal' }],
  onSignal: (signal, nodeId, nodeData, graph, emit) => {
    // Logique complexe de gestion des modes...
  },
};
```

### Après (nouveau système)

```typescript
// Nouveau code avec ConditionHandler
registerConditionNode({
  type: 'my-condition',
  label: 'My Condition',
  category: 'Conditions',
  checkCondition: () => evaluateCondition(),
});
// C'est tout ! Le ConditionHandler gère le reste.
```

---

## Support

- 📖 Documentation complète : `/app/src/engine/ConditionHandler.ts`
- 📝 Exemple de mod : `/app/src/mods/examples/example-condition-node/`
- 🐛 Issues : GitHub repository
