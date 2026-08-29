import { readThreadMediaText } from './threadMedia';

const originalFetch = globalThis.fetch;

const responseLike = (
  options: {
    status?: number;
    contentLength?: string | null;
    text?: () => Promise<string>;
  } = {},
): Response => {
  const status = options.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-length'
          ? (options.contentLength ?? null)
          : null,
    } as Headers,
    text: options.text ?? (async () => ''),
  } as Response;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('readThreadMediaText', () => {
  test('reads protected text with the supplied authorization header', async () => {
    const fetchMock = jest.fn(async () =>
      responseLike({
        contentLength: '15',
        text: async () => 'hello from Mira',
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

  test('rejects oversized text from declared content length before previewing', async () => {
    globalThis.fetch = jest.fn(async () =>
      responseLike({ contentLength: '1001', text: async () => 'ignored' }),
    ) as typeof fetch;

    await expect(
      readThreadMediaText(
        { url: 'https://mira.example.test/media/1', headers: {} },
        { maxBytes: 1000 },
      ),
    ).rejects.toMatchObject({ code: 'MEDIA_PREVIEW_TOO_LARGE' });
  });

  test('enforces the fallback limit using UTF-8 bytes', async () => {
    globalThis.fetch = jest.fn(async () =>
      responseLike({ text: async () => '你你' }),
    ) as typeof fetch;

    await expect(
      readThreadMediaText(
        { url: 'https://mira.example.test/media/utf8', headers: {} },
        { maxBytes: 5 },
      ),
    ).rejects.toMatchObject({ code: 'MEDIA_PREVIEW_TOO_LARGE' });
  });

  test('maps an abort during response body consumption to MEDIA_READ_TIMEOUT', async () => {
    const fetchMock = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const signal = init?.signal;
      return responseLike({
        text: () =>
          new Promise<string>((_resolve, reject) => {
            signal?.addEventListener('abort', () => reject(new Error('aborted')),
              { once: true },
            );
          }),
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(
      readThreadMediaText(
        { url: 'https://mira.example.test/media/slow', headers: {} },
        { timeoutMs: 1 },
      ),
    ).rejects.toMatchObject({ code: 'MEDIA_READ_TIMEOUT' });
  });

  test('keeps HTTP failures as truthful RemoteHost errors', async () => {
    globalThis.fetch = jest.fn(async () => responseLike({ status: 404 })) as typeof fetch;

    await expect(
      readThreadMediaText({
        url: 'https://mira.example.test/media/missing',
        headers: { Authorization: 'Bearer device-secret' },
      }),
    ).rejects.toMatchObject({ code: 'HTTP_404', status: 404 });
  });
});
