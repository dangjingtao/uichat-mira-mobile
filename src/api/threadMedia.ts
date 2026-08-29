import { RemoteHostError } from './remoteHttp';

export interface ThreadMediaRequest {
  url: string;
  headers: Record<string, string>;
}

const DEFAULT_MAX_TEXT_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MS = 15_000;

export async function readThreadMediaText(
  request: ThreadMediaRequest,
  options: { maxBytes?: number; timeoutMs?: number } = {},
): Promise<string> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_TEXT_BYTES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(request.url, {
        method: 'GET',
        headers: request.headers,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new RemoteHostError(
          'MEDIA_READ_TIMEOUT',
          'Timed out while reading Mira Host attachment',
          undefined,
          error,
        );
      }
      throw new RemoteHostError(
        'NETWORK_ERROR',
        error instanceof Error ? error.message : 'Unable to read Mira Host attachment',
        undefined,
        error,
      );
    }

    if (!response.ok) {
      throw new RemoteHostError(
        `HTTP_${response.status}`,
        `Mira Host attachment request failed with HTTP ${response.status}`,
        response.status,
      );
    }

    const declaredLength = Number(response.headers.get('content-length') ?? '0');
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new RemoteHostError(
        'MEDIA_PREVIEW_TOO_LARGE',
        'Text attachment is too large for in-app preview',
      );
    }

    const body = await response.text();
    if (body.length > maxBytes) {
      throw new RemoteHostError(
        'MEDIA_PREVIEW_TOO_LARGE',
        'Text attachment is too large for in-app preview',
      );
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}
