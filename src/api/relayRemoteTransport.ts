import { SseFrameDecoder, type PostSseRequest, type PostSseSession } from './postSse';
import { unwrapApiEnvelope } from '../protocol/remoteHostV1';
import { RemoteHostError, type RemoteJsonRequest } from './remoteHttp';

const RELAY_PROTOCOL_VERSION = 1;
const RELAY_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/u;
const TOKEN_MIN_LENGTH = 32;
const TOKEN_MAX_LENGTH = 512;
const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;

type RelayFrame = Record<string, unknown> & {
  version: number;
  type: string;
};

type RelaySocketEventMap = {
  open: undefined;
  message: { data: unknown };
  error: undefined;
  close: { code?: number; reason?: string };
};

export interface RelaySocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener<K extends keyof RelaySocketEventMap>(
    type: K,
    listener: (event: RelaySocketEventMap[K]) => void,
  ): void;
}

export type RelaySocketFactory = (url: string) => RelaySocketLike;

export interface RelayRemoteTransportConfig {
  endpoint: string;
  relayId: string;
  clientToken: string;
  connectTimeoutMs?: number;
}

interface RelayHttpResponse {
  status: number;
  body: Uint8Array;
}

interface PendingRequest {
  status: number | null;
  chunks: Uint8Array[];
  resolve: (value: RelayHttpResponse) => void;
  reject: (error: unknown) => void;
  onChunk?: (value: Uint8Array) => void;
  onResponse?: (status: number) => void;
  onComplete?: () => void;
}

class AsyncPushQueue<T> implements AsyncIterableIterator<T> {
  private readonly values: T[] = [];
  private readonly waiters: Array<{
    resolve: (result: IteratorResult<T>) => void;
    reject: (error: unknown) => void;
  }> = [];
  private closed = false;
  private failure: unknown = null;

  push(value: T) {
    if (this.closed || this.failure) return;
    const waiter = this.waiters.shift();
    if (waiter) waiter.resolve({ value, done: false });
    else this.values.push(value);
  }

  close() {
    if (this.closed || this.failure) return;
    this.closed = true;
    while (this.waiters.length > 0) {
      this.waiters.shift()?.resolve({ value: undefined, done: true });
    }
  }

  fail(error: unknown) {
    if (this.closed || this.failure) return;
    this.failure = error;
    this.values.length = 0;
    while (this.waiters.length > 0) this.waiters.shift()?.reject(error);
  }

  next(): Promise<IteratorResult<T>> {
    if (this.failure) return Promise.reject(this.failure);
    const value = this.values.shift();
    if (value !== undefined) return Promise.resolve({ value, done: false });
    if (this.closed) return Promise.resolve({ value: undefined, done: true });
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this;
  }
}

const defaultSocketFactory: RelaySocketFactory = (url) =>
  new WebSocket(url) as unknown as RelaySocketLike;

const normalizeEndpoint = (value: string) => {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new RemoteHostError('INVALID_RELAY_ENDPOINT', 'Mira Relay address is not a valid URL');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  ) {
    throw new RemoteHostError(
      'INVALID_RELAY_ENDPOINT',
      'Mira Relay address must be a root HTTPS URL',
    );
  }
  url.pathname = '/';
  return url.toString().replace(/\/$/u, '');
};

const normalizeRelayId = (value: string) => {
  const normalized = value.trim();
  if (!RELAY_ID_PATTERN.test(normalized)) {
    throw new RemoteHostError('INVALID_RELAY_ID', 'Mira Relay id is invalid');
  }
  return normalized;
};

const normalizeClientToken = (value: string) => {
  const normalized = value.trim();
  if (normalized.length < TOKEN_MIN_LENGTH || normalized.length > TOKEN_MAX_LENGTH) {
    throw new RemoteHostError('INVALID_RELAY_TOKEN', 'Mira Relay client token is invalid');
  }
  return normalized;
};

const buildSocketUrl = (endpoint: string, relayId: string) => {
  const url = new URL(endpoint);
  url.protocol = 'wss:';
  url.pathname = `/v1/relay/${encodeURIComponent(relayId)}/socket`;
  return url.toString();
};

const encodeUtf8Base64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return globalThis.btoa(binary);
};

const decodeBase64 = (value: string) => {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const concatBytes = (chunks: Uint8Array[]) => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
};

