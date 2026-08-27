import type { RemoteJsonRequest } from './remoteHttp';
import { RemoteHostError } from './remoteHttp';
import { WorkspaceApiClient } from './workspaceApi';
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

const workspacePayload = [
  {
    id: 'workspace-1',
    name: 'Mira Mobile',
    rootPath: '/Users/tomz/Mira',
    isDefault: false,
    status: 'active',
    createdAt: '2026-08-27T09:00:00.000Z',
    updatedAt: '2026-08-27T10:00:00.000Z',
  },
];

const pairedStore = async (withRelay = false) => {
  const store = new MemoryDeviceCredentialStore();
  await store.save({
    hostUrl: 'https://mira.example.ts.net',
    relay: withRelay ? relay : null,
    credential: 'mira_device_device-1.secret',
    deviceId: 'device-1',
    scopes: ['threads:read'],
    savedAt: '2026-08-27T00:00:00.000Z',
  });
  return store;
};

describe('WorkspaceApiClient', () => {
  it('reads the Desktop ChatWorkspace contract without exposing a derived model', async () => {
    const store = await pairedStore();
    const direct: JsonTransport = async request => request.parse(workspacePayload);
    const client = new WorkspaceApiClient(store, direct);

    await expect(client.listChatWorkspaces()).resolves.toEqual(workspacePayload);
  });

  it('does not clear the paired credential when project reading is forbidden', async () => {
    const store = await pairedStore();
    const direct: JsonTransport = async () => {
      throw new RemoteHostError('HTTP_403', 'forbidden', 403);
    };
    const client = new WorkspaceApiClient(store, direct);

    await expect(client.listChatWorkspaces()).rejects.toMatchObject({ status: 403 });
    await expect(store.load()).resolves.toMatchObject({
      credential: 'mira_device_device-1.secret',
      deviceId: 'device-1',
    });
  });

  it('falls back to Relay only for a Direct network failure', async () => {
    const store = await pairedStore(true);
    const direct: JsonTransport = async () => {
      throw new RemoteHostError('NETWORK_ERROR', 'offline');
    };
    const relayMock = jest.fn();
    const relayTransport: RelayJsonTransport = async (endpoint, request) => {
      relayMock(endpoint, request);
      return request.parse(workspacePayload);
    };
    const client = new WorkspaceApiClient(store, direct, relayTransport);

    await expect(client.listChatWorkspaces()).resolves.toEqual(workspacePayload);
    expect(relayMock).toHaveBeenCalledWith(
      relay,
      expect.objectContaining({ path: '/chat-workspaces' }),
    );
  });
});
