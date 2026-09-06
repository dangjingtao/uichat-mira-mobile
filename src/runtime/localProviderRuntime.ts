import type { ChatMessage, Session } from '../types';
import { OpenAiCompatibleClient, type OpenAiCompatibleMessage } from '../provider/openAiCompatibleClient';
import { ProviderConfigStore, type LocalProviderConfig } from '../provider/providerConfigStore';
import { providerCredentialStore, type ProviderCredentialStore } from '../security/providerCredentialStore';
import { LocalSessionRepository } from '../local/localSessionRepository';
import type { ConversationRuntime, RuntimeEvent } from './conversationRuntime';
import { MobileAgentLoop } from './mobileAgentLoop';
import type { ToolGatewayClient } from '../tools/toolGatewayClient';

const createMessageId = () => `local-message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export interface LocalProviderRuntimeOptions {
  configStore?: ProviderConfigStore;
  credentialStore?: ProviderCredentialStore;
  sessionRepository?: LocalSessionRepository;
  clientFactory?: (config: LocalProviderConfig, apiKey: string) => OpenAiCompatibleClient;
  toolGateway?: ToolGatewayClient;
}

export class LocalProviderRuntime implements ConversationRuntime {
  readonly kind = 'local-provider' as const;
  readonly supportsAgent: boolean;
  private readonly configStore: ProviderConfigStore;
  private readonly credentialStore: ProviderCredentialStore;
  private readonly sessionRepository: LocalSessionRepository;
  private readonly clientFactory: (config: LocalProviderConfig, apiKey: string) => OpenAiCompatibleClient;
  private readonly toolGateway?: ToolGatewayClient;
  private activeClient: OpenAiCompatibleClient | null = null;
  private executionSuspended = false;

  constructor(options: LocalProviderRuntimeOptions = {}) {
    this.configStore = options.configStore ?? new ProviderConfigStore();
    this.credentialStore = options.credentialStore ?? providerCredentialStore;
    this.sessionRepository = options.sessionRepository ?? new LocalSessionRepository();
    this.clientFactory =
      options.clientFactory ?? ((config, apiKey) => new OpenAiCompatibleClient({ baseUrl: config.baseUrl, apiKey }));
    this.toolGateway = options.toolGateway;
    this.supportsAgent = Boolean(this.toolGateway);
  }

  async listSessions(): Promise<Session[]> {
    const configs = await this.configStore.load();
    const sessions = await Promise.all(
      configs.map(async (config) =>
        (await this.sessionRepository.list(config.id)).map((session) => ({
          ...session,
          providerName: config.name,
          providerModel: config.model,
        })),
      ),
    );
    return sessions.flat().sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  }

  async createSession(title?: string, providerId?: string): Promise<Session> {
    const configs = await this.configStore.load();
    const config = providerId ? configs.find((item) => item.id === providerId) : configs[0];
    if (!config) throw new Error('请先配置 Local Provider');
    return this.sessionRepository.create(config.id, title);
  }

  getMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.sessionRepository.getMessages(sessionId);
  }

  async sendMessage(
    sessionId: string,
    input: string,
    options?: { agentEnabled?: boolean; messageId?: string },
  ): Promise<AsyncIterable<RuntimeEvent>> {
    const sessions = await this.listSessions();
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) throw new Error('Local session was not found');
    const configs = await this.configStore.load();
    const providerId = await this.sessionRepository.getProviderId(sessionId);
    const config = configs.find((item) => item.id === providerId);
    if (!config) throw new Error('Local Provider configuration was not found');
    const apiKey = await this.credentialStore.load(config.id);
    if (!apiKey) throw new Error('Local Provider API key is not configured');

    const userMessage: ChatMessage = {
      id: options?.messageId?.trim() || createMessageId(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    const previous = await this.sessionRepository.getMessages(sessionId);
    const alreadyRecorded = previous.some((message) => message.id === userMessage.id);
    if (!alreadyRecorded) {
      await this.sessionRepository.appendMessages(sessionId, [userMessage]);
    }
    const client = this.clientFactory(config, apiKey);
    this.activeClient = client;
    const requestMessages = (alreadyRecorded ? previous : [...previous, userMessage]).map<OpenAiCompatibleMessage>(
      (message) => ({
        role: message.role,
        content: message.content,
      }),
    );
    const stream = options?.agentEnabled && this.toolGateway
      ? await new MobileAgentLoop(this.toolGateway).run(
          requestMessages,
          (messages, tools) => client.streamChat({ model: config.model, messages: [...messages], tools: [...tools] }),
          { shouldPause: () => this.executionSuspended },
        )
      : await client.streamChat({
      model: config.model,
      messages: requestMessages,
    });
    const repository = this.sessionRepository;
    const runtime = this;
    const assistantId = createMessageId();
    return (async function* () {
      let content = '';
      try {
        for await (const event of stream) {
          if (event.type === 'text-delta') content += event.delta;
          yield event;
        }
        if (content) {
          await repository.appendMessages(sessionId, [
            { id: assistantId, role: 'assistant', content, timestamp: new Date() },
          ]);
        }
      } finally {
        if (runtime.activeClient === client) runtime.activeClient = null;
      }
    })();
  }

  cancelActiveRun() {
    this.activeClient?.cancelActiveRun();
    this.activeClient = null;
  }

  setExecutionSuspended(suspended: boolean) {
    this.executionSuspended = suspended;
    if (suspended) this.activeClient?.cancelActiveRun();
  }

}
