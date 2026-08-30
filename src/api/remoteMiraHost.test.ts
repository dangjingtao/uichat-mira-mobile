import type { RemoteJsonRequest } from './remoteHttp';
import { RemoteHostError } from './remoteHttp';
import { RemoteMiraHostClient, type PendingPairing } from './remoteMiraHost';
import type { PostSseRequest, PostSseSession } from './postSse';
import { MemoryDeviceCredentialStore } from '../security/deviceCredentialStore';
import type { RemoteRelayEndpoint } from '../protocol/remotePairingV1';

type JsonTransport = <T>(request: RemoteJsonRequest<T>) => Promise<T>;
type RelayJsonTransport = <T>(
  relay: RemoteRelayEndpoint,
  request: RemoteJsonRequest<T>,
) => Promise<T>;

const relay: RemoteRelayEndpoint = {
  endpoint: 'https://relay.tomz.io',
  relayId: 'relay_1234567890abcdef',
  token: 'r'.repeat(43),
};

const pending: PendingPairing = {
  descriptor: {
    version: 1,
    hostUrl: 'https://mira.example.ts.net',
    relay: null,
    challengeId: 'challenge-1',
    code: 'ABCD2345',
  },
  transport: 'direct',
  claimId: 'claim-1',
  pollToken: 'poll-token',
  expiresAt: '2026-08-02T00:05:00.000Z',
};

const pollPayload = {
  status: 'approved',
  expiresAt: pending.expiresAt,
  deviceId: 'device-1',
  scopes: ['threads:read'],
  credential: 'mira_device_device-1.secret',
};

const manifestPayload = {
  protocolVersion: 1,
  device: {
    id: 'device-1',
    name: 'Android phone',
    platform: 'android',
    scopes: ['threads:read'],
  },
  routes: {
    threads: ['GET /threads'],
    messages: [],
    agent: [],
    artifacts: [],
  },
  reconnect: {
    mode: 'canonical-state-replay',
    eventCursor: false,
  },
  serverTime: '2026-08-02T00:00:00.000Z',
};

const createdThreadPayload = {
  id: 'thread-new',
  title: '新对话',
  modelName: null,
  workspaceId: null,
  knowledgeBaseId: null,
  roleId: null,
  agentEnabled: false,
  status: 'active',
  createdAt: '2026-08-29T00:00:00.000Z',
  updatedAt: '2026-08-29T00:00:00.000Z',
  messageCount: 0,
};

const pairingDescriptor = {
  version: 1 as const,
  hostUrl: 'https://mira.example.ts.net',
  relay,
  challengeId: 'challenge-1',
  code: 'ABCD2345',
};

const claimPayload = {
  claimId: 'claim-1',
  pollToken: 'poll-token',
  status: 'claimed' as const,
  expiresAt: '2026-08-02T00:05:00.000Z',
};

