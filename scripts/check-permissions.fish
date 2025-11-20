#!/usr/bin/env fish

# Diagnostic rapide de l'état des permissions
# Usage: ./check-permissions.fish

echo "🔍 Vérification des permissions LUCA"
echo "====================================="
echo ""

set device (adb devices | grep -v "List" | grep "device" | awk '{print $1}')

if test -z "$device"
    echo "❌ Aucun appareil connecté"
    exit 1
end

echo "📱 Appareil: $device"
echo ""

# Vérifier si l'app est installée
set installed (adb shell pm list packages | grep com.luca)

if test -z "$installed"
    echo "❌ LUCA n'est PAS installée"
    echo ""
    echo "➡️  Installez avec: npm run android"
    exit 1
end

echo "✅ LUCA est installée"
echo ""

# Vérifier les permissions déclarées
echo "📋 Permissions déclarées dans le manifeste:"
adb shell dumpsys package com.luca | grep "android.permission" | grep -i camera
echo ""

# Vérifier les permissions runtime accordées
echo "🔐 État des permissions runtime:"
set perm_status (adb shell dumpsys package com.luca | grep "android.permission.CAMERA" | grep "granted=")

if test -n "$perm_status"
    if echo $perm_status | grep -q "granted=true"
        echo "✅ Permission CAMERA ACCORDÉE"
    else
        echo "❌ Permission CAMERA REFUSÉE"
        echo ""
        echo "➡️  Pour accorder la permission:"
        echo "    Option 1: Réinitialisez l'app avec ./scripts/reset-app-permissions.fish"
        echo "    Option 2: Manuellement dans Paramètres > Apps > LUCA > Permissions"
        echo "    Option 3: adb shell pm grant com.luca android.permission.CAMERA"
    end
else
    echo "⚠️  Impossible de déterminer l'état (l'app n'a peut-être jamais demandé)"
end

echo ""

# Vérifier si l'app tourne
set running (adb shell ps | grep com.luca)

if test -n "$running"
    echo "✅ App en cours d'exécution"
else
    echo "⏹️  App non démarrée"
    echo ""
    echo "➡️  Démarrez l'app sur votre appareil"
end

echo ""
echo "📊 Résumé:"
echo "--------"

if test -n "$installed"
    echo "✅ App installée"
else
    echo "❌ App non installée"
end

if echo $perm_status | grep -q "granted=true"
    echo "✅ Permission accordée"
else
    echo "❌ Permission manquante"
end

if test -n "$running"
    echo "✅ App en cours"
else
    echo "⏹️  App arrêtée"
end

echo ""
echo "💡 Pour voir les logs en temps réel:"
echo "   npx react-native log-android | grep -i flashlight"
