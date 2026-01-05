package com.luca

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BackgroundServiceModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  override fun getName(): String = "BackgroundService"

  @ReactMethod
  fun start(showControls: Boolean = true) {
    try {
      val intent = Intent(context, BackgroundService::class.java)
      intent.putExtra(BackgroundService.EXTRA_SHOW_CONTROLS, showControls)
      ContextCompat.startForegroundService(context, intent)
    } catch (error: Exception) {
      Log.e("BackgroundService", "Failed to start service: ${error.message}")
    }
  }

  @ReactMethod
  fun stop() {
    try {
      val intent = Intent(context, BackgroundService::class.java)
      context.stopService(intent)
    } catch (error: Exception) {
      Log.e("BackgroundService", "Failed to stop service: ${error.message}")
    }
  }

  @ReactMethod
  fun updateNotificationControls(show: Boolean) {
    try {
      val intent = Intent(context, BackgroundService::class.java)
      intent.putExtra(BackgroundService.EXTRA_SHOW_CONTROLS, show)
      ContextCompat.startForegroundService(context, intent)
    } catch (error: Exception) {
      Log.e("BackgroundService", "Failed to update notification controls: ${error.message}")
    }
  }

  @ReactMethod
  fun updateTriggerState(running: Boolean) {
    try {
      val intent = Intent(context, BackgroundService::class.java)
      intent.putExtra(BackgroundService.EXTRA_TRIGGER_STATE, running)
      ContextCompat.startForegroundService(context, intent)
    } catch (error: Exception) {
      Log.e("BackgroundService", "Failed to update trigger state: ${error.message}")
    }
  }
}
