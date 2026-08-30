export interface SemverVersion {
  major: number;
  minor: number;
  patch: number;
}

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export const parseSemver = (value: string): SemverVersion | null => {
  const match = SEMVER_PATTERN.exec(value.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
};

export const compareSemver = (
  left: SemverVersion,
  right: SemverVersion,
): number => {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
};

export const formatSemver = (version: SemverVersion): string =>
  `${version.major}.${version.minor}.${version.patch}`;
