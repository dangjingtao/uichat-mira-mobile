// Reasoning models often leak <think> blocks into delta.content instead of a
// dedicated field. Strip them at the Provider boundary so RuntimeEvent keeps a
// single text-delta contract and no vendor-specific markup reaches the UI.
const OPEN_TAG = /^<think(?:ing)?>/iu;
const CLOSE_TAG = /^<\/think(?:ing)?>/iu;
const KNOWN_TAGS = ['<think>', '<thinking>', '</think>', '</thinking>'];

const isPartialTag = (value: string): boolean => {
  const lower = value.toLowerCase();
  return KNOWN_TAGS.some((tag) => tag.length > lower.length && tag.startsWith(lower));
};

export interface ThinkTagFilter {
  /** Feeds a raw content delta and returns the text safe to emit downstream. */
  push(chunk: string): string;
  /** Releases buffered text once the stream ends; discards unclosed blocks. */
  flush(): string;
}

export const createThinkTagFilter = (): ThinkTagFilter => {
  let buffer = '';
  let inside = false;
  let emittedContent = false;

  const emit = (parts: string[], text: string) => {
    if (!text) return;
    let output = text;
    if (!emittedContent) {
      output = output.replace(/^\s+/u, '');
      if (!output) return;
      emittedContent = true;
    }
    parts.push(output);
  };

  const drainOutside = (parts: string[]): boolean => {
    const marker = buffer.indexOf('<');
    if (marker === -1) {
      emit(parts, buffer);
      buffer = '';
      return false;
    }
    if (marker > 0) {
      emit(parts, buffer.slice(0, marker));
      buffer = buffer.slice(marker);
    }
    const open = OPEN_TAG.exec(buffer);
    if (open) {
      buffer = buffer.slice(open[0].length);
      inside = true;
      return true;
    }
    const close = CLOSE_TAG.exec(buffer);
    if (close) {
      buffer = buffer.slice(close[0].length);
      return true;
    }
    if (isPartialTag(buffer)) return false;
    emit(parts, '<');
    buffer = buffer.slice(1);
    return true;
  };

  const drainInside = (): boolean => {
    for (let index = 0; index < buffer.length; index += 1) {
      if (buffer[index] !== '<') continue;
      const rest = buffer.slice(index);
      const close = CLOSE_TAG.exec(rest);
      if (close) {
        buffer = rest.slice(close[0].length);
        inside = false;
        return true;
      }
      if (isPartialTag(rest)) {
        buffer = rest;
        return false;
      }
    }
    buffer = '';
    return false;
  };

  return {
    push(chunk: string): string {
      if (!chunk) return '';
      buffer += chunk;
      const parts: string[] = [];
      while (buffer.length > 0) {
        const progressed = inside ? drainInside() : drainOutside(parts);
        if (!progressed) break;
      }
      return parts.join('');
    },
    flush(): string {
      const parts: string[] = [];
      if (!inside) emit(parts, buffer);
      buffer = '';
      inside = false;
      return parts.join('');
    },
  };
};
