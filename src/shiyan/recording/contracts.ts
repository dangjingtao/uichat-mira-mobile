export type RecordingLocalStatus =
  | 'recording'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type LocalRecordingDraft = {
  id: string;
  filePath: string;
  startedAt: string;
  endedAt?: string;
  durationMs: number;
  sizeBytes?: number;
  status: RecordingLocalStatus;
};

export type RecordingStartResult = {
  id: string;
  filePath: string;
  startedAt: string;
};

export interface RecordingAdapter {
  requestPermission(): Promise<'granted' | 'denied' | 'blocked'>;
  start(): Promise<RecordingStartResult>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<LocalRecordingDraft>;
  cancel(): Promise<void>;
}

export interface RecordingDraftStore {
  listPending(): Promise<LocalRecordingDraft[]>;
  save(draft: LocalRecordingDraft): Promise<void>;
  remove(id: string): Promise<void>;
}
