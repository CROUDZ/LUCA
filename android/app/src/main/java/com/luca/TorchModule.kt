package com.luca

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.hardware.camera2.CameraManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * TorchModule - expose a system-level torch change event to JS.
 *
 * On Android we use CameraManager.TorchCallback to detect hardware
 * toggles done outside the app (control center / quick settings).
 * We emit a DeviceEventEmitter event `flashlight.system.changed` with
 * { enabled: boolean }.
 */
class TorchModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  private val cameraManager = reactContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager

  private val callback = object : CameraManager.TorchCallback() {
    override fun onTorchModeChanged(cameraId: String, enabled: Boolean) {
      super.onTorchModeChanged(cameraId, enabled)
      try {
        Log.d("TorchModule", "onTorchModeChanged cameraId=${cameraId} enabled=${enabled}")
        val params = Arguments.createMap()
        params.putBoolean("enabled", enabled)
        reactApplicationContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("flashlight.system.changed", params)
      } catch (e: Exception) {
        // don't crash if the bridge is not ready
      }
    }
  }

  init {
    try {
        Log.d("TorchModule", "registering TorchCallback")
      cameraManager.registerTorchCallback(callback, Handler(Looper.getMainLooper()))
    } catch (e: Exception) {
        Log.d("TorchModule", "failed to register TorchCallback: ${e.message}")
      // some devices may not provide a camera manager, ignore
    }
  }

  override fun getName(): String {
    return "TorchModule"
  }

  override fun onCatalystInstanceDestroy() {
    try {
      cameraManager.unregisterTorchCallback(callback)
    } catch (e: Exception) {
      // ignore
    }
    super.onCatalystInstanceDestroy()
  }

  // Required by NativeEventEmitter when constructing from JS; implement
  // stub methods so RN doesn't warn about missing addListener/removeListeners.
  @ReactMethod
  fun addListener(eventName: String?) {
    // no-op
    // Keep parameter to satisfy RN bridge signature.
    if (eventName == null) return
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // no-op
    if (count <= 0) return
  }
}
