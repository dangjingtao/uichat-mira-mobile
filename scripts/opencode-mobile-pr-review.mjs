import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const REVIEW_MARKER = '<!-- mira-mobile-ai-review:v1 -->';
const SKILL_MARKER = '<!-- mira-mobile-review-skill:v1 -->';
const DEFAULT_MODEL = 'opencode-go/gpt-5.6-luna';
const MAX_TOTAL_DIFF_CHARS = 180_000;
const MAX_FILE_DIFF_CHARS = 32_000;

function fail(message) {
  console.error(`[mobile-pr-review] ${message}`);
  process.exit(1);
}

function readText(relativePath, maxChars = 24_000) {
  try {
    const text = fs.readFileSync(relativePath, 'utf8');
    return text.length <= maxChars ? text : `${text.slice(0, maxChars)}\n\n[truncated by reviewer]`;
  } catch {
    return '';
  }
}

function findTaskContext(pr) {
  const hint = [pr.title, pr.body || '', pr.head?.ref || ''].join('\n');
  const match = hint.match(/\bMOB-\d{3}\b/i);
  if (!match) return null;

  const taskId = match[0].toUpperCase();
  const taskDir = path.join('docs', 'task-cards');
  try {
    const filename = fs.readdirSync(taskDir).find((name) => name.startsWith(`${taskId}-`));
    if (!filename) return { taskId, path: null, content: '' };
    const taskPath = path.join(taskDir, filename);
    return { taskId, path: taskPath, content: readText(taskPath, 28_000) };
  } catch {
    return { taskId, path: null, content: '' };
  }
}

function stripAnsi(text) {
  return text.replace(/[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g, '');
}

function git(args, maxBuffer = 16 * 1024 * 1024) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer });
}

function buildDiff(baseSha, headSha, files) {
  const chunks = [];
  const truncatedFiles = [];
  const omittedFiles = [];
  let used = 0;

  for (const file of files) {
    let fileDiff = '';
    try {
      fileDiff = git(['diff', '--no-ext-diff', '--unified=30', `${baseSha}...${headSha}`, '--', file]);
    } catch (error) {
      fail(`Unable to build diff for ${file}: ${error.message}`);
    }

    if (!fileDiff.trim()) continue;

    if (fileDiff.length > MAX_FILE_DIFF_CHARS) {
      fileDiff = `${fileDiff.slice(0, MAX_FILE_DIFF_CHARS)}\n\n[file diff truncated: ${file}]`;
      truncatedFiles.push(file);
    }

    if (used + fileDiff.length > MAX_TOTAL_DIFF_CHARS) {
      omittedFiles.push(file);
      continue;
    }

    chunks.push(fileDiff);
    used += fileDiff.length;
  }

  return {
    text: chunks.join('\n'),
    truncatedFiles,
    omittedFiles,
  };
}

function pushContext(contexts, label, relativePath, maxChars) {
  const content = readText(relativePath, maxChars);
  if (content) contexts.push([label, content]);
}

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) fail('GITHUB_EVENT_PATH is missing.');
if (!process.env.OPENCODE_API_KEY?.trim()) fail('OPENCODE_API_KEY is missing.');

const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
const pr = event.pull_request;
if (!pr) fail('This script must run from a pull_request event.');

const baseSha = pr.base?.sha;
const headSha = pr.head?.sha;
if (!baseSha || !headSha) fail('Pull request base/head SHA is missing.');

let changedFiles = [];
try {
  changedFiles = git(['diff', '--name-only', `${baseSha}...${headSha}`])
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
} catch (error) {
  fail(`Unable to list changed files: ${error.message}`);
}

if (changedFiles.length === 0) fail('The pull request diff is empty.');

const diff = buildDiff(baseSha, headSha, changedFiles);
if (!diff.text.trim()) fail('The pull request diff could not be assembled.');

const task = findTaskContext(pr);
const contexts = [];
pushContext(contexts, 'Repository rules (AGENTS.md)', 'AGENTS.md', 32_000);
pushContext(contexts, 'Mobile work ledger', 'docs/work-ledger.md', 32_000);
pushContext(contexts, 'Mobile task-card index', 'docs/task-cards/README.md', 16_000);
if (task?.content) contexts.push([`Task ${task.taskId} (${task.path})`, task.content]);

const changedText = changedFiles.join('\n');
const touchesRemote = /(^|\/)(src\/(api|protocol)|remote-access|.*pair|.*host|.*session)/i.test(changedText);
const touchesNativeOrCi = /(^android\/|^ios\/|^\.github\/workflows\/|package\.json$|Gemfile|Podfile|gradle)/i.test(changedText);
const touchesUi = /(^App\.tsx$|^src\/.*(Screen|screen|components?|navigation|ui)\/|^src\/.*(Screen|View|List|Card)\.(tsx|ts)$)/i.test(changedText);

if (touchesRemote) {
  pushContext(contexts, 'Remote access contracts', 'docs/remote-access/README.md', 24_000);
}
if (touchesNativeOrCi) {
  pushContext(contexts, 'Build and release rules', 'docs/github-build-release.md', 24_000);
}
if (touchesUi) {
  pushContext(contexts, 'Design principles', 'docs/design-principles.md', 12_000);
  pushContext(contexts, 'Component guidance', 'docs/components.md', 16_000);
}

