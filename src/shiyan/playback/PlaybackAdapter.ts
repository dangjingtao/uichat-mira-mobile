import {
  nativeAudioPlayer,
  type NativeAudioPlayerModule,
} from './nativeAudioPlayer';

export type PlaybackLifecycleState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'failed';

export interface PlaybackSnapshot {
  state: PlaybackLifecycleState;
  positionMs: number;
  durationMs: number;
  error: string | null;
}

export interface LocalAudioPlaybackAdapter {
  getSnapshot(): PlaybackSnapshot;
  subscribe(listener: (snapshot: PlaybackSnapshot) => void): () => void;
  load(filePath: string): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  dispose(): Promise<void>;
}

const POLL_INTERVAL_MS = 250;

const errorMessage = (error: unknown): string =>
  error instanceof Error && error.message
    ? error.message
    : '无法播放这条本地录音。';

const IDLE_SNAPSHOT: PlaybackSnapshot = {
  state: 'idle',
  positionMs: 0,
  durationMs: 0,
  error: null,
};

class NativePlaybackAdapter implements LocalAudioPlaybackAdapter {
  private snapshot: PlaybackSnapshot = IDLE_SNAPSHOT;
  private readonly listeners = new Set<(snapshot: PlaybackSnapshot) => void>();
  private poll: ReturnType<typeof setInterval> | null = null;
  private generation = 0;

  constructor(private readonly player: NativeAudioPlayerModule) {}

  getSnapshot(): PlaybackSnapshot {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: PlaybackSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  async load(filePath: string): Promise<void> {
    const generation = ++this.generation;
    this.stopPoll();
    this.setSnapshot({ state: 'loading', positionMs: 0, durationMs: 0, error: null });
    try {
      // The native layer releases any previously loaded player before
      // creating the new one, so switching files never leaves stale state.
      const { durationMs } = await this.player.playerLoad(filePath);
      if (generation !== this.generation) return;
      this.setSnapshot({ state: 'ready', positionMs: 0, durationMs, error: null });
    } catch (error) {
      if (generation !== this.generation) return;
      this.fail(error);
    }
  }

  async play(): Promise<void> {
    if (!this.canControl()) return;
    const generation = this.generation;
    try {
      if (this.snapshot.state === 'ended') {
        await this.player.playerSeekTo(0);
        if (generation !== this.generation) return;
        this.setSnapshot({ ...this.snapshot, state: 'playing', positionMs: 0 });
      } else {
        this.setSnapshot({ ...this.snapshot, state: 'playing' });
      }
      await this.player.playerPlay();
      if (generation !== this.generation) return;
      this.startPoll();
    } catch (error) {
      if (generation !== this.generation) return;
      this.fail(error);
    }
  }

  async pause(): Promise<void> {
    if (this.snapshot.state !== 'playing') return;
    const generation = this.generation;
    this.stopPoll();
    try {
      await this.player.playerPause();
      if (generation !== this.generation) return;
      const native = await this.player.playerGetState().catch(() => null);
      if (generation !== this.generation) return;
      this.setSnapshot({
        state: native?.ended ? 'ended' : 'paused',
        positionMs: native?.positionMs ?? this.snapshot.positionMs,
        durationMs: native?.durationMs || this.snapshot.durationMs,
        error: null,
      });
    } catch (error) {
      if (generation !== this.generation) return;
      this.fail(error);
    }
  }

  async seek(positionMs: number): Promise<void> {
    if (!this.canControl()) return;
    const generation = this.generation;
    const durationMs = this.snapshot.durationMs;
    const target = Math.round(Math.min(Math.max(positionMs, 0), durationMs));
    // Update the UI immediately; the poll keeps it honest afterwards.
    this.setSnapshot({ ...this.snapshot, positionMs: target });
    try {
      await this.player.playerSeekTo(target);
      if (generation !== this.generation) return;
      if (this.snapshot.state === 'ended' && target < durationMs) {
        this.setSnapshot({ ...this.snapshot, state: 'paused', positionMs: target });
      }
    } catch (error) {
      if (generation !== this.generation) return;
      this.fail(error);
    }
  }

  async dispose(): Promise<void> {
    this.generation += 1;
    this.stopPoll();
    this.setSnapshot(IDLE_SNAPSHOT);
    try {
      await this.player.playerRelease();
    } catch {
      // Releasing is best-effort; the snapshot is already back to idle.
    }
  }

  private canControl(): boolean {
    return (
      this.snapshot.state === 'ready' ||
      this.snapshot.state === 'playing' ||
      this.snapshot.state === 'paused' ||
      this.snapshot.state === 'ended'
    );
  }

  private startPoll() {
    this.stopPoll();
    this.poll = setInterval(() => {
      void this.pollState();
    }, POLL_INTERVAL_MS);
  }

  private async pollState(): Promise<void> {
    if (this.snapshot.state !== 'playing') {
      this.stopPoll();
      return;
    }
    const generation = this.generation;
    try {
      const native = await this.player.playerGetState();
      if (generation !== this.generation) return;
      this.setSnapshot({
        state: native.ended ? 'ended' : native.playing ? 'playing' : 'paused',
        positionMs: native.positionMs,
        durationMs: native.durationMs || this.snapshot.durationMs,
        error: null,
      });
      if (!native.playing) this.stopPoll();
    } catch {
      // A single failed poll is treated as transient; the next tick retries.
    }
  }

  private stopPoll() {
    if (this.poll) clearInterval(this.poll);
    this.poll = null;
  }

  private fail(error: unknown) {
    this.stopPoll();
    this.setSnapshot({ ...this.snapshot, state: 'failed', error: errorMessage(error) });
  }

  private setSnapshot(snapshot: PlaybackSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export const createPlaybackAdapter = (
  player: NativeAudioPlayerModule,
): LocalAudioPlaybackAdapter => new NativePlaybackAdapter(player);

export const playbackAdapter: LocalAudioPlaybackAdapter =
  createPlaybackAdapter(nativeAudioPlayer);
