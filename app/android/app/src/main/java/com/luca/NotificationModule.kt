package com.luca

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class NotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val CHANNEL_ID = "luca_notifications"
        const val CHANNEL_NAME = "LUCA Notifications"
        const val CHANNEL_DESCRIPTION = "Notifications de l'application LUCA"
        private var notificationId = 0
    }

    override fun getName(): String = "NotificationModule"

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = CHANNEL_DESCRIPTION
                enableVibration(true)
                setShowBadge(true)
            }
            
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    @ReactMethod
    fun showNotification(title: String, message: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            
            val builder = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)
                .setVibrate(longArrayOf(0, 250, 250, 250))

            val notificationManager = NotificationManagerCompat.from(context)
            
            // Vérifier si les notifications sont activées
            if (!notificationManager.areNotificationsEnabled()) {
                promise.reject("NOTIFICATIONS_DISABLED", "Les notifications sont désactivées")
                return
            }

            try {
                notificationManager.notify(notificationId++, builder.build())
                promise.resolve(true)
            } catch (e: SecurityException) {
                promise.reject("PERMISSION_DENIED", "Permission de notification refusée: ${e.message}")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Erreur lors de l'affichage de la notification: ${e.message}")
        }
    }

    @ReactMethod
    fun areNotificationsEnabled(promise: Promise) {
        try {
            val notificationManager = NotificationManagerCompat.from(reactApplicationContext)
            promise.resolve(notificationManager.areNotificationsEnabled())
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
