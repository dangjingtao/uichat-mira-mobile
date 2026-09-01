const RELEASE_CHANNELS = ['predev', 'dev', 'test', 'prod'];
const VALID_CHANNELS = new Set(RELEASE_CHANNELS);

const normalizeChannel = value => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const channelFromBranch = value => {
  const normalized = normalizeChannel(value);
  return normalized && VALID_CHANNELS.has(normalized) ? normalized : null;
};

/**
 * Resolve the build's release channel from branch truth first.
 *
 * Environment branches are authoritative and isolated: predev/dev/test/prod
 * each keep their own update line. An explicit MIRA_RELEASE_CHANNEL is only
 * used when branch truth is unavailable. Unknown local/feature branches keep
 * the historical dev fallback for non-publishable development builds; release
 * workflows must always run from one of the four explicit environment branches.
 */
const resolveReleaseChannel = ({ env = process.env, branchName = '' } = {}) => {
  const explicit = normalizeChannel(env.MIRA_RELEASE_CHANNEL);
  if (explicit && !VALID_CHANNELS.has(explicit)) {
    throw new Error(
      `Invalid MIRA_RELEASE_CHANNEL: ${explicit}. Expected one of ${RELEASE_CHANNELS.join(', ')}.`,
    );
  }

  const githubBranch =
    channelFromBranch(env.GITHUB_BASE_REF) ?? channelFromBranch(env.GITHUB_REF_NAME);
  if (githubBranch) return githubBranch;

  const githubRef = normalizeChannel(env.GITHUB_REF);
  if (githubRef?.startsWith('refs/heads/')) {
    const githubRefChannel = channelFromBranch(githubRef.slice('refs/heads/'.length));
    if (githubRefChannel) return githubRefChannel;
  }

  const localBranch = channelFromBranch(branchName);
  if (localBranch) return localBranch;

  return explicit ?? 'dev';
};

module.exports = { RELEASE_CHANNELS, resolveReleaseChannel };
