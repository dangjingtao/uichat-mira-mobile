import { Platform } from 'react-native';
import {
  check,
  openSettings,
  PERMISSIONS,
  request,
  RESULTS,
  type PermissionStatus,
} from 'react-native-permissions';
import { nativeAudioRecorder, type NativeRecordingStopResult } from './nativeAudioRecorder';

export type RecordingLifecycleState = 'idle' | 'starting' | 'recording' | 'paused' | 'stopping';

export interface RecordingSnapshot {
  state: RecordingLifecycleState;
  durationMs: number;
}

export interface CompletedRecording {
  filePath: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  fileSizeBytes: number;
}

export type RecordingPermissionResult = 'granted' | 'denied' | 'blocked' | 'unavailable';

export interface RecordingAdapter {
  getSnapshot(): RecordingSnapshot;
  subscribe(listener: (snapshot: RecordingSnapshot) => void): () => void;
  requestPermission(): Promise<RecordingPermissionResult>;
  openPermissionSettings(): Promise<void>;
  start(recordingId: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<CompletedRecording>;
  cancel(): Promise<void>;
}

const microphonePermission = () =>
  Platform.select({
    ios: PERMISSIONS.IOS.MICROPHONE,
    android: PERMISSIONS.ANDROID.RECORD_AUDIO,
  });

const normalizePermission = (status: PermissionStatus): RecordingPermissionResult => {
  switch (status) {
    case RESULTS.GRANTED:
    case RESULTS.LIMITED:
      return 'granted';
    case RESULTS.BLOCKED:
      return 'blocked';
    case RESULTS.UNAVAILABLE:
      return 'unavailable';
    default:
      return 'denied';
  }
};

const toCompletedRecording = (result: NativeRecordingStopResult): CompletedRecording => ({
  filePath: result.path,
  startedAt: new Date(result.startedAtMs).toISOString(),
  endedAt: new Date(result.endedAtMs).toISOString(),
  durationMs: result.durationMs,
  fileSizeBytes: result.fileSizeBytes,
});

class NativeRecordingAdapter implements RecordingAdapter {
  private snapshot: RecordingSnapshot = { state: 'idle', durationMs: 0 };
  private readonly listeners = new Set<(snapshot: RecordingSnapshot) => void>();
  private tick: ReturnType<typeof setInterval> | null = null;
  private runningStartedAt = 0;
  private accumulatedMs = 0;

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: RecordingSnapshot) => void) {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  async requestPermission(): Promise<RecordingPermissionResult> {
    const permission = microphonePermission();
    if (!permission) return 'unavailable';
    const current = await check(permission);
    if (current === RESULTS.GRANTED || current === RESULTS.LIMITED) return 'granted';
    if (current === RESULTS.BLOCKED || current === RESULTS.UNAVAILABLE) {
      return normalizePermission(current);
    }
    return normalizePermission(await request(permission));
  }

  openPermissionSettings() {
    return openSettings('application');
  }

  async start(recordingId: string) {
    if (this.snapshot.state !== 'idle') throw new Error('A recording is already active.');
    this.setSnapshot({ state: 'starting', durationMs: 0 });
    try {
      await nativeAudioRecorder.start(recordingId);
      this.accumulatedMs = 0;
      this.runningStartedAt = Date.now();
      this.setSnapshot({ state: 'recording', durationMs: 0 });
      this.startTicker();
    } catch (error) {
      this.reset();
      throw error;
    }
  }

  async pause() {
    if (this.snapshot.state !== 'recording') return;
    await nativeAudioRecorder.pause();
    this.accumulatedMs += Math.max(0, Date.now() - this.runningStartedAt);
    this.stopTicker();
    this.setSnapshot({ state: 'paused', durationMs: this.accumulatedMs });
  }

  async resume() {
    if (this.snapshot.state !== 'paused') return;
    await nativeAudioRecorder.resume();
    this.runningStartedAt = Date.now();
    this.setSnapshot({ state: 'recording', durationMs: this.accumulatedMs });
    this.startTicker();
  }

  async stop() {
    if (this.snapshot.state !== 'recording' && this.snapshot.state !== 'paused') {
      throw new Error('There is no active recording to stop.');
    }
    this.stopTicker();
    this.setSnapshot({ ...this.snapshot, state: 'stopping' });
    try {
      const result = await nativeAudioRecorder.stop();
      return toCompletedRecording(result);
    } finally {
      this.reset();
    }
  }

  async cancel() {
    if (this.snapshot.state === 'idle') return;
    this.stopTicker();
    try {
      await nativeAudioRecorder.cancel();
    } finally {
      this.reset();
    }
  }

  private startTicker() {
    this.stopTicker();
    this.tick = setInterval(() => {
      if (this.snapshot.state !== 'recording') return;
      const durationMs = this.accumulatedMs + Math.max(0, Date.now() - this.runningStartedAt);
      this.setSnapshot({ state: 'recording', durationMs });
    }, 500);
  }

  private stopTicker() {
    if (this.tick) clearInterval(this.tick);
    this.tick = null;
  }

  private reset() {
    this.stopTicker();
    this.accumulatedMs = 0;
    this.runningStartedAt = 0;
    this.setSnapshot({ state: 'idle', durationMs: 0 });
  }

  private setSnapshot(snapshot: RecordingSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export const recordingAdapter: RecordingAdapter = new NativeRecordingAdapter();
