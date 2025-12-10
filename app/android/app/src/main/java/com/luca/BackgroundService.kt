package com.luca

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.app.ServiceInfoCompat

class BackgroundService : Service() {

  private var wakeLock: PowerManager.WakeLock? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    acquireWakeLock()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val notification = buildNotification()
    ServiceCompat.startForeground(
      this,
      NOTIFICATION_ID,
      notification,
      ServiceInfoCompat.FOREGROUND_SERVICE_TYPE_DATA_SYNC
    )
    return START_STICKY
  }

  override fun onDestroy() {
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
    lock.acquire()
    wakeLock = lock
  }

  private fun buildNotification(): Notification {
    val intent = Intent(this, MainActivity::class.java)
    val pendingIntent = PendingIntent.getActivity(
      this,
      0,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("LUCA actif en arrière-plan")
      .setContentText("Les automatisations continuent même écran éteint.")
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentIntent(pendingIntent)
      .setOngoing(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .build()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "LUCA service arrière-plan",
      NotificationManager.IMPORTANCE_LOW
    )
    channel.description = "Garantit l'exécution en arrière-plan"

    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(channel)
  }

  companion object {
    private const val CHANNEL_ID = "luca_background_channel"
    private const val NOTIFICATION_ID = 31337
  }
}
