#!/usr/bin/env fish

# Script de diagnostic pour FlashLightAction Node
# Usage: ./debug-flashlight.fish

echo "🔍 Diagnostic FlashLightAction Node"
echo "===================================="
echo ""

echo "📱 Vérification de l'appareil connecté..."
set device (adb devices | grep -v "List" | grep "device" | awk '{print $1}')

if test -z "$device"
    echo "❌ Aucun appareil Android connecté"
    echo "   Connectez votre appareil et activez le débogage USB"
    exit 1
end

echo "✅ Appareil connecté: $device"
echo ""

echo "🔐 Vérification des permissions..."
set camera_perm (adb shell dumpsys package com.luca | grep "android.permission.CAMERA" | head -1)

if test -n "$camera_perm"
    echo "✅ Permission CAMERA présente dans le manifeste"
    echo "   $camera_perm"
else
    echo "⚠️  Permission CAMERA non trouvée"
end

echo ""
echo "📦 Vérification du package installé..."
set package_installed (adb shell pm list packages | grep com.luca)

if test -n "$package_installed"
    echo "✅ Package com.luca installé"
else
    echo "❌ Package com.luca non installé"
    echo "   Exécutez: npm run android"
    exit 1
end

echo ""
echo "🔦 Test de la permission caméra runtime..."
adb shell pm grant com.luca android.permission.CAMERA 2>/dev/null
if test $status -eq 0
    echo "✅ Permission CAMERA accordée"
else
    echo "⚠️  Impossible d'accorder la permission automatiquement"
    echo "   Accordez manuellement: Paramètres > Apps > LUCA > Permissions > Caméra"
end

echo ""
echo "📊 État actuel de l'app..."
set app_running (adb shell ps | grep com.luca)

if test -n "$app_running"
    echo "✅ App en cours d'exécution"
else
    echo "⚠️  App non démarrée"
    echo "   Démarrez l'app sur votre appareil"
end

echo ""
echo "📝 Logs récents (FlashLight)..."
echo "   (Ctrl+C pour arrêter)"
echo "   -------------------------"
adb logcat -s ReactNativeJS:* | grep -i flashlight --color=always
