import type { RemoteRelayEndpoint } from '../protocol/remotePairingV1';
import {
  deviceCredentialStore,
  type DeviceCredentialStore,
} from '../security/deviceCredentialStore';
import {
  RemoteHostError,
  requestRemoteJson,
  type RemoteJsonRequest,
} from './remoteHttp';
import { requestRelayJson } from './remoteRelay';

export interface ChatWorkspace {
  id: string;
  name: string;
  rootPath: string | null;
  isDefault: boolean;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

type JsonTransport = <T>(request: RemoteJsonRequest<T>) => Promise<T>;
type RelayJsonTransport = <T>(
  relay: RemoteRelayEndpoint,
  request: RemoteJsonRequest<T>,
) => Promise<T>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requiredString = (
  record: Record<string, unknown>,
  key: string,
  context: string,
): string => {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${context}.${key} must be a non-empty string`);
  }
  return value;
};

export const parseChatWorkspace = (value: unknown): ChatWorkspace => {
  if (!isRecord(value)) {
    throw new Error('workspace must be an object');
  }

  if (typeof value.isDefault !== 'boolean') {
    throw new Error('workspace.isDefault must be a boolean');
  }

  const status = requiredString(value, 'status', 'workspace');
  if (status !== 'active' && status !== 'archived') {
    throw new Error(`workspace.status is not supported: ${status}`);
  }

  return {
    id: requiredString(value, 'id', 'workspace'),
    name: requiredString(value, 'name', 'workspace'),
    rootPath: typeof value.rootPath === 'string' ? value.rootPath : null,
    isDefault: value.isDefault,
    status,
    createdAt: requiredString(value, 'createdAt', 'workspace'),
    updatedAt: requiredString(value, 'updatedAt', 'workspace'),
  };
};

const parseWorkspaceList = (value: unknown): ChatWorkspace[] => {
  if (!Array.isArray(value)) {
    throw new Error('workspaces must be an array');
  }
  return value.map(parseChatWorkspace);
};

const isDirectNetworkError = (error: unknown) =>
  error instanceof RemoteHostError && error.code === 'NETWORK_ERROR';

/**
 * Read-only Mobile mirror of the Desktop ChatWorkspace contract.
 *
 * This client intentionally owns only transport. The product definition comes
 * from Mira Desktop's existing ChatWorkspace model and `/chat-workspaces` API.
 * A 401/403 here is surfaced to the project screen and never clears the paired
 * device credential; opening the project list must not silently unpair Mobile.
 */
export class WorkspaceApiClient {
  constructor(
    private readonly credentialStore: DeviceCredentialStore = deviceCredentialStore,
    private readonly directTransport: JsonTransport = requestRemoteJson,
    private readonly relayTransport: RelayJsonTransport = requestRelayJson,
  ) {}

  async listChatWorkspaces(): Promise<ChatWorkspace[]> {
    const credential = await this.credentialStore.load();
    if (!credential) {
      throw new RemoteHostError(
        'PAIRING_REQUIRED',
        'This mobile device is not paired with Mira Desktop',
      );
    }

    const makeRequest = (hostUrl: string, allowInsecureDevelopment: boolean) => ({
      hostUrl,
      path: '/chat-workspaces',
      credential: credential.credential,
      allowInsecureDevelopment,
      parse: parseWorkspaceList,
    });

    if (credential.hostUrl) {
      try {
        return await this.directTransport(
          makeRequest(credential.hostUrl, __DEV__),
        );
      } catch (error) {
        if (!credential.relay || !isDirectNetworkError(error)) {
          throw error;
        }
      }
    }

    if (credential.relay) {
      return this.relayTransport(
        credential.relay,
        makeRequest(credential.relay.endpoint, false),
      );
    }

    throw new RemoteHostError(
      'REMOTE_ENDPOINT_UNAVAILABLE',
      'No Mira Desktop endpoint is available for reading projects',
    );
  }
}

export const workspaceApi = new WorkspaceApiClient();
