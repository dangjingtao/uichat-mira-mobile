package io.tomz.mira.mobile

import android.Manifest
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.os.Build
import android.os.SystemClock
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import java.io.File

class MiraAudioRecorderModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private var recorder: MediaRecorder? = null
  private var currentFile: File? = null
  private var startedAtEpochMs = 0L
  private var startedAtElapsedMs = 0L
  private var pausedAtElapsedMs: Long? = null
  private var totalPausedMs = 0L

  // Player state is only touched on the UI thread, including the completion
  // listener, so the MediaPlayer never gets concurrent calls.
  private var player: MediaPlayer? = null
  private var playerEnded = false
  private var playerDurationMs = 0L

  override fun getName(): String = MODULE_NAME

  @Suppress("DEPRECATION")
  @ReactMethod
  fun start(recordingId: String, promise: Promise) {
    if (recorder != null) {
      promise.reject("RECORDING_ACTIVE", "A recording is already active")
      return
    }
    if (!RECORDING_ID.matches(recordingId)) {
      promise.reject("INVALID_RECORDING_ID", "Recording id contains unsupported characters")
      return
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
      reactContext.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED
    ) {
      promise.reject("MICROPHONE_PERMISSION_REQUIRED", "Microphone permission is required")
      return
    }

    try {
      val directory = recordingsDirectory().also { it.mkdirs() }
      val file = File(directory, "$recordingId.m4a")
      if (file.exists() && !file.delete()) {
        throw IllegalStateException("Unable to replace existing local recording")
      }

      val nextRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        MediaRecorder(reactContext)
      } else {
        MediaRecorder()
      }
      nextRecorder.apply {
        setAudioSource(MediaRecorder.AudioSource.MIC)
        setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        setAudioSamplingRate(44100)
        setAudioEncodingBitRate(128000)
        setAudioChannels(1)
        setOutputFile(file.absolutePath)
        prepare()
        start()
      }

      recorder = nextRecorder
      currentFile = file
      startedAtEpochMs = System.currentTimeMillis()
      startedAtElapsedMs = SystemClock.elapsedRealtime()
      pausedAtElapsedMs = null
      totalPausedMs = 0L

      promise.resolve(Arguments.createMap().apply {
        putString("path", file.absolutePath)
        putDouble("startedAtMs", startedAtEpochMs.toDouble())
      })
    } catch (error: Exception) {
      releaseRecorder(deleteFile = true)
      promise.reject("RECORDING_START_FAILED", "Unable to start audio recording", error)
    }
  }

  @ReactMethod
  fun pause(promise: Promise) {
    val active = recorder
    if (active == null) {
      promise.reject("NO_ACTIVE_RECORDING", "There is no active recording")
      return
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
      promise.reject("PAUSE_UNSUPPORTED", "Pause requires Android 7.0 or newer")
      return
    }
    if (pausedAtElapsedMs != null) {
      promise.resolve(null)
      return
    }
    try {
      active.pause()
      pausedAtElapsedMs = SystemClock.elapsedRealtime()
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("RECORDING_PAUSE_FAILED", "Unable to pause audio recording", error)
    }
  }

  @ReactMethod
  fun resume(promise: Promise) {
    val active = recorder
    val pausedAt = pausedAtElapsedMs
    if (active == null || pausedAt == null) {
      promise.reject("NO_PAUSED_RECORDING", "There is no paused recording")
      return
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
      promise.reject("RESUME_UNSUPPORTED", "Resume requires Android 7.0 or newer")
      return
    }
    try {
      active.resume()
      totalPausedMs += SystemClock.elapsedRealtime() - pausedAt
      pausedAtElapsedMs = null
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("RECORDING_RESUME_FAILED", "Unable to resume audio recording", error)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    val active = recorder
    val file = currentFile
    if (active == null || file == null) {
      promise.reject("NO_ACTIVE_RECORDING", "There is no active recording")
      return
    }

    try {
      val nowElapsed = SystemClock.elapsedRealtime()
      val pausedExtra = pausedAtElapsedMs?.let { nowElapsed - it } ?: 0L
      active.stop()
      val endedAtMs = System.currentTimeMillis()
      val durationMs = (nowElapsed - startedAtElapsedMs - totalPausedMs - pausedExtra).coerceAtLeast(0L)
      val size = file.length()
      if (!file.exists() || size <= 0L) {
        throw IllegalStateException("Recording completed without a readable local file")
      }

      promise.resolve(Arguments.createMap().apply {
        putString("path", file.absolutePath)
        putDouble("startedAtMs", startedAtEpochMs.toDouble())
        putDouble("endedAtMs", endedAtMs.toDouble())
        putDouble("durationMs", durationMs.toDouble())
        putDouble("fileSizeBytes", size.toDouble())
      })
      releaseRecorder(deleteFile = false)
    } catch (error: Exception) {
      releaseRecorder(deleteFile = true)
      promise.reject("RECORDING_STOP_FAILED", "Unable to finish audio recording", error)
    }
  }

  @ReactMethod
  fun cancel(promise: Promise) {
    val active = recorder
    if (active != null) {
      try {
        active.stop()
      } catch (_: Exception) {
        // A very short recording can reject stop; cancellation still deletes the file.
      }
    }
    releaseRecorder(deleteFile = true)
    promise.resolve(null)
  }

  @ReactMethod
  fun fileInfo(path: String, promise: Promise) {
    try {
      val file = checkedRecordingFile(path)
      promise.resolve(Arguments.createMap().apply {
        putBoolean("exists", file.exists() && file.isFile)
        putDouble("size", if (file.exists() && file.isFile) file.length().toDouble() else 0.0)
      })
    } catch (error: Exception) {
      promise.reject("INVALID_RECORDING_PATH", "Unable to inspect local recording", error)
    }
  }

  @ReactMethod
  fun deleteFile(path: String, promise: Promise) {
    try {
      val file = checkedRecordingFile(path)
      if (file.exists() && !file.delete()) {
        throw IllegalStateException("Unable to delete local recording")
      }
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("RECORDING_DELETE_FAILED", "Unable to delete local recording", error)
    }
  }

  @ReactMethod
  fun playerLoad(path: String, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        val file = checkedRecordingFile(path)
        if (!file.exists() || !file.isFile || file.length() <= 0L) {
          throw IllegalArgumentException("Recording file is not readable")
        }

        releasePlayer()
        val nextPlayer = MediaPlayer()
        nextPlayer.setDataSource(file.absolutePath)
        nextPlayer.prepare()
        nextPlayer.setOnCompletionListener { _ ->
          // Runs on the same UI thread; MediaPlayer is already stopped here.
          playerEnded = true
        }
        player = nextPlayer
        playerEnded = false
        playerDurationMs = nextPlayer.duration.toLong().coerceAtLeast(0L)
        promise.resolve(Arguments.createMap().apply {
          putDouble("durationMs", playerDurationMs.toDouble())
        })
      } catch (error: Exception) {
        releasePlayer()
        promise.reject("PLAYER_LOAD_FAILED", "Unable to open the local recording", error)
      }
    }
  }

  @ReactMethod
  fun playerPlay(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val active = player
      if (active == null) {
        promise.reject("NO_LOADED_RECORDING", "There is no loaded recording to play")
        return@runOnUiThread
      }
      try {
        if (playerEnded) {
          active.seekTo(0)
          playerEnded = false
        }
        active.start()
        promise.resolve(null)
      } catch (error: Exception) {
        playerEnded = false
        promise.reject("PLAYER_PLAY_FAILED", "Unable to play the local recording", error)
      }
    }
  }

  @ReactMethod
  fun playerPause(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val active = player
      if (active == null) {
        promise.reject("NO_LOADED_RECORDING", "There is no loaded recording to pause")
        return@runOnUiThread
      }
      try {
        if (active.isPlaying) {
          active.pause()
        }
        promise.resolve(null)
      } catch (error: Exception) {
        promise.reject("PLAYER_PAUSE_FAILED", "Unable to pause the local recording", error)
      }
    }
  }

  @ReactMethod
  fun playerSeekTo(positionMs: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val active = player
      if (active == null) {
        promise.reject("NO_LOADED_RECORDING", "There is no loaded recording to seek")
        return@runOnUiThread
      }
      try {
        val target = positionMs.toLong().coerceIn(0L, playerDurationMs)
        active.seekTo(target.toInt())
        if (playerEnded && target < playerDurationMs) {
          playerEnded = false
        }
        promise.resolve(null)
      } catch (error: Exception) {
        promise.reject("PLAYER_SEEK_FAILED", "Unable to seek the local recording", error)
      }
    }
  }

  @ReactMethod
  fun playerGetState(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val active = player
      if (active == null) {
        promise.reject("NO_LOADED_RECORDING", "There is no loaded recording")
        return@runOnUiThread
      }
      val playing = try {
        active.isPlaying
      } catch (_: Exception) {
        false
      }
      val positionMs = try {
        active.currentPosition.toLong()
      } catch (_: Exception) {
        0L
      }
      promise.resolve(Arguments.createMap().apply {
        putDouble("positionMs", positionMs.toDouble())
        putDouble("durationMs", playerDurationMs.toDouble())
        putBoolean("playing", playing)
        putBoolean("ended", playerEnded)
      })
    }
  }

  @ReactMethod
  fun playerRelease(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      releasePlayer()
      promise.resolve(null)
    }
  }

  private fun recordingsDirectory() = File(reactContext.filesDir, RECORDINGS_DIR)

  private fun releasePlayer() {
    try {
      player?.stop()
    } catch (_: Exception) {
      // Stopping an uninitialized or finished player is not an error here.
    }
    try {
      player?.release()
    } catch (_: Exception) {
    }
    player = null
    playerEnded = false
    playerDurationMs = 0L
  }

  private fun checkedRecordingFile(path: String): File {
    val root = recordingsDirectory().canonicalFile
    val file = File(path).canonicalFile
    require(file.path.startsWith(root.path + File.separator)) {
      "Path is outside the Shiyan recording directory"
    }
    return file
  }

  private fun releaseRecorder(deleteFile: Boolean) {
    try {
      recorder?.reset()
    } catch (_: Exception) {
    }
    try {
      recorder?.release()
    } catch (_: Exception) {
    }
    if (deleteFile) {
      try {
        currentFile?.delete()
      } catch (_: Exception) {
      }
    }
    recorder = null
    currentFile = null
    startedAtEpochMs = 0L
    startedAtElapsedMs = 0L
    pausedAtElapsedMs = null
    totalPausedMs = 0L
  }

  companion object {
    private const val MODULE_NAME = "MiraAudioRecorder"
    private const val RECORDINGS_DIR = "shiyan-recordings"
    private val RECORDING_ID = Regex("^[A-Za-z0-9_-]{1,80}$")
  }
}
