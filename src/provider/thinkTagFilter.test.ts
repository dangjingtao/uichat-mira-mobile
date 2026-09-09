import { createThinkTagFilter } from './thinkTagFilter';

const run = (chunks: string[]): string => {
  const filter = createThinkTagFilter();
  return chunks.map((chunk) => filter.push(chunk)).join('') + filter.flush();
};

describe('createThinkTagFilter', () => {
  it('passes plain text through untouched', () => {
    expect(run(['hello ', 'world'])).toBe('hello world');
  });

  it('removes a complete think block delivered in one chunk', () => {
    expect(run(['<think>internal</think>answer'])).toBe('answer');
  });

  it('removes a think block split across SSE chunks', () => {
    expect(run(['<th', 'ink>secret rea', 'soning</thi', 'nk>final'])).toBe('final');
  });

  it('supports the <thinking> variant and is case insensitive', () => {
    expect(run(['<Thinking>hidden</THINKING>visible'])).toBe('visible');
  });

  it('drops leading whitespace left behind by a stripped block', () => {
    expect(run(['<think>x</think>', '\n\n', 'answer'])).toBe('answer');
  });

  it('keeps whitespace inside the visible answer', () => {
    expect(run(['<think>x</think>a', '\n\nb'])).toBe('a\n\nb');
  });

  it('discards an unclosed think block at end of stream', () => {
    expect(run(['<think>never closed'])).toBe('');
  });

  it('discards trailing content after an unclosed block opened mid stream', () => {
    expect(run(['answer ', '<think>tail'])).toBe('answer ');
  });

  it('strips a stray closing tag without an opener', () => {
    expect(run(['leaked</think>answer'])).toBe('leakedanswer');
  });

  it('removes multiple think blocks in one stream', () => {
    expect(run(['<think>a</think>one<think>b</think>two'])).toBe('onetwo');
  });

  it('preserves unrelated angle brackets and html-like text', () => {
    expect(run(['a < b and <div>x</div>'])).toBe('a < b and <div>x</div>');
  });

  it('preserves a lone trailing angle bracket on flush', () => {
    expect(run(['value <'])).toBe('value <');
  });

  it('preserves a partial tag prefix that never becomes a think tag', () => {
    expect(run(['<thi', 'ck>'])).toBe('<thick>');
  });

  it('does not emit buffered text before a tag is disambiguated', () => {
    const filter = createThinkTagFilter();
    expect(filter.push('ok<th')).toBe('ok');
    expect(filter.push('ink>hidden')).toBe('');
    expect(filter.push('</think>done')).toBe('done');
    expect(filter.flush()).toBe('');
  });

  it('handles one character at a time', () => {
    const source = '<think>reason</think>Hi there';
    expect(run(source.split(''))).toBe('Hi there');
  });

  it('ignores empty chunks', () => {
    expect(run(['', 'a', '', 'b'])).toBe('ab');
  });
});
