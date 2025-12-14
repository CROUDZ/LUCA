# ✅ Checklist d'acceptation des Mods LUCA

Ce document définit les critères qu'un mod doit remplir pour être accepté sur le registry public LUCA.

## Critères obligatoires (bloquants)

### 1. Manifest valide

- [ ] Fichier `manifest.json` présent à la racine
- [ ] Tous les champs obligatoires renseignés
- [ ] `name` en minuscules, alphanumérique avec tirets uniquement
- [ ] `version` au format semver (X.Y.Z)
- [ ] `api_version` compatible avec la version courante de LUCA
- [ ] Au moins un `node_type` défini

### 2. Code sécurisé

- [ ] Validation statique passée sans erreurs critiques
- [ ] Pas d'utilisation de `eval()` ou `new Function()`
- [ ] Pas d'import de `child_process`, `fs`, `net`, `vm`, `worker_threads`
- [ ] Pas de manipulation de `process.exit`, `process.kill`
- [ ] Pas de code obfusqué

### 3. Intégrité

- [ ] Hash SHA-256 du fichier main correct
- [ ] Signature ed25519 valide (pour mods vérifiés)
- [ ] Taille du package < 10 MB

### 4. Fonctionnement

- [ ] Le mod s'initialise sans erreur
- [ ] Les nodes déclarés fonctionnent comme documenté
- [ ] Pas de crash ou de boucle infinie
- [ ] Respecte le timeout de 3 secondes par exécution

### 5. Permissions

- [ ] Seules les permissions nécessaires sont demandées
- [ ] Les permissions à risque moyen/élevé sont justifiées dans la description
- [ ] Pas de tentative de contournement des restrictions

---

## Critères recommandés (non-bloquants)

### 6. Documentation

- [ ] README.md présent et informatif
- [ ] Description claire de ce que fait le mod
- [ ] Instructions d'utilisation
- [ ] Exemples de configuration

### 7. Qualité du code

- [ ] Code lisible et commenté
- [ ] Gestion des erreurs appropriée
- [ ] Logs informatifs (pas excessifs)
- [ ] Pas de code mort

### 8. Métadonnées

- [ ] `display_name` descriptif
- [ ] `description` utile
- [ ] `author.email` valide
- [ ] `metadata.repository` pointant vers le code source
- [ ] `metadata.license` spécifié

### 9. Tests

- [ ] Tests unitaires fournis
- [ ] Couverture des cas d'erreur
- [ ] Tests passants

### 10. Compatibilité

- [ ] Fonctionne sur toutes les plateformes déclarées
- [ ] `compatibility.luca_min` correctement défini
- [ ] Pas de dépendance à des fonctionnalités non stables

---

## Niveaux de vérification

### ⚪ Non vérifié

- Validation automatique passée
- Pas de review manuelle
- Badge: aucun

**Critères**: #1, #2, #3

### 🟢 Vérifié

- Validation automatique passée
- Review manuelle par un mainteneur
- Badge: ✓ Verified

**Critères**: #1, #2, #3, #4, #5, + au moins 3 de #6-#10

### ⭐ Certifié

- Toutes les vérifications précédentes
- Audit de sécurité approfondi
- Auteur vérifié (identité confirmée)
- Badge: ⭐ Certified

**Critères**: Tous (#1-#10)

---

## Processus de review

### Étape 1: Soumission

1. Upload du mod via API ou interface web
2. Validation automatique immédiate
3. Si échec → retour des erreurs à l'auteur
4. Si succès → mod en attente de review

### Étape 2: Review automatique

- [ ] Scan antivirus
- [ ] Analyse statique du code
- [ ] Vérification des dépendances
- [ ] Test d'exécution en sandbox
- [ ] Mesure des performances

### Étape 3: Review manuelle (pour vérification)

- [ ] Lecture du code source
- [ ] Vérification de la cohérence permissions/fonctionnalités
- [ ] Test fonctionnel
- [ ] Vérification de la documentation

### Étape 4: Publication

- [ ] Attribution du badge approprié
- [ ] Indexation dans le registry
- [ ] Notification à l'auteur

---

## Raisons de rejet courantes

| Raison                    | Solution                           |
| ------------------------- | ---------------------------------- |
| Manifest invalide         | Vérifier avec `node validator.mjs` |
| Pattern dangereux détecté | Utiliser l'API runtime à la place  |
| Permission non justifiée  | Expliquer dans la description      |
| Code obfusqué             | Soumettre le code source lisible   |
| Crash à l'initialisation  | Tester localement avant soumission |
| Description manquante     | Ajouter un README.md complet       |
| Doublon fonctionnel       | Apporter une valeur ajoutée        |

---

## Révocation

Un mod peut être révoqué après publication si:

- Une faille de sécurité est découverte
- Le mod viole les conditions d'utilisation
- L'auteur le demande
- Le mod est abandonné depuis > 1 an sans mise à jour

---

## Contact

Pour toute question sur le processus de validation:

- 📧 mods-review@luca-app.example
- 💬 Discord #mod-review

---

_Version 1.0 - Décembre 2024_
