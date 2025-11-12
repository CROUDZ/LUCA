#!/bin/bash

# Quitter si une commande échoue
set -e

# Chemin racine du projet
PROJECT_ROOT="$(pwd)"

# Créer le dossier assets si nécessaire
mkdir -p android/app/src/main/assets

# Générer le bundle JS pour Android
echo "Génération du bundle JS..."
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/

# Construire l'APK debug
echo "Construction de l'APK debug..."
cd android
./gradlew assembleDebug

# Créer le dossier build à la racine du projet
cd "$PROJECT_ROOT"
mkdir -p build

# Copier l'APK généré dans build/
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
  cp "$APK_PATH" build/
  echo "APK debug généré et copié dans build/app-debug.apk"
else
  echo "Erreur : APK non trouvé !"
  exit 1
fi
