package com.luca

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * VoiceRecognitionModule - Module natif pour la reconnaissance vocale
 *
 * Permet d'écouter en continu et de détecter des mots-clés vocaux.
 * Utilise l'API SpeechRecognizer d'Android.
 */
class VoiceRecognitionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false
    private var shouldRestart = false
    private var language = "fr-FR"
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun getName(): String = "VoiceRecognitionModule"

    private fun emitEvent(eventName: String, params: com.facebook.react.bridge.WritableMap) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to emit event $eventName: ${e.message}")
        }
    }

    private fun emitState(state: String) {
        val params = Arguments.createMap()
        params.putString("state", state)
        emitEvent("voiceRecognition.state", params)
    }

    private fun emitError(code: String, message: String) {
        val params = Arguments.createMap()
        params.putString("code", code)
        params.putString("message", message)
        emitEvent("voiceRecognition.error", params)
    }

    private fun emitResult(transcript: String, isFinal: Boolean, confidence: Float) {
        val params = Arguments.createMap()
        params.putString("transcript", transcript)
        params.putBoolean("isFinal", isFinal)
        params.putDouble("confidence", confidence.toDouble())
        emitEvent("voiceRecognition.result", params)
    }

    private val recognitionListener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
            Log.d(TAG, "Ready for speech")
            emitState("listening")
        }

        override fun onBeginningOfSpeech() {
            Log.d(TAG, "Beginning of speech")
        }

        override fun onRmsChanged(rmsdB: Float) {
            // Volume level change - could be used for UI feedback
        }

        override fun onBufferReceived(buffer: ByteArray?) {
            // Audio buffer received
        }

        override fun onEndOfSpeech() {
            Log.d(TAG, "End of speech")
            emitState("processing")
        }

        override fun onError(error: Int) {
            val errorCode = when (error) {
                SpeechRecognizer.ERROR_AUDIO -> "ERROR_AUDIO"
                SpeechRecognizer.ERROR_CLIENT -> "ERROR_CLIENT"
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "ERROR_PERMISSIONS"
                SpeechRecognizer.ERROR_NETWORK -> "ERROR_NETWORK"
                SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "ERROR_NETWORK_TIMEOUT"
                SpeechRecognizer.ERROR_NO_MATCH -> "ERROR_NO_MATCH"
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "ERROR_BUSY"
                SpeechRecognizer.ERROR_SERVER -> "ERROR_SERVER"
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "ERROR_SPEECH_TIMEOUT"
                else -> "ERROR_UNKNOWN"
            }
            
            val errorMessage = when (error) {
                SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                SpeechRecognizer.ERROR_CLIENT -> "Client side error"
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
                SpeechRecognizer.ERROR_NETWORK -> "Network error"
                SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                SpeechRecognizer.ERROR_NO_MATCH -> "No speech match found"
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognition service is busy"
                SpeechRecognizer.ERROR_SERVER -> "Server error"
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Speech input timeout"
                else -> "Unknown error"
            }

            Log.w(TAG, "Recognition error: $errorCode - $errorMessage")
            
            // Pour certaines erreurs (pas de match, timeout), on redémarre l'écoute
            if (shouldRestart && (error == SpeechRecognizer.ERROR_NO_MATCH || 
                                   error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ||
                                   error == SpeechRecognizer.ERROR_CLIENT)) {
                Log.d(TAG, "Restarting recognition after error")
                mainHandler.postDelayed({
                    if (shouldRestart) {
                        startRecognitionInternal()
                    }
                }, 100)
            } else {
                emitError(errorCode, errorMessage)
                if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
                    isListening = false
                    shouldRestart = false
                }
            }
        }

        override fun onResults(results: Bundle?) {
            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val confidences = results?.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES)
            
            if (!matches.isNullOrEmpty()) {
                val transcript = matches[0]
                val confidence = confidences?.getOrNull(0) ?: 1.0f
                
                Log.d(TAG, "Final result: $transcript (confidence: $confidence)")
                emitResult(transcript, true, confidence)
            }

            // Redémarrer l'écoute si le mode continu est activé
            if (shouldRestart) {
                mainHandler.postDelayed({
                    if (shouldRestart) {
                        startRecognitionInternal()
                    }
                }, 100)
            }
        }

        override fun onPartialResults(partialResults: Bundle?) {
            val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            
            if (!matches.isNullOrEmpty()) {
                val transcript = matches[0]
                Log.d(TAG, "Partial result: $transcript")
                emitResult(transcript, false, 0.5f)
            }
        }

        override fun onEvent(eventType: Int, params: Bundle?) {
            Log.d(TAG, "Recognition event: $eventType")
        }
    }

    @ReactMethod
    fun startListening(options: ReadableMap?, promise: Promise) {
        mainHandler.post {
            try {
                if (!SpeechRecognizer.isRecognitionAvailable(reactApplicationContext)) {
                    promise.reject("NOT_AVAILABLE", "Speech recognition is not available on this device")
                    return@post
                }

                // Récupérer les options
                language = options?.getString("language") ?: "fr-FR"
                val continuous = options?.getBoolean("continuous") ?: true
                shouldRestart = continuous

                // Créer le recognizer si nécessaire
                if (speechRecognizer == null) {
                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactApplicationContext)
                    speechRecognizer?.setRecognitionListener(recognitionListener)
                }

                startRecognitionInternal()
                isListening = true
                
                Log.d(TAG, "Voice recognition started (language: $language, continuous: $continuous)")
                promise.resolve(true)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start listening: ${e.message}")
                promise.reject("START_ERROR", e.message)
            }
        }
    }

    private fun startRecognitionInternal() {
        try {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                // Paramètres pour une écoute plus réactive
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 500L)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1000L)
            }
            
            speechRecognizer?.startListening(intent)
            emitState("listening")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start recognition: ${e.message}")
            emitError("START_ERROR", e.message ?: "Unknown error")
        }
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        mainHandler.post {
            try {
                shouldRestart = false
                isListening = false
                
                speechRecognizer?.stopListening()
                speechRecognizer?.cancel()
                
                emitState("idle")
                
                Log.d(TAG, "Voice recognition stopped")
                promise.resolve(true)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop listening: ${e.message}")
                promise.reject("STOP_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        try {
            val available = SpeechRecognizer.isRecognitionAvailable(reactApplicationContext)
            promise.resolve(available)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RCTEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RCTEventEmitter
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            shouldRestart = false
            speechRecognizer?.destroy()
            speechRecognizer = null
        } catch (e: Exception) {
            Log.w(TAG, "Error destroying speech recognizer: ${e.message}")
        }
    }

    companion object {
        private const val TAG = "VoiceRecognitionModule"
    }
}
