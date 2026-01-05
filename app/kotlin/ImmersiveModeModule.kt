package com.luca

import android.os.Build
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.UiThreadUtil

/**
 * ImmersiveModeModule - Module natif pour activer le mode plein écran immersif
 *
 * Ce module permet de masquer complètement les barres système (status bar et
 * navigation bar) pour un affichage vraiment plein écran.
 */
class ImmersiveModeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "ImmersiveModeModule"
    }

    override fun getName(): String {
        return "ImmersiveModeModule"
    }

    /**
     * Active le mode immersif (masque status bar et navigation bar)
     */
    @ReactMethod
    fun enableImmersiveMode(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                // Pas d'activité disponible : renvoyer false au lieu de rejeter
                // pour éviter de spammer les logs côté JS lorsque le module
                // est appelé depuis un service ou hors de l'activité UI.
                Log.w(TAG, "Aucune activité disponible - ignoré")
                promise.resolve(false)
                return
            }

            UiThreadUtil.runOnUiThread {
                try {
                    val window = activity.window
                    val decorView = window.decorView

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        // Android 11+ (API 30+)
                        window.setDecorFitsSystemWindows(false)
                        val controller = window.insetsController
                        if (controller != null) {
                            controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                            controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                        }
                    } else {
                        // Android < 11
                        @Suppress("DEPRECATION")
                        decorView.systemUiVisibility = (
                            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            or View.SYSTEM_UI_FLAG_FULLSCREEN
                        )
                    }

                    // Permettre le rendu sous les encoches (notch)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        window.attributes.layoutInDisplayCutoutMode = 
                            WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                    }

                    Log.d(TAG, "Mode immersif activé")
                    promise.resolve(true)
                } catch (e: Exception) {
                    Log.e(TAG, "Erreur lors de l'activation du mode immersif", e)
                    promise.reject("IMMERSIVE_ERROR", e.message)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erreur enableImmersiveMode", e)
            promise.reject("IMMERSIVE_ERROR", e.message)
        }
    }

    /**
     * Désactive le mode immersif (restaure les barres système)
     */
    @ReactMethod
    fun disableImmersiveMode(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                // Même comportement côté désactivation : retourner false
                // si l'activité n'est pas disponible.
                Log.w(TAG, "Aucune activité disponible - ignoré")
                promise.resolve(false)
                return
            }

            UiThreadUtil.runOnUiThread {
                try {
                    val window = activity.window
                    val decorView = window.decorView

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        // Android 11+ (API 30+)
                        window.setDecorFitsSystemWindows(true)
                        val controller = window.insetsController
                        if (controller != null) {
                            controller.show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                        }
                    } else {
                        // Android < 11
                        @Suppress("DEPRECATION")
                        decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
                    }

                    // Restaurer le mode d'encoche par défaut
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        window.attributes.layoutInDisplayCutoutMode = 
                            WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT
                    }

                    Log.d(TAG, "Mode immersif désactivé")
                    promise.resolve(true)
                } catch (e: Exception) {
                    Log.e(TAG, "Erreur lors de la désactivation du mode immersif", e)
                    promise.reject("IMMERSIVE_ERROR", e.message)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erreur disableImmersiveMode", e)
            promise.reject("IMMERSIVE_ERROR", e.message)
        }
    }
}
