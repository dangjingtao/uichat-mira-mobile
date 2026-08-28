import { parsePairingUriV1 } from './remotePairingV1';

describe('parsePairingUriV1', () => {
  it('keeps Direct and authenticated Relay endpoints from one pairing link', () => {
    const token = 't'.repeat(43);
    const parsed = parsePairingUriV1(
      `mira://pair?version=1&challenge=challenge-1&code=abcd2345&host=${encodeURIComponent(
        'https://desktop.example.ts.net',
      )}&relay=${encodeURIComponent('https://relay.tomz.io')}&relayId=relay_1234567890abcdef&relayToken=${token}`,
    );

    expect(parsed).toEqual({
      version: 1,
      hostUrl: 'https://desktop.example.ts.net',
      relay: {
        endpoint: 'https://relay.tomz.io',
        relayId: 'relay_1234567890abcdef',
        token,
      },
      relayHint: {
        endpoint: 'https://relay.tomz.io',
        relayId: 'relay_1234567890abcdef',
      },
      challengeId: 'challenge-1',
      code: 'ABCD2345',
    });
  });

  it('accepts the current Desktop relay hint without treating it as Relay access', () => {
    const parsed = parsePairingUriV1(
      `mira://pair?version=1&challenge=challenge-1&code=ABCD2345&host=${encodeURIComponent(
        'https://desktop.example.ts.net',
      )}&relay=${encodeURIComponent('https://relay.tomz.io')}&relayId=relay_1234567890abcdef`,
    );

    expect(parsed.hostUrl).toBe('https://desktop.example.ts.net');
    expect(parsed.relay).toBeNull();
    expect(parsed.relayHint).toEqual({
      endpoint: 'https://relay.tomz.io',
      relayId: 'relay_1234567890abcdef',
    });
  });

  it('accepts Relay-only pairing links only when transport access is present', () => {
    const token = 't'.repeat(43);
    const parsed = parsePairingUriV1(
      `mira://pair?version=1&challenge=challenge-1&code=ABCD2345&relay=https%3A%2F%2Frelay.tomz.io&relayId=relay_1234567890abcdef&relayToken=${token}`,
    );

    expect(parsed.hostUrl).toBeNull();
    expect(parsed.relay?.endpoint).toBe('https://relay.tomz.io');
  });

  it('does not pretend a Relay-only hint is reachable', () => {
    expect(() =>
      parsePairingUriV1(
        'mira://pair?version=1&challenge=challenge-1&code=ABCD2345&relay=https%3A%2F%2Frelay.tomz.io&relayId=relay_1234567890abcdef',
      ),
    ).toThrow('does not contain a reachable Mira endpoint');
  });

  it('rejects ordinary HTTP(S) URLs as pairing input', () => {
    expect(() =>
      parsePairingUriV1('https://desktop.example.ts.net/remote/pairing'),
    ).toThrow('Pairing link must start with mira://pair');
  });

  it('rejects Mira pairing links missing required request fields', () => {
    expect(() =>
      parsePairingUriV1(
        'mira://pair?version=1&host=https%3A%2F%2Fdesktop.example.ts.net',
      ),
    ).toThrow('Pairing link is missing challenge or code');
  });
});
