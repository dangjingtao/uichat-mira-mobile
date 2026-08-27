package io.tomz.mira.mobile

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class MiraLocalStoreModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private val preferences = reactContext.getSharedPreferences(
    PREFERENCES_NAME,
    Context.MODE_PRIVATE,
  )

  override fun getName(): String = MODULE_NAME

  @ReactMethod
  fun get(key: String, promise: Promise) {
    if (!validateKey(key, promise)) return
    try {
      promise.resolve(preferences.getString(key, null))
    } catch (error: Exception) {
      promise.reject("LOCAL_STORE_READ_FAILED", "Unable to read local Mira UI state", error)
    }
  }

  @ReactMethod
  fun set(key: String, value: String, promise: Promise) {
    if (!validateKey(key, promise)) return
    try {
      val saved = preferences.edit().putString(key, value).commit()
      if (!saved) {
        promise.reject("LOCAL_STORE_WRITE_FAILED", "Unable to persist local Mira UI state")
        return
      }
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("LOCAL_STORE_WRITE_FAILED", "Unable to persist local Mira UI state", error)
    }
  }

  @ReactMethod
  fun remove(key: String, promise: Promise) {
    if (!validateKey(key, promise)) return
    try {
      val removed = preferences.edit().remove(key).commit()
      if (!removed) {
        promise.reject("LOCAL_STORE_REMOVE_FAILED", "Unable to remove local Mira UI state")
        return
      }
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("LOCAL_STORE_REMOVE_FAILED", "Unable to remove local Mira UI state", error)
    }
  }

  private fun validateKey(key: String, promise: Promise): Boolean {
    if (key.isBlank()) {
      promise.reject("LOCAL_STORE_INVALID_KEY", "Local UI state key cannot be empty")
      return false
    }
    return true
  }

  companion object {
    private const val MODULE_NAME = "MiraLocalStore"
    private const val PREFERENCES_NAME = "mira_local_ui_state_v1"
  }
}
