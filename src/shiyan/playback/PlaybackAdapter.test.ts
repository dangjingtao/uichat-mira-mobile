import {
  createPlaybackAdapter,
  type LocalAudioPlaybackAdapter,
} from './PlaybackAdapter';
import type { NativeAudioPlayerModule, NativePlayerState } from './nativeAudioPlayer';

class FakeNativePlayer implements NativeAudioPlayerModule {
  loadedPath: string | null = null;
  releasedPaths: string[] = [];
  playCount = 0;
  durationMs = 60000;
  positionMs = 0;
  playing = false;
  ended = false;
  failOnLoad = false;
  failOnPlay = false;
  lastSeekMs: number | null = null;

  private advanceTimer: ReturnType<typeof setInterval> | null = null;

  async playerLoad(path: string) {
    if (this.failOnLoad) throw new Error('Unable to open the local recording');
    this.stopAdvancing();
    this.loadedPath = path;
    this.positionMs = 0;
    this.playing = false;
    this.ended = false;
    return { durationMs: this.durationMs };
  }

  async playerPlay() {
    if (this.failOnPlay) throw new Error('Playback failed');
    if (this.ended) {
      this.positionMs = 0;
      this.ended = false;
    }
    this.playing = true;
    this.playCount += 1;
    this.startAdvancing();
  }

  async playerPause() {
    this.playing = false;
    this.stopAdvancing();
  }

  async playerSeekTo(positionMs: number) {
    this.lastSeekMs = positionMs;
    this.positionMs = positionMs;
    if (positionMs >= this.durationMs) {
      this.playing = false;
      this.ended = true;
      this.stopAdvancing();
    } else if (this.ended) {
      this.ended = false;
      this.playing = false;
    }
  }

  async playerGetState(): Promise<NativePlayerState> {
    return {
      positionMs: this.positionMs,
      durationMs: this.durationMs,
      playing: this.playing,
      ended: this.ended,
    };
  }

  async playerRelease() {
    this.stopAdvancing();
    if (this.loadedPath) this.releasedPaths.push(this.loadedPath);
    this.loadedPath = null;
    this.positionMs = 0;
    this.playing = false;
    this.ended = false;
  }

  finishPlayback() {
    this.positionMs = this.durationMs;
    this.playing = false;
    this.ended = true;
    this.stopAdvancing();
  }

  private startAdvancing() {
    this.stopAdvancing();
    this.advanceTimer = setInterval(() => {
      this.positionMs = Math.min(this.positionMs + 250, this.durationMs);
      if (this.positionMs >= this.durationMs) this.finishPlayback();
    }, 250);
  }

  private stopAdvancing() {
    if (this.advanceTimer) clearInterval(this.advanceTimer);
    this.advanceTimer = null;
  }
}

// Fake timers also mock setImmediate, so drain pending promise chains with
// plain microtask ticks instead.
const flushMicrotasks = async () => {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
};

describe('LocalAudioPlaybackAdapter', () => {
  let native: FakeNativePlayer;
  let adapter: LocalAudioPlaybackAdapter;

  beforeEach(() => {
    jest.useFakeTimers();
    native = new FakeNativePlayer();
    adapter = createPlaybackAdapter(native);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads a local recording into a ready snapshot', async () => {
    await adapter.load('/private/shiyan/a.m4a');
    expect(adapter.getSnapshot()).toEqual({
      state: 'ready',
      positionMs: 0,
      durationMs: 60000,
      error: null,
    });
    expect(native.loadedPath).toBe('/private/shiyan/a.m4a');
  });

  it('plays, tracks progress and pauses at the current position', async () => {
    const snapshots: string[] = [];
    adapter.subscribe((snapshot) => snapshots.push(snapshot.state));
    await adapter.load('/private/shiyan/a.m4a');
    await adapter.play();
    expect(adapter.getSnapshot().state).toBe('playing');
    expect(native.playCount).toBe(1);

    jest.advanceTimersByTime(1000);
    await flushMicrotasks();
    expect(adapter.getSnapshot().state).toBe('playing');
    expect(adapter.getSnapshot().positionMs).toBe(1000);

    await adapter.pause();
    expect(adapter.getSnapshot().state).toBe('paused');
    expect(adapter.getSnapshot().positionMs).toBe(1000);

    const frozenAt = adapter.getSnapshot().positionMs;
    jest.advanceTimersByTime(2000);
    await flushMicrotasks();
    expect(adapter.getSnapshot().positionMs).toBe(frozenAt);
  });

  it('seeks to a clamped target position', async () => {
    await adapter.load('/private/shiyan/a.m4a');
    await adapter.play();
    await adapter.seek(30000);
    expect(native.lastSeekMs).toBe(30000);
    expect(adapter.getSnapshot().positionMs).toBe(30000);

    await adapter.seek(999999);
    expect(native.lastSeekMs).toBe(60000);

    await adapter.seek(-50);
    expect(native.lastSeekMs).toBe(0);
  });

  it('reports ended after playback completes and can play again from the start', async () => {
    await adapter.load('/private/shiyan/a.m4a');
    await adapter.play();
    native.finishPlayback();
    jest.advanceTimersByTime(250);
    await flushMicrotasks();
    expect(adapter.getSnapshot().state).toBe('ended');

    await adapter.play();
    expect(native.playCount).toBe(2);
    expect(adapter.getSnapshot().state).toBe('playing');
    expect(adapter.getSnapshot().positionMs).toBe(0);
  });

  it('disposes the native player and resets to idle', async () => {
    await adapter.load('/private/shiyan/a.m4a');
    await adapter.play();
    await adapter.dispose();
    expect(adapter.getSnapshot()).toEqual({
      state: 'idle',
      positionMs: 0,
      durationMs: 0,
      error: null,
    });
    expect(native.releasedPaths).toEqual(['/private/shiyan/a.m4a']);
    expect(native.playing).toBe(false);
  });

  it('keeps stale operations from a previous load from touching the new snapshot', async () => {
    await adapter.load('/private/shiyan/a.m4a');
    const secondLoad = adapter.load('/private/shiyan/b.m4a');
    await adapter.seek(5000);
    await secondLoad;
    expect(adapter.getSnapshot()).toEqual({
      state: 'ready',
      positionMs: 0,
      durationMs: 60000,
      error: null,
    });
    expect(native.loadedPath).toBe('/private/shiyan/b.m4a');
  });

  it('surfaces load failures without touching other state machines', async () => {
    native.failOnLoad = true;
    await adapter.load('/private/shiyan/missing.m4a');
    const snapshot = adapter.getSnapshot();
    expect(snapshot.state).toBe('failed');
    expect(snapshot.error).toContain('Unable to open the local recording');
    expect(native.releasedPaths).toEqual([]);
  });

  it('ignores control commands before a file is loaded', async () => {
    await adapter.play();
    await adapter.pause();
    await adapter.seek(1000);
    expect(adapter.getSnapshot().state).toBe('idle');
    expect(native.playCount).toBe(0);
    expect(native.lastSeekMs).toBeNull();
  });
});
