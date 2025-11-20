#!/usr/bin/env fish

# Script pour réinitialiser complètement l'app et les permissions
# Usage: ./reset-app-permissions.fish

echo "🔄 Réinitialisation complète de LUCA"
echo "===================================="
echo ""

# Vérifier l'appareil
set device (adb devices | grep -v "List" | grep "device" | awk '{print $1}')

if test -z "$device"
    echo "❌ Aucun appareil Android connecté"
    exit 1
end

echo "📱 Appareil: $device"
echo ""

# Arrêter l'app si elle tourne
echo "⏹️  Arrêt de l'application..."
adb shell am force-stop com.luca

# Désinstaller complètement
echo "🗑️  Désinstallation complète..."
adb uninstall com.luca 2>/dev/null

if test $status -eq 0
    echo "✅ App désinstallée"
else
    echo "ℹ️  App n'était pas installée"
end

echo ""
echo "📦 Réinstallation..."
npm run android

# Remove CAMERA permission to force runtime dialog when next requested
echo "🔒 Revoking CAMERA permission to force prompt"
adb shell pm revoke com.luca android.permission.CAMERA || true

echo ""
echo "✅ Terminé !"
echo ""
echo "📋 Prochaines étapes :"
echo "1. Ouvrez l'app LUCA sur votre appareil"
echo "2. Créez un graphe avec FlashLight Action"
echo "3. Une popup de permission devrait apparaître"
echo "4. Cliquez sur 'Autoriser'"
echo "5. Testez la lampe !"
