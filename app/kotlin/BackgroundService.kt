package com.luca

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.content.pm.ServiceInfo
import android.graphics.BitmapFactory
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.ReactContext

class BackgroundService : Service() {

  private var wakeLock: PowerManager.WakeLock? = null
  private var showControls: Boolean = true
  private var triggerRunning: Boolean = false
  private var actionReceiver: BroadcastReceiver? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    acquireWakeLock()
    registerActionReceiver()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    intent?.let {
      showControls = it.getBooleanExtra(EXTRA_SHOW_CONTROLS, true)
      if (it.hasExtra(EXTRA_TRIGGER_STATE)) {
        triggerRunning = it.getBooleanExtra(EXTRA_TRIGGER_STATE, false)
      }
    }
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    return START_STICKY
  }

  override fun onDestroy() {
    unregisterActionReceiver()
    wakeLock?.let {
      if (it.isHeld) it.release()
    }
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun acquireWakeLock() {
    val manager = getSystemService(Context.POWER_SERVICE) as PowerManager
    val lock = manager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LUCA::BackgroundServiceWakelock")
    lock.setReferenceCounted(false)
    // Acquire with 10 minute timeout for safety, will be re-acquired on notification updates
    lock.acquire(10 * 60 * 1000L)
    wakeLock = lock
  }

  // Re-acquire wake lock to extend duration when program is active
  private fun extendWakeLock() {
    wakeLock?.let {
      if (it.isHeld) {
        it.release()
      }
      it.acquire(10 * 60 * 1000L)
    }
  }

  private fun registerActionReceiver() {
    actionReceiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context?, intent: Intent?) {
        when (intent?.action) {
          ACTION_PLAY -> {
            triggerRunning = true
            extendWakeLock() // Extend wake lock when starting from notification
            updateNotification()
            emitTriggerEvent("play")
          }
          ACTION_STOP -> {
            triggerRunning = false
            updateNotification()
            emitTriggerEvent("stop")
          }
        }
      }
    }
    val filter = IntentFilter().apply {
      addAction(ACTION_PLAY)
      addAction(ACTION_STOP)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(actionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      registerReceiver(actionReceiver, filter)
    }
  }

  private fun unregisterActionReceiver() {
    actionReceiver?.let {
      try {
        unregisterReceiver(it)
      } catch (e: Exception) {
        // Ignore
      }
    }
    actionReceiver = null
  }

  private fun emitTriggerEvent(action: String) {
    try {
      val reactContext = (application as? MainApplication)?.reactHost?.currentReactContext
      if (reactContext is ReactContext && reactContext.hasActiveReactInstance()) {
        val params = Arguments.createMap()
        params.putString("action", action)
        reactContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("luca.trigger.toggle", params)
      }
    } catch (e: Exception) {
      // Ignore emission failures
    }
  }

  fun updateShowControls(show: Boolean) {
    showControls = show
    updateNotification()
  }

  fun updateTriggerState(running: Boolean) {
    val wasRunning = triggerRunning
    triggerRunning = running
    // Extend wake lock when program starts or is still running
    if (running) {
      extendWakeLock()
    }
    updateNotification()
  }

  private fun updateNotification() {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(NOTIFICATION_ID, buildNotification())
  }

  private fun buildNotification(): Notification {
    val openIntent = Intent(this, MainActivity::class.java)
    val openPendingIntent = PendingIntent.getActivity(
      this,
      0,
      openIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    val largeIcon = BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher)
    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_notification)
      .setLargeIcon(largeIcon)
      .setContentIntent(openPendingIntent)
      .setOngoing(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

    if (showControls) {
      if (triggerRunning) {
        builder.setContentTitle("LUCA - Programme actif")
        builder.setContentText("Appuyez pour arrêter")
        builder.setPriority(NotificationCompat.PRIORITY_HIGH)
        val stopIntent = Intent(ACTION_STOP).setPackage(packageName)
        val stopPendingIntent = PendingIntent.getBroadcast(
          this,
          1,
          stopIntent,
          PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        builder.addAction(
          android.R.drawable.ic_media_pause,
          "⏹ STOP",
          stopPendingIntent
        )
      } else {
        builder.setContentTitle("LUCA - En attente")
        builder.setContentText("Appuyez sur Play pour démarrer")
        builder.setPriority(NotificationCompat.PRIORITY_DEFAULT)
        val playIntent = Intent(ACTION_PLAY).setPackage(packageName)
        val playPendingIntent = PendingIntent.getBroadcast(
          this,
          2,
          playIntent,
          PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        builder.addAction(
          android.R.drawable.ic_media_play,
          "▶ PLAY",
          playPendingIntent
        )
      }
    } else {
      builder.setContentTitle("LUCA actif")
      builder.setContentText("Automatisations en arrière-plan")
      builder.setPriority(NotificationCompat.PRIORITY_LOW)
      builder.setSilent(true)
    }

    return builder.build()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "LUCA - Contrôle du programme",
      NotificationManager.IMPORTANCE_DEFAULT
    )
    channel.description = "Affiche l'état du programme et permet de le contrôler"
    channel.setShowBadge(true)
    channel.enableLights(true)
    channel.lightColor = 0xFF4CAF50.toInt()

    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(channel)
  }

  companion object {
    private const val CHANNEL_ID = "luca_background_channel"
    private const val NOTIFICATION_ID = 31337
    const val EXTRA_SHOW_CONTROLS = "show_controls"
    const val EXTRA_TRIGGER_STATE = "trigger_state"
    const val ACTION_PLAY = "com.luca.ACTION_PLAY"
    const val ACTION_STOP = "com.luca.ACTION_STOP"
  }
}
