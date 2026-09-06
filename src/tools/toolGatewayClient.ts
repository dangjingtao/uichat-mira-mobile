export interface ToolManifest {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
  destructive?: boolean;
}

export interface ToolCallRequest {
  callId: string;
  name: string;
  arguments: string;
}

export interface ToolCallResult {
  content: string;
}

/**
 * Protocol-neutral boundary for approved remote tools. Concrete HTTP/MCP
 * transport is intentionally supplied by Mira once its contract is fixed.
 */
export interface ToolGatewayClient {
  listTools(): Promise<readonly ToolManifest[]>;
  callTool(
    request: ToolCallRequest,
    options?: { signal?: AbortSignal },
  ): Promise<ToolCallResult>;
}
