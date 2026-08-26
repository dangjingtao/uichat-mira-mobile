import { parseScannedPairingUri } from './parseScannedPairingUri';
import { parsePairingUriV1 } from '../protocol/remotePairingV1';

describe('parseScannedPairingUri', () => {
  it('accepts the canonical Relay-only pairing QR from Desktop', () => {
    const pairingUri =
      'mira://pair?challenge=challenge-1&code=ABCD2345&version=1&relay=https%3A%2F%2Frelay.tomz.io&relayId=relay_Dqko12345678901&relayToken=ccccccccccccccccccccccccccccccc1X_Msccccccc';

    const scanned = parseScannedPairingUri(`  ${pairingUri}\n`);

    expect(scanned).toBe(pairingUri);
    expect(parsePairingUriV1(scanned)).toMatchObject({
      version: 1,
      hostUrl: null,
      relay: {
        endpoint: 'https://relay.tomz.io',
        relayId: 'relay_Dqko12345678901',
        token: 'ccccccccccccccccccccccccccccccc1X_Msccccccc',
      },
      challengeId: 'challenge-1',
      code: 'ABCD2345',
    });
  });

  it('keeps Direct-only pairing QR compatibility', () => {
    const pairingUri =
      'mira://pair?host=https%3A%2F%2Fdesktop.example.ts.net&challenge=challenge-1&code=ABCD2345&version=1';

    expect(parseScannedPairingUri(pairingUri)).toBe(pairingUri);
  });
});