const projectContext = contexts.map(([label, content]) => `### ${label}\n${content}`).join('\n\n');
const diffNotes = [
  diff.truncatedFiles.length ? `Per-file diff truncated: ${diff.truncatedFiles.join(', ')}` : 'Per-file diff truncated: none',
  diff.omittedFiles.length ? `Files omitted by total diff budget: ${diff.omittedFiles.join(', ')}` : 'Files omitted by total diff budget: none',
].join('\n');

const prompt = `You are the independent, read-only pull-request reviewer for Mira Mobile.

Before reviewing, you MUST use OpenCode's skill tool to load the project skill named \`mira-mobile-pr-review\` and follow it. Do not substitute a generic mobile checklist for that skill.

All required PR metadata, project contracts, task context, and a bounded multi-file diff are supplied below. You may use read/glob/grep to inspect repository files when useful. You may not edit files, run shell commands, launch subagents, browse the web, or ask interactive questions.

Review high-confidence actionable defects only. The local Builder will independently verify every finding.

Additional rules:
- Treat AGENTS.md, the current work ledger, the matching MOB task card, and explicit PR requirements as contracts in that order of relevance.
- Do not invent Desktop/Host behavior not present in supplied contracts.
- Do not infer that missing real-device or real-Host validation is a code defect unless the task explicitly makes it an implementation requirement; record it as a validation gap instead.
- CI/typecheck/build success is evidence, not product acceptance.
- Never mark the task PASS and never recommend merge/approval.
- If the diff budget omitted material files, inspect their current contents when possible and still disclose the limitation under validation gaps.
- Your final response MUST contain ${REVIEW_MARKER} exactly once.

Return Markdown using exactly these top-level headings:
${REVIEW_MARKER}
# Mira Mobile OpenCode PR Review
## Verdict
Choose one token: NO_BLOCKING_FINDINGS, CHANGES_NEEDED, or HUMAN_CHECK_NEEDED, followed by one short sentence.
## Findings
Follow the loaded skill's required finding fields. If there are no actionable P0-P2 findings, write: No high-confidence P0-P2 findings.
## Platform / validation gaps
Follow the loaded skill. Be concrete about Android, iOS, device, Host, permission, signing, or diff-budget evidence that was not verified.
## Local handoff
Write exactly: Run \`npm run review:pull\` on the PR branch, verify the Head SHA, then read \`.ai/reviews/latest.md\`.

Repository: ${process.env.GITHUB_REPOSITORY || 'unknown'}
PR: #${pr.number} ${pr.title}
Base: ${pr.base?.ref} (${baseSha})
Head: ${pr.head?.ref} (${headSha})
Author: ${pr.user?.login || 'unknown'}
Detected task: ${task?.taskId || '(none)'}
Changed files:\n${changedFiles.join('\n')}
${diffNotes}

PR body:\n${pr.body || '(none)'}

PROJECT CONTEXT\n${projectContext}

PULL REQUEST DIFF\n\`\`\`diff\n${diff.text}\n\`\`\``;

const model = process.env.OPENCODE_REVIEW_MODEL?.trim() || DEFAULT_MODEL;
const result = spawnSync(
  'opencode',
  ['run', '--model', model, '--format', 'default', '--dir', process.cwd(), prompt],
  {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    env: {
      ...process.env,
      OPENCODE_PERMISSION:
        process.env.OPENCODE_PERMISSION ||
        '{"read":"allow","glob":"allow","grep":"allow","edit":"deny","bash":"deny","task":"deny","lsp":"deny","question":"deny","webfetch":"deny","websearch":"deny","skill":{"*":"deny","mira-mobile-pr-review":"allow"}}',
    },
  },
);

if (result.error) fail(`Unable to start OpenCode: ${result.error.message}`);
if (result.status !== 0) {
  const details = stripAnsi(`${result.stderr || ''}\n${result.stdout || ''}`).trim();
  fail(`OpenCode exited with status ${result.status}. ${details.slice(-5000)}`);
}

const reviewBody = stripAnsi(result.stdout || '').trim();
if (!reviewBody) fail('OpenCode returned an empty response.');

const reviewMarkerCount = reviewBody.split(REVIEW_MARKER).length - 1;
if (reviewMarkerCount !== 1) fail(`Review marker must appear exactly once; got ${reviewMarkerCount}.`);

const skillMarkerCount = reviewBody.split(SKILL_MARKER).length - 1;
if (skillMarkerCount !== 1) fail(`Mobile review skill marker must appear exactly once; got ${skillMarkerCount}. The project skill may not have been loaded.`);

for (const heading of [
  '# Mira Mobile OpenCode PR Review',
  '## Verdict',
  '## Findings',
  '## Platform / validation gaps',
  '## Local handoff',
]) {
  if (!reviewBody.includes(heading)) fail(`OpenCode response is missing required heading: ${heading}`);
}

const verdictMatch = reviewBody.match(/## Verdict\s*\n+\s*(NO_BLOCKING_FINDINGS|CHANGES_NEEDED|HUMAN_CHECK_NEEDED)\b/);
if (!verdictMatch) fail('OpenCode response contains an invalid or missing verdict token.');

const review = [
  `<!-- mira-mobile-ai-review-metadata:v1 head=${headSha} base=${baseSha} model=${model} -->`,
  reviewBody,
  '',
].join('\n');

fs.writeFileSync('ai-review.md', review, 'utf8');
console.log(`[mobile-pr-review] Review generated for PR #${pr.number} at ${headSha} with ${model}.`);
