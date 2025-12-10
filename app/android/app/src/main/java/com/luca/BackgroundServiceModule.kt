package com.luca

import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BackgroundServiceModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  override fun getName(): String = "BackgroundService"

  @ReactMethod
  fun start() {
    try {
      val intent = Intent(context, BackgroundService::class.java)
      ContextCompat.startForegroundService(context, intent)
    } catch (error: Exception) {
      Log.e("BackgroundService", "Failed to start service: ${'$'}{error.message}")
    }
  }

  @ReactMethod
  fun stop() {
    try {
      val intent = Intent(context, BackgroundService::class.java)
      context.stopService(intent)
    } catch (error: Exception) {
      Log.e("BackgroundService", "Failed to stop service: ${'$'}{error.message}")
    }
  }
}
