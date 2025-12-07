package com.luca

import android.content.Context
import android.media.AudioManager
import android.util.Log
import android.view.KeyEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference

class VolumeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    private var reactContextRef: WeakReference<ReactApplicationContext>? = null
    private var audioManagerRef: WeakReference<AudioManager>? = null

    private fun getAudioManager(): AudioManager? {
      val context = reactContextRef?.get() ?: return null
      var manager = audioManagerRef?.get()
      if (manager == null) {
        manager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        if (manager != null) {
          audioManagerRef = WeakReference(manager)
        }
      }
      return manager
    }

    fun attachContext(context: ReactApplicationContext) {
      reactContextRef = WeakReference(context)
      audioManagerRef = WeakReference(context.getSystemService(Context.AUDIO_SERVICE) as AudioManager)
    }

    fun handleHardwareVolumeEvent(event: KeyEvent): Boolean {
      if (event.keyCode != KeyEvent.KEYCODE_VOLUME_UP && event.keyCode != KeyEvent.KEYCODE_VOLUME_DOWN) {
        return false
      }
      if (event.action != KeyEvent.ACTION_DOWN && event.action != KeyEvent.ACTION_UP) {
        return false
      }

      val direction = if (event.keyCode == KeyEvent.KEYCODE_VOLUME_UP) "up" else "down"
      val action = if (event.action == KeyEvent.ACTION_UP) "release" else "press"
      emitVolumeButtonEvent(direction, action, event.repeatCount)
      return false
    }

    private fun emitVolumeButtonEvent(direction: String, action: String, repeat: Int) {
      val context = reactContextRef?.get() ?: return
      val audioManager = getAudioManager()

      try {
        val params = Arguments.createMap()
        params.putString("direction", direction)
        params.putString("action", action)
        params.putInt("repeat", repeat)
        params.putDouble("timestamp", System.currentTimeMillis().toDouble())
        if (audioManager != null) {
          params.putInt("volume", audioManager.getStreamVolume(AudioManager.STREAM_MUSIC))
          params.putInt("maxVolume", audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC))
        }
        context
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("hardware.volume.button", params)
      } catch (error: Exception) {
        Log.w("VolumeModule", "Failed to emit hardware.volume.button: ${'$'}{error.message}")
      }
    }

    fun emitVolumeLevelChanged(source: String) {
      val context = reactContextRef?.get() ?: return
      val audioManager = getAudioManager() ?: return

      try {
        val params = Arguments.createMap()
        params.putString("source", source)
        params.putInt("volume", audioManager.getStreamVolume(AudioManager.STREAM_MUSIC))
        params.putInt("maxVolume", audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC))
        params.putDouble("timestamp", System.currentTimeMillis().toDouble())
        context
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("volume.level.changed", params)
      } catch (error: Exception) {
        Log.w("VolumeModule", "Failed to emit volume.level.changed: ${'$'}{error.message}")
      }
    }
  }

  private val audioManager: AudioManager =
    reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

  init {
    attachContext(reactApplicationContext)
  }

  override fun getName(): String = "VolumeModule"

  private fun buildVolumeInfo(): WritableMap {
    val map = Arguments.createMap()
    map.putInt("volume", audioManager.getStreamVolume(AudioManager.STREAM_MUSIC))
    map.putInt("maxVolume", audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC))
    map.putDouble("timestamp", System.currentTimeMillis().toDouble())
    return map
  }

  @ReactMethod
  fun getVolumeInfo(promise: Promise) {
    try {
      val info = buildVolumeInfo()
      promise.resolve(info)
    } catch (error: Exception) {
      Log.e("VolumeModule", "getVolumeInfo failed: ${'$'}{error.message}")
      promise.reject("volume_info_error", error)
    }
  }

  @ReactMethod
  fun adjustVolume(direction: String?, steps: Int, showUI: Boolean, promise: Promise) {
    try {
      val adjustedSteps = if (steps <= 0) 1 else steps
      val flag = if (showUI) AudioManager.FLAG_SHOW_UI else 0
      val adjustDirection = when (direction?.lowercase()) {
        "down" -> AudioManager.ADJUST_LOWER
        else -> AudioManager.ADJUST_RAISE
      }

      repeat(adjustedSteps) {
        audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, adjustDirection, flag)
      }

      val info = buildVolumeInfo()
      emitVolumeLevelChanged("adjust")
      promise.resolve(info)
    } catch (error: Exception) {
      Log.e("VolumeModule", "adjustVolume failed: ${'$'}{error.message}")
      promise.reject("volume_adjust_error", error)
    }
  }

  @ReactMethod
  fun setVolume(level: Int, showUI: Boolean, promise: Promise) {
    try {
      val clamped = level.coerceIn(0, audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC))
      val flag = if (showUI) AudioManager.FLAG_SHOW_UI else 0
      audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, clamped, flag)
      val info = buildVolumeInfo()
      emitVolumeLevelChanged("set")
      promise.resolve(info)
    } catch (error: Exception) {
      Log.e("VolumeModule", "setVolume failed: ${'$'}{error.message}")
      promise.reject("volume_set_error", error)
    }
  }

  @ReactMethod
  fun addListener(eventName: String?) {
    // Required by NativeEventEmitter - intentionally left blank
    if (eventName == null) return
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required by NativeEventEmitter - intentionally left blank
    if (count <= 0) return
  }
}