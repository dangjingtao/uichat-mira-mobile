import {
  closeRelayConnections,
  openRelayPostSse,
  requestRelayJson,
} from './remoteRelay';
import type { RemoteRelayEndpoint } from '../protocol/remotePairingV1';

const relay: RemoteRelayEndpoint = {
  endpoint: 'https://relay.tomz.io',
  relayId: 'relay_1234567890abcdef',
  token: 'r'.repeat(43),
};

type SocketHandler = ((event?: any) => void) | null;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readyState = 0;
  sent: string[] = [];
  onopen: SocketHandler = null;
  onmessage: SocketHandler = null;
  onerror: SocketHandler = null;
  onclose: SocketHandler = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(_code?: number, reason?: string) {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.({ reason: reason ?? '' });
  }

  open() {
    this.readyState = 1;
    this.onopen?.({});
  }

  message(frame: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
}

const parseSent = (socket: FakeWebSocket) =>
  socket.sent.map(value => JSON.parse(value) as Record<string, unknown>);

const base64 = (value: string) => Buffer.from(value, 'utf8').toString('base64');

const connect = async (socket: FakeWebSocket) => {
  socket.open();
  expect(parseSent(socket)[0]).toEqual({
    version: 1,
    type: 'hello',
    role: 'client',
    relayId: relay.relayId,
    token: relay.token,
  });
  socket.message({
    version: 1,
    type: 'hello_ack',
    role: 'client',
    relayId: relay.relayId,
    protocolVersion: 1,
    hostConnected: true,
  });
  await Promise.resolve();
};

beforeEach(() => {
  closeRelayConnections();
  FakeWebSocket.instances = [];
  Object.defineProperty(globalThis, 'WebSocket', {
    configurable: true,
    writable: true,
    value: FakeWebSocket,
  });
});

afterEach(() => {
  closeRelayConnections();
});

describe('Mira Relay transport', () => {
  it('forwards authenticated JSON and unwraps the Host response', async () => {
    const request = requestRelayJson(relay, {
      hostUrl: relay.endpoint,
      path: '/remote/v1/manifest',
      credential: 'mira_device_device-1.secret',
      parse: value => value as { ok: boolean },
    });

    const socket = FakeWebSocket.instances[0];
    expect(socket.url).toBe(
      'wss://relay.tomz.io/v1/relay/relay_1234567890abcdef/socket',
    );
    await connect(socket);

    const requestFrame = parseSent(socket).find(frame => frame.type === 'request');
    expect(requestFrame).toMatchObject({
      method: 'GET',
      path: '/remote/v1/manifest',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer mira_device_device-1.secret',
      },
    });
    const requestId = String(requestFrame?.requestId);

    socket.message({
      version: 1,
      type: 'response',
      requestId,
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    socket.message({
      version: 1,
      type: 'chunk',
      requestId,
      encoding: 'base64',
      data: base64(
        JSON.stringify({
          success: true,
          data: { ok: true },
          timestamp: '2026-08-09T00:00:00.000Z',
        }),
      ),
    });
    socket.message({ version: 1, type: 'complete', requestId });

    await expect(request).resolves.toEqual({ ok: true });
  });

  it('decodes Relay chunks as the existing SSE stream contract', async () => {
    const session = openRelayPostSse(relay, {
      hostUrl: relay.endpoint,
      path: '/proxy/chat/default',
      credential: 'mira_device_device-1.secret',
      body: { id: 'thread-1', messageId: 'message-1' },
      parse: value => JSON.parse(value) as { type: string; delta: string },
    });

    const socket = FakeWebSocket.instances[0];
    await connect(socket);
    await Promise.resolve();

    const requestFrame = parseSent(socket).find(frame => frame.type === 'request');
    const requestId = String(requestFrame?.requestId);
    expect(requestFrame).toMatchObject({
      method: 'POST',
      path: '/proxy/chat/default',
    });

    const iterator = session.events[Symbol.asyncIterator]();
    const firstEvent = iterator.next();
    socket.message({
      version: 1,
      type: 'response',
      requestId,
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });
    socket.message({
      version: 1,
      type: 'chunk',
      requestId,
      encoding: 'base64',
      data: base64('data: {"type":"text-delta","delta":"你好"}\n\n'),
    });
    socket.message({ version: 1, type: 'complete', requestId });

    await expect(firstEvent).resolves.toEqual({
      value: { type: 'text-delta', delta: '你好' },
      done: false,
    });
    await expect(iterator.next()).resolves.toEqual({
      value: undefined,
      done: true,
    });
  });

  it('propagates stream cancellation to Desktop through Relay', async () => {
    const session = openRelayPostSse(relay, {
      hostUrl: relay.endpoint,
      path: '/proxy/chat/default',
      credential: 'mira_device_device-1.secret',
      body: { id: 'thread-1', messageId: 'message-1' },
      parse: value => value,
    });

    const socket = FakeWebSocket.instances[0];
    await connect(socket);
    await Promise.resolve();

    const requestFrame = parseSent(socket).find(frame => frame.type === 'request');
    const requestId = String(requestFrame?.requestId);
    const iterator = session.events[Symbol.asyncIterator]();
    const waiting = iterator.next();

    session.abort();

    expect(parseSent(socket)).toContainEqual({
      version: 1,
      type: 'cancel',
      requestId,
    });
    await expect(waiting).rejects.toMatchObject({
      code: 'REQUEST_ABORTED',
    });
  });
});