const parseJsonBody = (body: Uint8Array, status: number) => {
  const text = new TextDecoder().decode(body);
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RemoteHostError(
      'INVALID_JSON',
      'Mira Host returned invalid JSON through Relay',
      status,
      text.slice(0, 512),
    );
  }
};

const envelopeError = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.success !== false) return null;
  return {
    code:
      typeof record.code === 'string' || typeof record.code === 'number'
        ? String(record.code)
        : 'HOST_REQUEST_FAILED',
    message:
      typeof record.message === 'string' && record.message.trim()
        ? record.message
        : 'Mira Host request failed',
    details: record.errors,
  };
};

const requestHeaders = (credential: string | undefined, body: unknown, accept: string) => {
  const headers: Record<string, string> = { Accept: accept };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (credential) headers.Authorization = `Bearer ${credential}`;
  return headers;
};

const requestId = () =>
  `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export class RelayRemoteTransport {
  readonly endpoint: string;
  readonly relayId: string;
  private readonly clientToken: string;
  private readonly connectTimeoutMs: number;
  private socket: RelaySocketLike | null = null;
  private connected = false;
  private connectPromise: Promise<void> | null = null;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((error: unknown) => void) | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly pending = new Map<string, PendingRequest>();

  constructor(
    config: RelayRemoteTransportConfig,
    private readonly socketFactory: RelaySocketFactory = defaultSocketFactory,
  ) {
    this.endpoint = normalizeEndpoint(config.endpoint);
    this.relayId = normalizeRelayId(config.relayId);
    this.clientToken = normalizeClientToken(config.clientToken);
    this.connectTimeoutMs = config.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  }

  requestJson = async <T>(request: RemoteJsonRequest<T>): Promise<T> => {
    const response = await this.execute({
      method: request.method ?? 'GET',
      path: request.path,
      headers: requestHeaders(request.credential, request.body, 'application/json'),
      body: request.body,
      signal: request.signal,
    });
    const payload = parseJsonBody(response.body, response.status);
    if (response.status < 200 || response.status >= 300) {
      const error = envelopeError(payload);
      throw new RemoteHostError(
        error?.code ?? `HTTP_${response.status}`,
        error?.message ?? `Mira Host request failed with HTTP ${response.status}`,
        response.status,
        error?.details ?? payload,
      );
    }
    try {
      if (request.raw === true) return request.parse(payload);
      return unwrapApiEnvelope(payload, request.parse);
    } catch (error) {
      const value = error as Error & { code?: string | number; details?: unknown };
      throw new RemoteHostError(
        value.code === undefined ? 'INVALID_RESPONSE' : String(value.code),
        value.message,
        response.status,
        value.details,
      );
    }
  };

  openPostSse = <T>(request: PostSseRequest<T>): PostSseSession<T> => {
    const queue = new AsyncPushQueue<T>();
    const decoder = new SseFrameDecoder(request.parse);
    const textDecoder = new TextDecoder();
    const id = requestId();
    let status: number | null = null;
    let settled = false;
    const errorChunks: Uint8Array[] = [];

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      queue.fail(error);
    };
    const finish = () => {
      if (settled) return;
      try {
        decoder.finish().forEach((event) => queue.push(event));
        settled = true;
        queue.close();
      } catch (error) {
        fail(error);
      }
    };

    void this.startRequest(
      id,
      {
        method: 'POST',
        path: request.path,
        headers: requestHeaders(request.credential, request.body, 'text/event-stream'),
        body: request.body,
      },
      {
        onResponse: (nextStatus) => {
          status = nextStatus;
        },
        onChunk: (chunk) => {
          if (status !== null && (status < 200 || status >= 300)) {
            errorChunks.push(chunk);
            return;
          }
          try {
            decoder
              .feed(textDecoder.decode(chunk, { stream: true }))
              .forEach((event) => queue.push(event));
          } catch (error) {
            this.cancel(id);
            fail(error);
          }
        },
        onComplete: () => {
          if (status !== null && (status < 200 || status >= 300)) {
            const payload = parseJsonBody(concatBytes(errorChunks), status);
            const error = envelopeError(payload);
            fail(
              new RemoteHostError(
                error?.code ?? `HTTP_${status}`,
                error?.message ?? `Mira Host stream failed with HTTP ${status}`,
                status,
                error?.details ?? payload,
              ),
            );
            return;
          }
          finish();
        },
      },
    ).catch(fail);

    return {
      events: queue,
      abort: () => {
        if (settled) return;
        this.cancel(id);
        fail(new RemoteHostError('REQUEST_ABORTED', 'Mira Host stream was cancelled'));
      },
    };
  };

  close() {
    this.connected = false;
    if (this.connectPromise) {
      this.finishConnectFailure(
        new RemoteHostError('RELAY_CLOSED', 'Mira Relay transport was closed'),
      );
    }
    this.rejectAllPending(
      new RemoteHostError('RELAY_CLOSED', 'Mira Relay transport was closed'),
    );
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState === 1) socket.close(1000, 'Mira Relay transport closed');
  }

  private async execute(input: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: unknown;
    signal?: AbortSignal;
  }) {
    const id = requestId();
    const promise = this.startRequest(id, input);
    const onAbort = () => this.cancel(id);
    input.signal?.addEventListener('abort', onAbort, { once: true });
    if (input.signal?.aborted) onAbort();
    try {
      return await promise;
    } finally {
      input.signal?.removeEventListener('abort', onAbort);
    }
  }

  private async startRequest(
    id: string,
    input: {
      method: string;
      path: string;
      headers: Record<string, string>;
      body?: unknown;
    },
    callbacks: Pick<PendingRequest, 'onResponse' | 'onChunk' | 'onComplete'> = {},
  ): Promise<RelayHttpResponse> {
    await this.ensureConnected();
    const promise = new Promise<RelayHttpResponse>((resolve, reject) => {
      this.pending.set(id, {
        status: null,
        chunks: [],
        resolve,
        reject,
        ...callbacks,
      });
    });
    const frame: Record<string, unknown> = {
      version: RELAY_PROTOCOL_VERSION,
      type: 'request',
      requestId: id,
      method: input.method,
      path: input.path.startsWith('/') ? input.path : `/${input.path}`,
      headers: input.headers,
    };
    if (input.body !== undefined) {
      frame.bodyBase64 = encodeUtf8Base64(JSON.stringify(input.body));
    }
    try {
      this.send(frame);
    } catch (error) {
      this.pending.delete(id);
      throw error;
    }
    return promise;
  }

  private ensureConnected(): Promise<void> {
    if (this.socket?.readyState === 1 && this.connected) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;

    const promise = new Promise<void>((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;
    });
    this.connectPromise = promise;

    let socket: RelaySocketLike;
    try {
      socket = this.socketFactory(buildSocketUrl(this.endpoint, this.relayId));
    } catch (error) {
      this.finishConnectFailure(error);
      return promise;
    }
    this.socket = socket;

    socket.addEventListener('open', () => {
      if (this.socket !== socket) return;
      this.send({
        version: RELAY_PROTOCOL_VERSION,
        type: 'hello',
        role: 'client',
        relayId: this.relayId,
        token: this.clientToken,
      });
    });
    socket.addEventListener('message', (event) => {
      if (this.socket !== socket || typeof event.data !== 'string') return;
      this.handleMessage(event.data);
    });
    socket.addEventListener('error', () => {
      if (this.socket !== socket || !this.connectPromise) return;
      this.finishConnectFailure(
        new RemoteHostError('RELAY_SOCKET_ERROR', 'Mira Relay WebSocket connection failed'),
      );
    });
    socket.addEventListener('close', (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.connected = false;
      const reason = event.reason?.trim();
      const error = new RemoteHostError(
        'RELAY_DISCONNECTED',
        reason ? `Mira Relay disconnected: ${reason}` : 'Mira Relay disconnected',
      );
      if (this.connectPromise) this.finishConnectFailure(error);
      this.rejectAllPending(error);
    });

    this.connectTimer = setTimeout(() => {
      if (this.socket !== socket || !this.connectPromise) return;
      this.finishConnectFailure(
        new RemoteHostError('RELAY_CONNECT_TIMEOUT', 'Mira Relay handshake timed out'),
      );
      socket.close(1008, 'Mira Relay hello timeout');
    }, this.connectTimeoutMs);
    return promise;
  }

  private handleMessage(raw: string) {
    let frame: RelayFrame;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed) ||
        (parsed as Record<string, unknown>).version !== RELAY_PROTOCOL_VERSION ||
        typeof (parsed as Record<string, unknown>).type !== 'string'
      ) {
        throw new Error('invalid frame');
      }
      frame = parsed as RelayFrame;
    } catch {
      this.failConnection(
        new RemoteHostError('INVALID_RELAY_FRAME', 'Mira Relay returned an invalid frame'),
      );
      return;
    }

    if (frame.type === 'hello_ack') {
      if (
        frame.role !== 'client' ||
        frame.relayId !== this.relayId ||
        frame.protocolVersion !== RELAY_PROTOCOL_VERSION
      ) {
        this.failConnection(
          new RemoteHostError(
            'RELAY_IDENTITY_MISMATCH',
            'Mira Relay hello acknowledgement does not match this client',
          ),
        );
        return;
      }
      if (frame.hostConnected === false) {
        const error = new RemoteHostError('HOST_OFFLINE', 'Mira Desktop Relay host is offline');
        this.finishConnectFailure(error);
        this.socket?.close(1013, 'Mira Desktop Relay host is offline');
        return;
      }
      this.finishConnectSuccess();
      return;
    }

    if (frame.type === 'error' && frame.requestId === undefined) {
      this.failConnection(
        new RemoteHostError(
          typeof frame.code === 'string' ? frame.code : 'RELAY_ERROR',
          typeof frame.message === 'string' ? frame.message : 'Mira Relay request failed',
        ),
      );
      return;
    }

    const id = typeof frame.requestId === 'string' ? frame.requestId : null;
    if (!id) return;
    const pending = this.pending.get(id);
    if (!pending) return;

    if (frame.type === 'response') {
      if (typeof frame.status !== 'number') {
        pending.reject(
          new RemoteHostError('INVALID_RELAY_RESPONSE', 'Mira Relay response status is invalid'),
        );
        this.pending.delete(id);
        return;
      }
      pending.status = frame.status;
      pending.onResponse?.(frame.status);
      return;
    }

    if (frame.type === 'chunk') {
      if (frame.encoding !== 'base64' || typeof frame.data !== 'string') {
        pending.reject(new RemoteHostError('INVALID_RELAY_CHUNK', 'Mira Relay chunk is invalid'));
        this.pending.delete(id);
        return;
      }
      const chunk = decodeBase64(frame.data);
      pending.chunks.push(chunk);
      pending.onChunk?.(chunk);
      return;
    }

    if (frame.type === 'complete') {
      if (pending.status === null) {
        pending.reject(
          new RemoteHostError(
            'INVALID_RELAY_RESPONSE',
            'Mira Relay completed before returning an HTTP status',
          ),
        );
      } else {
        pending.onComplete?.();
        pending.resolve({ status: pending.status, body: concatBytes(pending.chunks) });
      }
      this.pending.delete(id);
      return;
    }

    if (frame.type === 'error') {
      pending.reject(
        new RemoteHostError(
          typeof frame.code === 'string' ? frame.code : 'RELAY_ERROR',
          typeof frame.message === 'string' ? frame.message : 'Mira Relay request failed',
          undefined,
          { retryable: frame.retryable === true },
        ),
      );
      this.pending.delete(id);
    }
  }

  private cancel(id: string) {
    if (!this.pending.has(id)) return;
    try {
      this.send({ version: RELAY_PROTOCOL_VERSION, type: 'cancel', requestId: id });
    } finally {
      this.pending.get(id)?.reject(
        new RemoteHostError('REQUEST_ABORTED', 'Mira Host request was cancelled'),
      );
      this.pending.delete(id);
    }
  }

  private send(frame: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== 1) {
      throw new RemoteHostError('RELAY_NOT_CONNECTED', 'Mira Relay is not connected');
    }
    this.socket.send(JSON.stringify(frame));
  }

  private finishConnectSuccess() {
    this.connected = true;
    const resolve = this.connectResolve;
    this.clearConnectState();
    resolve?.();
  }

  private finishConnectFailure(error: unknown) {
    this.connected = false;
    const reject = this.connectReject;
    this.clearConnectState();
    reject?.(error);
  }

  private clearConnectState() {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = null;
    this.connectPromise = null;
    this.connectResolve = null;
    this.connectReject = null;
  }

  private rejectAllPending(error: unknown) {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  private failConnection(error: unknown) {
    this.connected = false;
    if (this.connectPromise) this.finishConnectFailure(error);
    this.rejectAllPending(error);
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState === 1) socket.close(1002, 'Mira Relay protocol error');
  }
}
