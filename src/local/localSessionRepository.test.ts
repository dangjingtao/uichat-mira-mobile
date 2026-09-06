import { MemoryLocalKeyValueStore } from '../storage/localKeyValueStore';
import { LocalSessionRepository } from './localSessionRepository';

describe('LocalSessionRepository', () => {
  it('stores provider ownership and appends canonical chat messages', async () => {
    const repository = new LocalSessionRepository(new MemoryLocalKeyValueStore());
    const session = await repository.create('provider-a', 'Local chat');

    await repository.appendMessages(session.id, [
      { id: 'user-1', role: 'user', content: 'hello', timestamp: new Date('2026-09-05T00:00:00Z') },
      { id: 'assistant-1', role: 'assistant', content: 'hi', timestamp: new Date('2026-09-05T00:00:01Z') },
    ]);

    await expect(repository.getProviderId(session.id)).resolves.toBe('provider-a');
    await expect(repository.getMessages(session.id)).resolves.toMatchObject([
      { id: 'user-1', role: 'user', content: 'hello' },
      { id: 'assistant-1', role: 'assistant', content: 'hi' },
    ]);
  });

  it('filters sessions by provider and rejects unknown sessions', async () => {
    const repository = new LocalSessionRepository(new MemoryLocalKeyValueStore());
    await repository.create('provider-a', 'A');
    await repository.create('provider-b', 'B');

    await expect(repository.list('provider-a')).resolves.toHaveLength(1);
    await expect(repository.getMessages('missing')).rejects.toThrow('not found');
  });

  it('does not append the same message id twice during a retry', async () => {
    const repository = new LocalSessionRepository(new MemoryLocalKeyValueStore());
    const session = await repository.create('provider-a', 'Retryable');
    const message = {
      id: 'retry-user-1',
      role: 'user' as const,
      content: 'hello',
      timestamp: new Date('2026-09-05T00:00:00Z'),
    };

    await repository.appendMessages(session.id, [message]);
    await repository.appendMessages(session.id, [message]);

    await expect(repository.getMessages(session.id)).resolves.toEqual([message]);
  });
});
