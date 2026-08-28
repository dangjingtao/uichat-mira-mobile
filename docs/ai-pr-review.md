# Mira Mobile AI PR Review

Mira Mobile uses a project-specific OpenCode Go review loop for pull requests targeting `dev`.

```text
Builder -> PR -> Mira Mobile Reviewer -> Findings -> local Agent inbox -> Builder verify/fix/reject -> push -> review again
```

The review is advisory. It does not merge, approve, request changes, or change task-card status.

## Trigger

`.github/workflows/ai-pr-review.yml` runs for non-draft, same-repository pull requests targeting `dev` on:

- opened
- synchronize
- reopened
- ready_for_review

Each new push cancels the older in-flight review for the same PR.

## Model

Default model:

```text
opencode-go/gpt-5.6-luna
```

Repository variable `OPENCODE_REVIEW_MODEL` may override the default without editing the workflow.

Required repository secret:

```text
OPENCODE_API_KEY
```

## Trust boundary

The PR head is the object being reviewed.

The following review controls are loaded from the PR base SHA (`dev`) instead of trusting the PR copy:

- `scripts/opencode-mobile-pr-review.mjs`
- `.opencode/skills/mira-mobile-pr-review/SKILL.md`
- `AGENTS.md`
- `docs/work-ledger.md`
- `docs/task-cards/README.md`
- matching `docs/task-cards/MOB-*.md`
- relevant Remote/build/design docs selected by the reviewer

This prevents a PR from weakening its own reviewer rules in the same run.

The model job has `contents: read` only. OpenCode may read/search repository files and load the `mira-mobile-pr-review` skill, but cannot edit files, run shell commands, launch subagents, browse the web, or ask interactive questions.

GitHub comment write permission belongs only to the deterministic publish job.

## Mobile-specific review profile

The review skill prioritizes:

- React Native lifecycle, async races, reconnect/resume, hydration, and navigation state;
- Mira Host / Remote contract boundaries and external-data validation;
- device-local versus server-authoritative state truthfulness;
- Android / iOS parity, permissions, deep links, native configuration, and build impact;
- credential, pairing-token, signing, and CI security boundaries;
- release branch and artifact behavior;
- loading/empty/error/data interaction flows.

Missing real-device or real-Host evidence is normally recorded under `Platform / validation gaps`, not promoted into a defect unless the task explicitly requires that validation as an implementation condition.

## Output contract

A valid review contains:

```text
<!-- mira-mobile-ai-review:v1 -->
<!-- mira-mobile-review-skill:v1 -->
# Mira Mobile OpenCode PR Review
## Verdict
## Findings
## Platform / validation gaps
## Local handoff
```

Verdict is one of:

```text
NO_BLOCKING_FINDINGS
CHANGES_NEEDED
HUMAN_CHECK_NEEDED
```

Every actionable finding separates Observation, Inference, and Judgment and identifies the affected platform/surface, location, suggested fix, and verification method.

The published comment metadata records the exact reviewed Head SHA, base SHA, and model.

## Local Agent handoff

On the PR branch:

```bash
npm run review:pull
```

Or explicitly:

```bash
npm run review:pull -- <PR_NUMBER>
```

The helper writes:

```text
.ai/reviews/pr-<number>.md
.ai/reviews/latest.md
```

The directory is gitignored.

The helper fails when the latest review Head SHA does not match the current PR Head SHA. A Builder must not act on a stale review as if it described the current code.

Local handling rule:

```text
pull review
-> verify Head SHA / stale=no
-> inspect each finding against code + contracts
-> fix, reject with evidence, or escalate
-> push
-> wait for the next review bound to the new Head SHA
```

## Bootstrap note

The workflow cannot review the bootstrap PR that introduces the workflow itself because GitHub evaluates the workflow from the target branch. After this infrastructure is merged to `dev`, create a disposable same-repository PR targeting `dev` to smoke-test the complete OpenCode -> comment -> local handoff loop.
