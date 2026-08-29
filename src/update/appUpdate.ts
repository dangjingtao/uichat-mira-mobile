import { compareSemver, parseSemver, type SemverVersion } from './semver';

export type ReleaseChannel = 'dev' | 'prod';

export interface AppRelease {
  tag: string;
  version: SemverVersion;
  notes: string | null;
  /** Canonical browser download URL of the signed Release APK, if published. */
  apkUrl: string | null;
  /** GitHub Release page URL used on platforms without an installable build. */
  releaseUrl: string | null;
}

interface GithubReleaseAsset {
  name?: unknown;
  browser_download_url?: unknown;
}

interface GithubReleasePayload {
  tag_name?: unknown;
  draft?: unknown;
  body?: unknown;
  html_url?: unknown;
  assets?: unknown;
}

const GITHUB_RELEASES_URL =
  'https://api.github.com/repos/dangjingtao/uichat-mira-mobile/releases?per_page=100';
const RELEASED_APK_NAME = 'uichat-mira-mobile-release.apk';

/**
 * Only tags matching the current channel are eligible:
 * - dev channel: `v<semver>-dev` prereleases
 * - prod channel: `v<semver>` stable releases
 */
const versionTextForChannelTag = (
  channel: ReleaseChannel,
  tag: string,
): string | null => {
  if (channel === 'dev') {
    const match = /^v(\d+\.\d+\.\d+)-dev$/.exec(tag);
    return match ? match[1] : null;
  }
  const match = /^v(\d+\.\d+\.\d+)$/.exec(tag);
  return match ? match[1] : null;
};

const findApkAssetUrl = (assets: unknown): string | null => {
  if (!Array.isArray(assets)) return null;
  for (const asset of assets) {
    const candidate = asset as GithubReleaseAsset;
    if (
      candidate.name === RELEASED_APK_NAME &&
      typeof candidate.browser_download_url === 'string' &&
      candidate.browser_download_url.length > 0
    ) {
      return candidate.browser_download_url;
    }
  }
  return null;
};

export const selectLatestRelease = (
  channel: ReleaseChannel,
  releases: GithubReleasePayload[],
): AppRelease | null => {
  let latest: AppRelease | null = null;
  for (const release of releases) {
    if (release.draft === true) continue;
    if (typeof release.tag_name !== 'string' || release.tag_name.length === 0) {
      continue;
    }
    const versionText = versionTextForChannelTag(channel, release.tag_name);
    if (!versionText) continue;
    const version = parseSemver(versionText);
    if (!version) continue;
    if (latest && compareSemver(version, latest.version) <= 0) continue;
    latest = {
      tag: release.tag_name,
      version,
      notes: typeof release.body === 'string' ? release.body : null,
      apkUrl: findApkAssetUrl(release.assets),
      releaseUrl: typeof release.html_url === 'string' ? release.html_url : null,
    };
  }
  return latest;
};

const parseReleasesPayload = (payload: unknown): GithubReleasePayload[] => {
  if (!Array.isArray(payload)) {
    throw new Error('GitHub Releases 响应格式异常');
  }
  return payload as GithubReleasePayload[];
};

export type ReleaseFetcher = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Fetches the newest release published on the given channel. Throws on
 * network / HTTP failures so the caller can surface a retryable error instead
 * of pretending the app is up to date.
 */
export const fetchLatestRelease = async (
  channel: ReleaseChannel,
  fetchImpl: ReleaseFetcher,
): Promise<AppRelease | null> => {
  const response = await fetchImpl(GITHUB_RELEASES_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) {
    throw new Error(`GitHub Releases 请求失败（HTTP ${response.status}）`);
  }
  const payload = parseReleasesPayload(await response.json());
  return selectLatestRelease(channel, payload);
};

export const isUpdateAvailable = (
  currentVersion: SemverVersion,
  latest: AppRelease | null,
): boolean => Boolean(latest && compareSemver(latest.version, currentVersion) > 0);
