package com.luca

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CameraCharacteristics
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
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
  
  private fun emitNativePermissionMissing(reason: String) {
    try {
      val params = Arguments.createMap()
      params.putString("reason", reason)
      reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("flashlight.permission.native_missing", params)
    } catch (e: Exception) {
      Log.w("TorchModule", "Failed to emit flashlight.permission.native_missing: ${'$'}{e.message}")
    }
  }

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

  @ReactMethod
  fun switchTorch(enabled: Boolean) {
    try {
      Log.d("TorchModule", "switchTorch called enabled=$enabled")

      // Check permission first
      val hasCameraPermission = ContextCompat.checkSelfPermission(reactApplicationContext, android.Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
      if (!hasCameraPermission) {
        Log.w("TorchModule", "switchTorch: CAMERA permission missing")
        // Don't throw; just log and notify JS so it can force a permission flow.
        emitNativePermissionMissing("missing_os_permission")
        return
      }

      // Find the first camera that has a flash unit
      var torchCameraId: String? = null
      try {
        for (id in cameraManager.cameraIdList) {
          val chars = cameraManager.getCameraCharacteristics(id)
          val hasFlash = chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
          if (hasFlash) {
            torchCameraId = id
            break
          }
        }
      } catch (e: Exception) {
        Log.w("TorchModule", "Unable to inspect camera characteristics: ${e.message}")
      }

      if (torchCameraId == null) {
        Log.w("TorchModule", "No camera with flash available")
        return
      }

      try {
        cameraManager.setTorchMode(torchCameraId, enabled)
        Log.d("TorchModule", "setTorchMode called on $torchCameraId -> $enabled")
      } catch (e: Exception) {
        Log.e("TorchModule", "Failed to setTorchMode: ${e.message}")
        emitNativePermissionMissing("set_torch_failed:${'$'}{e.javaClass.simpleName}")
      }
    } catch (e: Exception) {
      Log.e("TorchModule", "unexpected error in switchTorch: ${e.message}")
      emitNativePermissionMissing("unexpected_error")
    }
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
