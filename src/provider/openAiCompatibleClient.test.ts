import type { RuntimeEvent } from '../runtime/conversationRuntime';
import { OpenAiCompatibleClient } from './openAiCompatibleClient';

class FakeXhr {
  status = 200;
  responseText = '';
  timeout = 0;
  onprogress: (() => void) | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  requestBody: string | null = null;
  aborted = false;
  readonly headers: Record<string, string> = {};

  open() {}
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: string) {
    this.requestBody = body;
    this.responseText =
      'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n' +
      'data: {"choices":[{"delta":{"tool_calls":[{"id":"call-1","function":{"name":"search","arguments":"{}"}}]}}]}\n\n' +
      'data: [DONE]\n\n';
    this.onprogress?.();
    this.onload?.();
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
}

class HangingXhr extends FakeXhr {
  send(body: string) {
    this.requestBody = body;
  }
}

const collect = async (stream: AsyncIterable<RuntimeEvent>) => {
  const events: RuntimeEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
};

describe('OpenAiCompatibleClient', () => {
  it('normalizes streamed text and tool call events', async () => {
    const xhr = new FakeXhr();
    const client = new OpenAiCompatibleClient({
      baseUrl: 'https://provider.example.com/',
      apiKey: 'secret',
      xhrFactory: () => xhr as unknown as XMLHttpRequest,
    });

    const stream = await client.streamChat({
      model: 'model-1',
      messages: [{ role: 'user', content: 'hello' }],
    });
    await expect(collect(stream)).resolves.toEqual([
      { type: 'text-delta', delta: 'hello' },
      { type: 'tool-call', callId: 'call-1', name: 'search', arguments: '{}' },
      { type: 'finish', reason: null },
    ]);
    expect(JSON.parse(xhr.requestBody ?? '{}')).toMatchObject({ model: 'model-1', stream: true });
    expect(xhr.headers.Authorization).toBe('Bearer secret');
  });

  it('rejects insecure URLs outside development through the shared URL policy', () => {
    if (__DEV__) return;
    expect(
      () => new OpenAiCompatibleClient({ baseUrl: 'http://provider.example.com', apiKey: 'secret' }),
    ).toThrow('HTTPS');
  });

  it('reports an explicit cancellation when the active request is cancelled', async () => {
    const xhr = new HangingXhr();
    const client = new OpenAiCompatibleClient({
      baseUrl: 'https://provider.example.com',
      apiKey: 'secret',
      xhrFactory: () => xhr as unknown as XMLHttpRequest,
    });

    const stream = await client.streamChat({
      model: 'model-1',
      messages: [{ role: 'user', content: 'hello' }],
    });
    const pending = collect(stream);
    await Promise.resolve();
    client.cancelActiveRun();

    await pending.catch((error) => {
      expect(error).toMatchObject({ code: 'REQUEST_ABORTED' });
    });
  });

  it('reports a timeout separately from user cancellation', async () => {
    jest.useFakeTimers();
    try {
      const xhr = new HangingXhr();
      const client = new OpenAiCompatibleClient({
        baseUrl: 'https://provider.example.com',
        apiKey: 'secret',
        requestTimeoutMs: 1000,
        xhrFactory: () => xhr as unknown as XMLHttpRequest,
      });

      const stream = await client.streamChat({
        model: 'model-1',
        messages: [{ role: 'user', content: 'hello' }],
      });
      const pending = collect(stream).catch((error) => {
        expect(error).toMatchObject({ code: 'PROVIDER_TIMEOUT' });
      });
      await jest.advanceTimersByTimeAsync(1000);

      await pending;
    } finally {
      jest.useRealTimers();
    }
  });
});
