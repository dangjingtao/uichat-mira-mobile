import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const REVIEW_MARKER = '<!-- mira-mobile-ai-review:v1 -->';
const SKILL_MARKER = '<!-- mira-mobile-review-skill:v1 -->';

function fail(message) {
  console.error(`[review:pull] ${message}`);
  process.exit(1);
}

function tryExec(file, args) {
  try {
    return execFileSync(file, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function repoFromGitRemote() {
  const remote = tryExec('git', ['config', '--get', 'remote.origin.url']);
  if (!remote) return null;

  const normalized = remote
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/^ssh:\/\/git@github\.com\//, 'https://github.com/')
    .replace(/\.git$/, '');

  try {
    const parsed = new URL(normalized);
    if (parsed.hostname !== 'github.com') return null;
    const parts = parsed.pathname.replace(/^\//, '').split('/').filter(Boolean);
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  } catch {
    return null;
  }
}

async function githubJson(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    fail(`GitHub API ${response.status}: ${body.slice(0, 1200)}`);
  }
  return response.json();
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY || repoFromGitRemote();
  if (!repo) {
    fail('Cannot determine GitHub repository from GITHUB_REPOSITORY or remote.origin.url.');
  }

  let prNumber = process.argv.slice(2).find((value) => /^\d+$/.test(value));
  if (!prNumber) {
    prNumber = tryExec('gh', ['pr', 'view', '--json', 'number', '--jq', '.number']);
  }
  if (!prNumber) {
    fail('Cannot determine the PR for the current branch. Run `npm run review:pull -- <PR_NUMBER>` or authenticate GitHub CLI.');
  }

  const token =
    process.env.GH_TOKEN ||
    process.env.GITHUB_TOKEN ||
    tryExec('gh', ['auth', 'token']);

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const pr = await githubJson(`https://api.github.com/repos/${repo}/pulls/${prNumber}`, headers);

  const comments = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await githubJson(
      `https://api.github.com/repos/${repo}/issues/${prNumber}/comments?per_page=100&page=${page}`,
      headers,
    );
    if (!Array.isArray(batch)) fail('GitHub returned an unexpected comments payload.');
    comments.push(...batch);
    if (batch.length < 100) break;
  }

  const candidates = comments
    .filter((comment) => typeof comment?.body === 'string' && comment.body.includes(REVIEW_MARKER))
    .sort((a, b) => new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at));

  const reviewComment =
    candidates.filter((comment) => comment?.user?.login === 'github-actions[bot]').at(-1) ||
    candidates.at(-1);

  if (!reviewComment) {
    fail(`No Mira Mobile AI review comment found for ${repo}#${prNumber}.`);
  }

  if (!reviewComment.body.includes(SKILL_MARKER)) {
    fail(`Review comment for ${repo}#${prNumber} is missing the Mira Mobile review skill marker.`);
  }

  const metadataMatch = reviewComment.body.match(/<!-- mira-mobile-ai-review-metadata:v1 head=([0-9a-f]{40})\s+base=([0-9a-f]{40})\s+model=([^\s]+) -->/i);
  if (!metadataMatch) {
    fail(`Review comment for ${repo}#${prNumber} has invalid metadata.`);
  }

  const [, reviewedHead, reviewedBase, reviewedModel] = metadataMatch;
  const currentHead = pr.head?.sha || 'unknown';
  const isStale = reviewedHead !== currentHead;

  const directory = '.ai/reviews';
  fs.mkdirSync(directory, { recursive: true });

  const sourceUrl =
    reviewComment.html_url ||
    `https://github.com/${repo}/pull/${prNumber}#issuecomment-${reviewComment.id}`;
  const content = [
    '<!-- mira-mobile-ai-review-local-copy:v1 -->',
    `# Synced Mira Mobile PR Review #${prNumber}`,
    '',
    `- Repository: ${repo}`,
    `- PR: ${pr.html_url || `https://github.com/${repo}/pull/${prNumber}`}`,
    `- Base: ${pr.base?.ref || 'unknown'}`,
    `- Head: ${pr.head?.ref || 'unknown'}`,
    `- Head SHA: ${currentHead}`,
    `- Reviewed Head SHA: ${reviewedHead}`,
    `- Reviewed Base SHA: ${reviewedBase}`,
    `- Model: ${reviewedModel}`,
    `- Stale: ${isStale ? 'yes' : 'no'}`,
    `- Review source: ${sourceUrl}`,
    `- Review comment updated: ${reviewComment.updated_at || reviewComment.created_at || 'unknown'}`,
    `- Synced: ${new Date().toISOString()}`,
    '',
    reviewComment.body,
    '',
  ].join('\n');

  const prPath = `${directory}/pr-${prNumber}.md`;
  const latestPath = `${directory}/latest.md`;
  fs.writeFileSync(prPath, content, 'utf8');
  fs.writeFileSync(latestPath, content, 'utf8');

  console.log(`[review:pull] Synced PR #${prNumber}`);
  console.log(`[review:pull] reviewed head ${reviewedHead}`);
  console.log(`[review:pull] current head ${currentHead}`);
  console.log(`[review:pull] stale ${isStale ? 'yes' : 'no'}`);
  console.log(`[review:pull] ${prPath}`);
  console.log(`[review:pull] ${latestPath}`);

  if (isStale) {
    fail(`The latest AI review is stale: reviewed ${reviewedHead}, current PR head is ${currentHead}. Wait for the current review run or re-run it before acting on findings.`);
  }
}

await main();
