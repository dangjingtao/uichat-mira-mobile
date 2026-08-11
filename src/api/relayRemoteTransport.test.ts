import {
  RelayRemoteTransport,
  type RelaySocketLike,
} from './relayRemoteTransport';

const config = {
  endpoint: 'https://relay.example.com',
  relayId: 'relay_1234567890abcdef',
  clientToken: 'client-token-1234567890-1234567890-abcdef',
};

type TestEventMap = {
  open: undefined;
  message: { data: unknown };
  error: undefined;
  close: { code?: number; reason?: string };
};

class FakeRelaySocket implements RelaySocketLike {
  readyState = 0;
  readonly sent: string[] = [];
  readonly closeCalls: Array<{ code?: number; reason?: string }> = [];
  private readonly openListeners: Array<(event: undefined) => void> = [];
  private readonly messageListeners: Array<(event: { data: unknown }) => void> = [];
  private readonly errorListeners: Array<(event: undefined) => void> = [];
  private readonly closeListeners: Array<
    (event: { code?: number; reason?: string }) => void
  > = [];

  addEventListener<K extends keyof TestEventMap>(
    type: K,
    listener: (event: TestEventMap[K]) => void,
  ) {
    switch (type) {
      case 'open':
        this.openListeners.push(listener as (event: undefined) => void);
        break;
      case 'message':
        this.messageListeners.push(
          listener as (event: { data: unknown }) => void,
        );
        break;
      case 'error':
        this.errorListeners.push(listener as (event: undefined) => void);
        break;
      case 'close':
        this.closeListeners.push(
          listener as (event: { code?: number; reason?: string }) => void,
        );
        break;
    }
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(code?: number, reason?: string) {
    this.closeCalls.push({ code, reason });
    this.readyState = 3;
    this.closeListeners.forEach((listener) => listener({ code, reason }));
  }

  open() {
    this.readyState = 1;
    this.openListeners.forEach((listener) => listener(undefined));
  }

  message(frame: Record<string, unknown>) {
    const data = JSON.stringify({ version: 1, ...frame });
    this.messageListeners.forEach((listener) => listener({ data }));
  }

  error() {
    this.errorListeners.forEach((listener) => listener(undefined));
  }
}

const utf8Base64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return globalThis.btoa(binary);
};

const parseSent = (socket: FakeRelaySocket, index: number) =>
  JSON.parse(socket.sent[index]) as Record<string, unknown>;

const connect = async (socket: FakeRelaySocket) => {
  await Promise.resolve();
  socket.open();
  expect(parseSent(socket, 0)).toMatchObject({
    type: 'hello',
    role: 'client',
    relayId: config.relayId,
    token: config.clientToken,
  });
  socket.message({
    type: 'hello_ack',
    role: 'client',
    relayId: config.relayId,
    protocolVersion: 1,
    hostConnected: true,
  });
  await Promise.resolve();
};

describe('RelayRemoteTransport', () => {
  it('forwards a scoped JSON request and unwraps the Mira envelope', async () => {
    const socket = new FakeRelaySocket();
    const transport = new RelayRemoteTransport(config, () => socket);

    const resultPromise = transport.requestJson({
      hostUrl: 'https://unused.example',
      path: '/remote/v1/manifest',
      credential: 'mira_device_device-1.secret',
      parse: (value) => value as { protocolVersion: number },
    });

    await connect(socket);
    const request = parseSent(socket, 1);
    expect(request).toMatchObject({
      type: 'request',
      method: 'GET',
      path: '/remote/v1/manifest',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer mira_device_device-1.secret',
      },
    });

    const requestId = request.requestId as string;
    socket.message({ type: 'response', requestId, status: 200 });
    socket.message({
      type: 'chunk',
      requestId,
      encoding: 'base64',
      data: utf8Base64(
        JSON.stringify({ success: true, data: { protocolVersion: 1 } }),
      ),
    });
    socket.message({ type: 'complete', requestId });

    await expect(resultPromise).resolves.toEqual({ protocolVersion: 1 });
  });

  it('reconstructs SSE frames from Relay chunks', async () => {
    const socket = new FakeRelaySocket();
    const transport = new RelayRemoteTransport(config, () => socket);
    const session = transport.openPostSse({
      hostUrl: 'https://unused.example',
      path: '/proxy/chat/default',
      credential: 'mira_device_device-1.secret',
      body: { id: 'thread-1' },
      parse: (value) => value as { type: string; delta?: string },
    });
    const iterator = session.events[Symbol.asyncIterator]();
    const nextEvent = iterator.next();

    await connect(socket);
    const request = parseSent(socket, 1);
    const requestId = request.requestId as string;
    expect(request).toMatchObject({
      type: 'request',
      method: 'POST',
      path: '/proxy/chat/default',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        Authorization: 'Bearer mira_device_device-1.secret',
      },
    });

    socket.message({ type: 'response', requestId, status: 200 });
    socket.message({
      type: 'chunk',
      requestId,
      encoding: 'base64',
      data: utf8Base64(
        'data: {"type":"text-delta","id":"text-1","delta":"你好"}\n\n',
      ),
    });

    await expect(nextEvent).resolves.toEqual({
      value: { type: 'text-delta', id: 'text-1', delta: '你好' },
      done: false,
    });

    socket.message({ type: 'complete', requestId });
    await expect(iterator.next()).resolves.toEqual({ value: undefined, done: true });
  });

  it('sends cancel when an active Relay request is aborted', async () => {
    const socket = new FakeRelaySocket();
    const transport = new RelayRemoteTransport(config, () => socket);
    const controller = new AbortController();

    const resultPromise = transport.requestJson({
      hostUrl: 'https://unused.example',
      path: '/threads',
      credential: 'mira_device_device-1.secret',
      signal: controller.signal,
      parse: (value) => value,
    });

    await connect(socket);
    const request = parseSent(socket, 1);
    const requestId = request.requestId as string;
    controller.abort();

    await expect(resultPromise).rejects.toMatchObject({ code: 'REQUEST_ABORTED' });
    expect(parseSent(socket, 2)).toMatchObject({ type: 'cancel', requestId });
  });

  it('rejects the connection when the Desktop host is offline', async () => {
    const socket = new FakeRelaySocket();
    const transport = new RelayRemoteTransport(config, () => socket);

    const resultPromise = transport.requestJson({
      hostUrl: 'https://unused.example',
      path: '/remote/v1/manifest',
      credential: 'mira_device_device-1.secret',
      parse: (value) => value,
    });

    await Promise.resolve();
    socket.open();
    socket.message({
      type: 'hello_ack',
      role: 'client',
      relayId: config.relayId,
      protocolVersion: 1,
      hostConnected: false,
    });

    await expect(resultPromise).rejects.toMatchObject({ code: 'HOST_OFFLINE' });
    expect(socket.closeCalls).toContainEqual({
      code: 1013,
      reason: 'Mira Desktop Relay host is offline',
    });
  });
});
