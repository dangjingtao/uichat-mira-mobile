import {
  localKeyValueStore,
  type LocalKeyValueStore,
} from '../storage/localKeyValueStore';

const STORAGE_KEY = 'mira.shiyan.submissions.v1';

export type ShiyanUploadState =
  | 'task_created'
  | 'uploading'
  | 'uploaded'
  | 'confirmed';

export interface ShiyanSubmissionPointer {
  localCaptureId: string;
  taskId: string;
  assetId: string;
  uploadState: ShiyanUploadState;
  updatedAt: string;
}

const isPointer = (value: unknown): value is ShiyanSubmissionPointer => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Partial<ShiyanSubmissionPointer>;
  return (
    typeof item.localCaptureId === 'string' &&
    typeof item.taskId === 'string' &&
    typeof item.assetId === 'string' &&
    typeof item.updatedAt === 'string' &&
    (item.uploadState === 'task_created' ||
      item.uploadState === 'uploading' ||
      item.uploadState === 'uploaded' ||
      item.uploadState === 'confirmed')
  );
};

export class ShiyanSubmissionRepository {
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly store: LocalKeyValueStore) {}

  async list(): Promise<ShiyanSubmissionPointer[]> {
    const items = await this.readAll();
    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(localCaptureId: string): Promise<ShiyanSubmissionPointer | null> {
    const items = await this.readAll();
    return items.find((item) => item.localCaptureId === localCaptureId) ?? null;
  }

  async findByTaskId(taskId: string): Promise<ShiyanSubmissionPointer | null> {
    const items = await this.readAll();
    return items.find((item) => item.taskId === taskId) ?? null;
  }

  async save(pointer: Omit<ShiyanSubmissionPointer, 'updatedAt'>): Promise<void> {
    const next: ShiyanSubmissionPointer = {
      ...pointer,
      updatedAt: new Date().toISOString(),
    };
    await this.mutate((items) => [
      next,
      ...items.filter((item) => item.localCaptureId !== next.localCaptureId),
    ]);
  }

  async setUploadState(localCaptureId: string, uploadState: ShiyanUploadState): Promise<void> {
    await this.mutate((items) =>
      items.map((item) =>
        item.localCaptureId === localCaptureId
          ? { ...item, uploadState, updatedAt: new Date().toISOString() }
          : item,
      ),
    );
  }

  private async readAll(): Promise<ShiyanSubmissionPointer[]> {
    const raw = await this.store.get(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isPointer) : [];
    } catch {
      return [];
    }
  }

  private mutate(transform: (items: ShiyanSubmissionPointer[]) => ShiyanSubmissionPointer[]) {
    const run = this.mutationQueue.then(async () => {
      const current = await this.readAll();
      await this.store.set(STORAGE_KEY, JSON.stringify(transform(current)));
    });
    this.mutationQueue = run.catch(() => undefined);
    return run;
  }
}

export const shiyanSubmissionRepository = new ShiyanSubmissionRepository(localKeyValueStore);
