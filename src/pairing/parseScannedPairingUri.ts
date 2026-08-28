import { parsePairingUriV1 } from '../protocol/remotePairingV1';

export const parseScannedPairingUri = (value: string): string => {
  const pairingUri = value.trim();
  parsePairingUriV1(pairingUri);
  return pairingUri;
};
