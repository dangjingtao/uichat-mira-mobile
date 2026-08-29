import { MemoryLocalKeyValueStore } from '../storage/localKeyValueStore';
import { ShiyanSubmissionRepository } from './submissionRepository';

describe('ShiyanSubmissionRepository', () => {
  it('persists only recovery pointers and upload state', async () => {
    const repository = new ShiyanSubmissionRepository(new MemoryLocalKeyValueStore());
    await repository.save({
      localCaptureId: 'capture-1',
      taskId: 'task-1',
      assetId: 'asset-1',
      uploadState: 'task_created',
    });
    await repository.setUploadState('capture-1', 'uploaded');

    expect(await repository.get('capture-1')).toMatchObject({
      taskId: 'task-1',
      assetId: 'asset-1',
      uploadState: 'uploaded',
    });
    expect(await repository.findByTaskId('task-1')).toMatchObject({
      localCaptureId: 'capture-1',
    });
  });
});
