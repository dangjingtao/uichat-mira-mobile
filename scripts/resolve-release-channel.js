const VALID_CHANNELS = new Set(['dev', 'prod']);

const normalizeChannel = value => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

/**
 * Resolve the build's release channel from branch truth first.
 *
 * GitHub PR/push context is authoritative when present. For local builds,
 * checking out dev/prod is also authoritative. An explicit
 * MIRA_RELEASE_CHANNEL is only used when branch truth is unavailable (for
 * example, a local feature branch). This keeps prod builds from silently
 * falling back to dev while preserving dev as the local feature-branch
 * default.
 */
const resolveReleaseChannel = ({ env = process.env, branchName = '' } = {}) => {
  const explicit = normalizeChannel(env.MIRA_RELEASE_CHANNEL);
  if (explicit && !VALID_CHANNELS.has(explicit)) {
    throw new Error(
      `Invalid MIRA_RELEASE_CHANNEL: ${explicit}. Expected "dev" or "prod".`,
    );
  }

  const githubBranch =
    normalizeChannel(env.GITHUB_BASE_REF) ?? normalizeChannel(env.GITHUB_REF_NAME);
  const githubRef = normalizeChannel(env.GITHUB_REF);

  if (githubBranch === 'prod' || githubRef === 'refs/heads/prod') return 'prod';
  if (githubBranch === 'dev' || githubRef === 'refs/heads/dev') return 'dev';
  if (branchName === 'prod') return 'prod';
  if (branchName === 'dev') return 'dev';

  return explicit ?? 'dev';
};

module.exports = { resolveReleaseChannel };
