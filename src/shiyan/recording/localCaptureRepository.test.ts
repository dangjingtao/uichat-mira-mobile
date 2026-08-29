import { MemoryLocalKeyValueStore } from '../../storage/localKeyValueStore';
import {
  LocalCaptureRepository,
  type RecordingFileStore,
} from './localCaptureRepository';

class FakeRecordingFileStore implements RecordingFileStore {
  readonly files = new Map<string, number>();

  async fileInfo(path: string) {
    const size = this.files.get(path);
    return { exists: size != null, size: size ?? 0 };
  }

  async deleteFile(path: string) {
    this.files.delete(path);
  }
}

describe('LocalCaptureRepository', () => {
  it('recovers a completed local recording after repository recreation', async () => {
    const store = new MemoryLocalKeyValueStore();
    const files = new FakeRecordingFileStore();
    files.files.set('/private/shiyan/a.m4a', 2048);

    const first = new LocalCaptureRepository(store, files);
    await first.saveCompleted({
      id: 'a',
      sceneId: 'meeting',
      sceneName: '会议采集',
      recording: {
        filePath: '/private/shiyan/a.m4a',
        startedAt: '2026-08-29T01:00:00.000Z',
        endedAt: '2026-08-29T01:01:00.000Z',
        durationMs: 60000,
        fileSizeBytes: 2048,
      },
    });

    const afterRestart = new LocalCaptureRepository(store, files);
    await expect(afterRestart.listRecoverable()).resolves.toEqual([
      expect.objectContaining({
        id: 'a',
        status: 'pending_confirmation',
        fileSizeBytes: 2048,
      }),
    ]);
  });

  it('keeps title and scene confirmation local without creating a cloud task', async () => {
    const store = new MemoryLocalKeyValueStore();
    const files = new FakeRecordingFileStore();
    files.files.set('/private/shiyan/b.m4a', 4096);
    const repository = new LocalCaptureRepository(store, files);

    await repository.saveCompleted({
      id: 'b',
      sceneId: 'dictation',
      sceneName: '临时口述需求',
      recording: {
        filePath: '/private/shiyan/b.m4a',
        startedAt: '2026-08-29T02:00:00.000Z',
        endedAt: '2026-08-29T02:02:00.000Z',
        durationMs: 120000,
        fileSizeBytes: 4096,
      },
    });

    await repository.confirm({
      id: 'b',
      title: '  客户补充需求  ',
      sceneId: 'meeting',
      sceneName: '会议采集',
    });

    await expect(repository.get('b')).resolves.toEqual(
      expect.objectContaining({
        title: '客户补充需求',
        sceneId: 'meeting',
        status: 'ready_for_submission',
      }),
    );
  });

  it('deletes both local audio and metadata', async () => {
    const store = new MemoryLocalKeyValueStore();
    const files = new FakeRecordingFileStore();
    files.files.set('/private/shiyan/c.m4a', 1024);
    const repository = new LocalCaptureRepository(store, files);

    await repository.saveCompleted({
      id: 'c',
      sceneId: 'reflection',
      sceneName: '个人复盘 / 想法记录',
      recording: {
        filePath: '/private/shiyan/c.m4a',
        startedAt: '2026-08-29T03:00:00.000Z',
        endedAt: '2026-08-29T03:00:10.000Z',
        durationMs: 10000,
        fileSizeBytes: 1024,
      },
    });

    await repository.delete('c');

    expect(files.files.has('/private/shiyan/c.m4a')).toBe(false);
    await expect(repository.get('c')).resolves.toBeNull();
  });
});
