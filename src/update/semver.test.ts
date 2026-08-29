import {
  compareSemver,
  formatSemver,
  parseSemver,
} from './semver';

describe('parseSemver', () => {
  it('parses valid semantic versions', () => {
    expect(parseSemver('0.2.9')).toEqual({ major: 0, minor: 2, patch: 9 });
    expect(parseSemver(' 1.10.0 ')).toEqual({ major: 1, minor: 10, patch: 0 });
  });

  it('rejects invalid versions', () => {
    expect(parseSemver('0.2')).toBeNull();
    expect(parseSemver('v0.2.9')).toBeNull();
    expect(parseSemver('0.2.9-dev')).toBeNull();
    expect(parseSemver('')).toBeNull();
    expect(parseSemver('0.2.x')).toBeNull();
  });
});

describe('compareSemver', () => {
  it('orders 0.2.9 before 0.2.10 numerically', () => {
    expect(compareSemver(parseSemver('0.2.9')!, parseSemver('0.2.10')!)).toBeLessThan(0);
    expect(compareSemver(parseSemver('0.2.10')!, parseSemver('0.2.9')!)).toBeGreaterThan(0);
  });

  it('treats equal versions as equal', () => {
    expect(compareSemver(parseSemver('0.2.9')!, parseSemver('0.2.9')!)).toBe(0);
  });

  it('compares major before minor before patch', () => {
    expect(compareSemver(parseSemver('1.0.0')!, parseSemver('0.99.99')!)).toBeGreaterThan(0);
    expect(compareSemver(parseSemver('0.10.0')!, parseSemver('0.9.99')!)).toBeGreaterThan(0);
  });

  it('formats back to the canonical string', () => {
    expect(formatSemver(parseSemver('0.2.10')!)).toBe('0.2.10');
  });
});
