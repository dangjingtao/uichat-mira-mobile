import {
  ToolApprovalRequiredError,
  type ToolCallRequest,
} from './toolGatewayClient';
import { RemoteToolGatewayClient } from './remoteToolGatewayClient';

const tool = {
  id: 'mcp:server-1:tool:search',
  name: 'mcp_server_1_tool_search_a1b2c3d4e5',
  description: 'Search',
  parameters: { type: 'object' },
  destructive: false,
  requiresApproval: false,
};

const request: ToolCallRequest = {
  callId: 'call-1',
  name: tool.name,
  arguments: '{"query":"mira"}',
};

const host = () => ({
  listRemoteTools: jest.fn(async () => [tool]),
  openToolInvocation: jest.fn(),
  resolveToolApproval: jest.fn(),
  cancelToolInvocation: jest.fn(async (invocationId: string) => ({
    invocationId,
    accepted: true,
    status: 'cancelling',
  })),
});

describe('RemoteToolGatewayClient', () => {
  it('maps model-safe aliases back to canonical Host tool ids', async () => {
    const remote = host();
    remote.openToolInvocation.mockResolvedValue({
      abort: jest.fn(),
      events: (async function* () {
        yield {
          type: 'tool:start' as const,
          invocationId: 'inv-1',
          toolId: tool.id,
        };
        yield {
          type: 'tool:complete' as const,
          invocation: {
            invocationId: 'inv-1',
            toolId: tool.id,
            status: 'completed' as const,
            content: 'result',
          },
        };
      })(),
    });
    const client = new RemoteToolGatewayClient(remote as never);

    await expect(client.callTool(request)).resolves.toEqual({
      content: 'result',
    });
    expect(remote.openToolInvocation).toHaveBeenCalledWith({
      toolId: tool.id,
      args: { query: 'mira' },
    });
  });

  it('turns Host approval requirements into a typed protocol-neutral pause', async () => {
    const remote = host();
    remote.openToolInvocation.mockResolvedValue({
      abort: jest.fn(),
      events: (async function* () {
        yield {
          type: 'tool:approval_required' as const,
          invocationId: 'inv-approval',
          message: 'Approval required',
          scope: 'terminal',
        };
        yield {
          type: 'tool:complete' as const,
          invocation: {
            invocationId: 'inv-approval',
            toolId: tool.id,
            status: 'awaiting_approval' as const,
            approval: {
              message: 'Approval required',
              scope: 'terminal',
            },
          },
        };
      })(),
    });
    const client = new RemoteToolGatewayClient(remote as never);

    await expect(client.callTool(request)).rejects.toMatchObject({
      name: 'ToolApprovalRequiredError',
      approval: {
        invocationId: 'inv-approval',
        callId: 'call-1',
        name: tool.name,
        arguments: request.arguments,
        message: 'Approval required',
        scope: 'terminal',
      },
    });
  });

  it('resolves the same frozen tool call after mobile approval', async () => {
    const remote = host();
    remote.resolveToolApproval.mockResolvedValue({
      invocationId: 'inv-resumed',
      toolId: tool.id,
      status: 'completed',
      content: 'approved result',
    });
    const client = new RemoteToolGatewayClient(remote as never);
    await client.listTools();

    const approvalError = new ToolApprovalRequiredError({
      invocationId: 'inv-original',
      callId: request.callId,
      name: request.name,
      arguments: request.arguments,
      message: 'Approval required',
    });

    await expect(
      client.resolveApproval(
        approvalError.approval,
        'approved',
      ),
    ).resolves.toEqual({
      status: 'completed',
      result: { content: 'approved result' },
    });
    expect(remote.resolveToolApproval).toHaveBeenCalledWith({
      invocationId: 'inv-original',
      decision: 'approved',
      toolId: tool.id,
      args: { query: 'mira' },
      signal: undefined,
    });
  });

  it('cancels the real remote invocation when the caller aborts', async () => {
    const remote = host();
    let release: (() => void) | null = null;
    const abort = jest.fn(() => release?.());
    remote.openToolInvocation.mockResolvedValue({
      abort,
      events: (async function* () {
        yield {
          type: 'tool:start' as const,
          invocationId: 'inv-running',
          toolId: tool.id,
        };
        await new Promise<void>(resolve => {
          release = resolve;
        });
      })(),
    });
    const client = new RemoteToolGatewayClient(remote as never);
    const controller = new AbortController();

    const promise = client.callTool(request, { signal: controller.signal });
    await Promise.resolve();
    await Promise.resolve();
    controller.abort();

    await expect(promise).rejects.toMatchObject({
      code: 'TOOL_CANCELLED',
    });
    expect(abort).toHaveBeenCalled();
    expect(remote.cancelToolInvocation).toHaveBeenCalledWith('inv-running');
  });

  it('rejects non-object arguments before any remote invocation', async () => {
    const remote = host();
    const client = new RemoteToolGatewayClient(remote as never);
    await client.listTools();

    await expect(
      client.callTool({ ...request, arguments: '[]' }),
    ).rejects.toMatchObject({
      code: 'TOOL_ARGUMENTS_INVALID',
    });
    expect(remote.openToolInvocation).not.toHaveBeenCalled();
  });
});