describe('RemoteMiraHostClient pairing credential retention', () => {
  it('persists the one-time credential before manifest verification', async () => {
    const store = new MemoryDeviceCredentialStore();
    const transport = async <T>(request: RemoteJsonRequest<T>): Promise<T> => {
      if (request.path.endsWith('/poll')) {
        return request.parse(pollPayload);
      }
      expect((await store.load())?.credential).toBe(pollPayload.credential);
      return request.parse(manifestPayload);
    };
    const client = new RemoteMiraHostClient(store, transport);

    await client.pollPairing(pending);

    expect(await store.load()).toMatchObject({
      hostUrl: pending.descriptor.hostUrl,
      relay: null,
      credential: pollPayload.credential,
      deviceId: 'device-1',
      scopes: ['threads:read'],
    });
    await expect(client.getStoredHostUrl()).resolves.toBe(
      pending.descriptor.hostUrl,
    );
  });

  it('keeps the credential when manifest verification has a network failure', async () => {
    const store = new MemoryDeviceCredentialStore();
    const transport = async <T>(request: RemoteJsonRequest<T>): Promise<T> => {
      if (request.path.endsWith('/poll')) {
        return request.parse(pollPayload);
      }
      throw new RemoteHostError('NETWORK_ERROR', 'offline');
    };
    const client = new RemoteMiraHostClient(store, transport);

    await expect(client.pollPairing(pending)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
    expect(await store.load()).toMatchObject({
      credential: pollPayload.credential,
      deviceId: 'device-1',
    });
  });

  it('clears a credential explicitly rejected by the Host', async () => {
    const store = new MemoryDeviceCredentialStore();
    const transport = async <T>(request: RemoteJsonRequest<T>): Promise<T> => {
      if (request.path.endsWith('/poll')) {
        return request.parse(pollPayload);
      }
      throw new RemoteHostError('HTTP_403', 'revoked', 403);
    };
    const client = new RemoteMiraHostClient(store, transport);

    await expect(client.pollPairing(pending)).rejects.toMatchObject({
      status: 403,
    });
    await expect(store.load()).resolves.toBeNull();
  });
});

describe('RemoteMiraHostClient transport selection', () => {
  it('prefers Relay for pairing and reports the selected transport', async () => {
    const store = new MemoryDeviceCredentialStore();
    const directMock = jest.fn();
    const direct: JsonTransport = async request => {
      directMock(request);
      return request.parse({ status: 'ok' });
    };
    const relayJsonMock = jest.fn();
    const relayJson: RelayJsonTransport = async (endpoint, request) => {
      relayJsonMock(endpoint, request);
      return request.path === '/health'
        ? request.parse({ status: 'ok' })
        : request.parse(claimPayload);
    };
    const client = new RemoteMiraHostClient(store, direct, undefined, relayJson);

    await expect(
      client.claimPairing(pairingDescriptor, {
        name: 'Android phone',
        platform: 'android',
      }),
    ).resolves.toMatchObject({ ...claimPayload, transport: 'relay' });
    expect(directMock).not.toHaveBeenCalled();
    expect(relayJsonMock.mock.calls.map(call => call[1].path)).toEqual([
      '/health',
      '/remote/pairing/claim',
    ]);
    expect(relayJsonMock.mock.calls[1][1].body).toMatchObject({ transport: 'relay' });
  });

  it('falls back to Direct only when the Relay preflight fails', async () => {
    const store = new MemoryDeviceCredentialStore();
    const directMock = jest.fn();
    const direct: JsonTransport = async request => {
      directMock(request);
      return request.path === '/health'
        ? request.parse({ status: 'ok' })
        : request.parse(claimPayload);
    };
    const relayJsonMock = jest.fn();
    const relayJson: RelayJsonTransport = async (endpoint, request) => {
      relayJsonMock(endpoint, request);
      throw new RemoteHostError('RELAY_NETWORK_ERROR', 'relay unavailable');
    };
    const client = new RemoteMiraHostClient(store, direct, undefined, relayJson);

    await expect(
      client.claimPairing(pairingDescriptor, {
        name: 'Android phone',
        platform: 'android',
      }),
    ).resolves.toMatchObject({ ...claimPayload, transport: 'direct' });
    expect(relayJsonMock).toHaveBeenCalledTimes(1);
    expect(directMock.mock.calls.map(call => call[0].path)).toEqual([
      '/health',
      '/remote/pairing/claim',
    ]);
    expect(directMock.mock.calls[1][0].body).toMatchObject({ transport: 'direct' });
  });

  it('does not retry a dispatched Relay claim through Direct', async () => {
    const store = new MemoryDeviceCredentialStore();
    const directMock = jest.fn();
    const direct: JsonTransport = async request => {
      directMock(request);
      return request.parse(claimPayload);
    };
    const relayJsonMock = jest.fn();
    const relayJson: RelayJsonTransport = async (endpoint, request) => {
      relayJsonMock(endpoint, request);
      if (request.path === '/health') return request.parse({ status: 'ok' });
      throw new RemoteHostError('RELAY_DISCONNECTED', 'relay disconnected');
    };
    const client = new RemoteMiraHostClient(store, direct, undefined, relayJson);

    await expect(
      client.claimPairing(pairingDescriptor, {
        name: 'Android phone',
        platform: 'android',
      }),
    ).rejects.toMatchObject({ code: 'PAIRING_CLAIM_UNCERTAIN' });
    expect(relayJsonMock).toHaveBeenCalledTimes(2);
    expect(directMock).not.toHaveBeenCalled();
  });

  it('falls back from Direct network failure to Relay for idempotent JSON requests', async () => {
    const store = new MemoryDeviceCredentialStore();
    await store.save({
      hostUrl: 'https://mira.example.ts.net',
      relay,
      credential: 'mira_device_device-1.secret',
      deviceId: 'device-1',
      scopes: ['threads:read'],
      savedAt: '2026-08-02T00:00:00.000Z',
    });

    const directMock = jest.fn();
    const direct: JsonTransport = async _request => {
      directMock();
      throw new RemoteHostError('NETWORK_ERROR', 'tailnet unavailable');
    };
    const relayJsonMock = jest.fn();
    const relayJson: RelayJsonTransport = async (_relay, request) => {
      relayJsonMock(_relay, request);
      if (request.path === '/remote/v1/manifest') {
        return request.parse(manifestPayload);
      }
      return request.parse([]);
    };
    const client = new RemoteMiraHostClient(
      store,
      direct,
      undefined,
      relayJson,
    );

    await expect(client.restoreConnection()).resolves.toMatchObject({
      manifest: manifestPayload,
    });
    expect(directMock).toHaveBeenCalledTimes(1);
    expect(relayJsonMock).toHaveBeenCalledTimes(1);
  });

  it('selects a reachable transport before dispatching thread creation', async () => {
    const store = new MemoryDeviceCredentialStore();
    await store.save({
      hostUrl: 'https://mira.example.ts.net',
      relay,
      credential: 'mira_device_device-1.secret',
      deviceId: 'device-1',
      scopes: ['threads:read', 'messages:write'],
      savedAt: '2026-08-29T00:00:00.000Z',
    });

    const directMock = jest.fn();
    const direct: JsonTransport = async request => {
      directMock(request);
      throw new RemoteHostError('NETWORK_ERROR', 'tailnet unavailable');
    };
    const relayJsonMock = jest.fn();
    const relayJson: RelayJsonTransport = async (_relay, request) => {
      relayJsonMock(_relay, request);
      if (request.path === '/remote/v1/manifest') {
        return request.parse(manifestPayload);
      }
      return request.parse(createdThreadPayload);
    };
    const client = new RemoteMiraHostClient(
      store,
      direct,
      undefined,
      relayJson,
    );

    await expect(client.createThread()).resolves.toMatchObject({
      id: 'thread-new',
      title: '新对话',
    });
    expect(directMock).toHaveBeenCalledTimes(1);
    expect(relayJsonMock.mock.calls.map(call => call[1].path)).toEqual([
      '/remote/v1/manifest',
      '/threads',
    ]);
  });

  it('sends an object body when creating a thread without a title', async () => {
    const store = new MemoryDeviceCredentialStore();
    await store.save({
      hostUrl: 'https://mira.example.ts.net',
      relay: null,
      credential: 'mira_device_device-1.secret',
      deviceId: 'device-1',
      scopes: ['threads:read', 'messages:write'],
      savedAt: '2026-08-30T00:00:00.000Z',
    });

    const jsonMock = jest.fn();
    const json: JsonTransport = async request => {
      jsonMock(request);
      if (request.path === '/remote/v1/manifest') {
        return request.parse(manifestPayload);
      }
      return request.parse(createdThreadPayload);
    };
    const client = new RemoteMiraHostClient(store, json);

    await expect(client.createThread()).resolves.toMatchObject({
      id: 'thread-new',
    });

    const createRequest = jsonMock.mock.calls
      .map(call => call[0])
      .find(request => request.path === '/threads');
    expect(createRequest?.body).toEqual({});
  });

  it('does not replay an uncertain dispatched thread create through Relay', async () => {
    const store = new MemoryDeviceCredentialStore();
    await store.save({
      hostUrl: 'https://mira.example.ts.net',
      relay,
      credential: 'mira_device_device-1.secret',
      deviceId: 'device-1',
      scopes: ['threads:read', 'messages:write'],
      savedAt: '2026-08-29T00:00:00.000Z',
    });

    const directMock = jest.fn();
    const direct: JsonTransport = async request => {
      directMock(request);
      if (request.path === '/remote/v1/manifest') {
        return request.parse(manifestPayload);
      }
      throw new RemoteHostError('NETWORK_ERROR', 'response lost');
    };
    const relayJsonMock = jest.fn();
    const relayJson: RelayJsonTransport = async (_relay, request) => {
      relayJsonMock(_relay, request);
      return request.parse(createdThreadPayload);
    };
    const client = new RemoteMiraHostClient(
      store,
      direct,
      undefined,
      relayJson,
    );

    await expect(client.createThread()).rejects.toMatchObject({
      code: 'THREAD_CREATE_UNCERTAIN',
    });
    expect(directMock.mock.calls.map(call => call[0].path)).toEqual([
      '/remote/v1/manifest',
      '/threads',
    ]);
    expect(relayJsonMock).not.toHaveBeenCalled();
  });

  it('does not hide Host authorization errors behind Relay fallback', async () => {
    const store = new MemoryDeviceCredentialStore();
    await store.save({
      hostUrl: 'https://mira.example.ts.net',
      relay,
      credential: 'mira_device_device-1.secret',
      deviceId: 'device-1',
      scopes: ['threads:read'],
      savedAt: '2026-08-02T00:00:00.000Z',
    });

    const direct: JsonTransport = async _request => {
      throw new RemoteHostError('HTTP_403', 'revoked', 403);
    };
    const relayJsonMock = jest.fn();
    const relayJson: RelayJsonTransport = async (_relay, request) => {
      relayJsonMock(_relay, request);
      return request.parse(manifestPayload);
    };
    const client = new RemoteMiraHostClient(
      store,
      direct,
      undefined,
      relayJson,
    );

    await expect(client.restoreConnection()).rejects.toMatchObject({ status: 403 });
    expect(relayJsonMock).not.toHaveBeenCalled();
    await expect(store.load()).resolves.toBeNull();
  });
});

describe('RemoteMiraHostClient chat request', () => {
  it('forwards the supplied canonical history in the SSE request body', async () => {
    const store = new MemoryDeviceCredentialStore();
    await store.save({
      hostUrl: 'https://mira.example.ts.net',
      relay: null,
      credential: 'mira_device_device-1.secret',
      deviceId: 'device-1',
      scopes: ['threads:read', 'messages:read', 'messages:write'],
      savedAt: '2026-08-27T00:00:00.000Z',
    });

    const json: JsonTransport = async request => request.parse(manifestPayload);
    const sseMock = jest.fn();
    const sse = <T>(request: PostSseRequest<T>): PostSseSession<T> => {
      sseMock(request);
      return {
        abort: jest.fn(),
        events: (async function* () {})(),
      };
    };
    const client = new RemoteMiraHostClient(store, json, sse);
    await client.restoreConnection();

    await client.sendMessage({
      threadId: 'thread-1',
      messageId: 'user-new',
      content: 'continue',
      messages: [
        {
          id: 'user-old',
          role: 'user',
          parts: [{ type: 'text', text: 'remember this' }],
        },
        {
          id: 'assistant-old',
          role: 'assistant',
          parts: [{ type: 'text', text: 'I remember' }],
        },
        {
          id: 'user-new',
          role: 'user',
          parts: [{ type: 'text', text: 'continue' }],
        },
      ],
    });

    expect(sseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/proxy/chat/default',
        body: expect.objectContaining({
          id: 'thread-1',
          messageId: 'user-new',
          messages: [
            {
              id: 'user-old',
              role: 'user',
              parts: [{ type: 'text', text: 'remember this' }],
            },
            {
              id: 'assistant-old',
              role: 'assistant',
              parts: [{ type: 'text', text: 'I remember' }],
            },
            {
              id: 'user-new',
              role: 'user',
              parts: [{ type: 'text', text: 'continue' }],
            },
          ],
        }),
      }),
    );
  });
});
