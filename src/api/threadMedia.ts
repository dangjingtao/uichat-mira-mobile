import { RemoteHostError } from './remoteHttp';

export interface ThreadMediaRequest {
  url: string;
  headers: Record<string, string>;
}

const DEFAULT_MAX_TEXT_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MS = 15_000;

const utf8ByteLength = (value: string): number => {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
};

const mapMediaReadError = (error: unknown, aborted: boolean): RemoteHostError => {
  if (error instanceof RemoteHostError) return error;
  if (aborted) {
    return new RemoteHostError(
      'MEDIA_READ_TIMEOUT',
      'Timed out while reading Mira Host attachment',
      undefined,
      error,
    );
  }
  return new RemoteHostError(
    'NETWORK_ERROR',
    error instanceof Error ? error.message : 'Unable to read Mira Host attachment',
    undefined,
    error,
  );
};

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
      throw mapMediaReadError(error, controller.signal.aborted);
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

    let body: string;
    try {
      body = await response.text();
    } catch (error) {
      throw mapMediaReadError(error, controller.signal.aborted);
    }

    if (utf8ByteLength(body) > maxBytes) {
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
