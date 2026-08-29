import { readThreadMediaText } from './threadMedia';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('readThreadMediaText', () => {
  test('reads protected text with the supplied authorization header', async () => {
    const fetchMock = jest.fn(async () =>
      new Response('hello from Mira', {
        status: 200,
        headers: { 'content-length': '15' },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(
      readThreadMediaText({
        url: 'https://mira.example.test/threads/thread-1/media/media-1/content',
        headers: { Authorization: 'Bearer device-secret' },
      }),
    ).resolves.toBe('hello from Mira');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://mira.example.test/threads/thread-1/media/media-1/content',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer device-secret' },
      }),
    );
  });

  test('rejects oversized text before using it as preview content', async () => {
    globalThis.fetch = jest.fn(async () =>
      new Response('ignored', {
        status: 200,
        headers: { 'content-length': '1001' },
      }),
    ) as typeof fetch;

    await expect(
      readThreadMediaText(
        { url: 'https://mira.example.test/media/1', headers: {} },
        { maxBytes: 1000 },
      ),
    ).rejects.toMatchObject({ code: 'MEDIA_PREVIEW_TOO_LARGE' });
  });

  test('keeps HTTP failures as truthful RemoteHost errors', async () => {
    globalThis.fetch = jest.fn(async () => new Response('', { status: 404 })) as typeof fetch;

    await expect(
      readThreadMediaText({
        url: 'https://mira.example.test/media/missing',
        headers: { Authorization: 'Bearer device-secret' },
      }),
    ).rejects.toMatchObject({ code: 'HTTP_404', status: 404 });
  });
});
