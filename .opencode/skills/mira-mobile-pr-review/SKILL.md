---
name: mira-mobile-pr-review
description: Review Mira Mobile pull requests with project-specific React Native, Host contract, Local Provider, Android/iOS, security, lifecycle, CI/release, and validation-gap rules.
---

# Mira Mobile PR Review

Use this skill only for independent review of `uichat-mira/mira-mobile` changes.

The repository root `AGENTS.md`, a matching `docs/task-cards/MOB-*.md`, relevant current contracts, and explicit PR requirements are the primary contracts. Do not invent product requirements from generic mobile conventions.

## Required review stance

- Review as a read-only second pair of eyes, not as the Builder.
- Findings are hypotheses to be verified by the Builder, not repository truth.
- Separate **Observation**, **Inference**, and **Judgment** for every finding.
- Prefer a small number of high-confidence defects over broad style commentary.
- Do not approve, merge, request changes, mark a task PASS, or change task status.
- Do not turn missing evidence into a bug. Put it under `Platform / validation gaps` unless the task explicitly requires that evidence as part of the implementation.
- A green typecheck/lint/Jest/build is useful evidence, but never equivalent to device acceptance or Host/Provider interoperability.

## Mira Mobile boundaries

Mira Mobile is not a second Mira Host, but it does have two explicit execution paths that must not be confused.

### Remote Host path

Mobile may pair/connect through Direct or Relay transport and consume Host-side sessions, Agent runs and Tool Gateway capabilities. Host/Harness remains authoritative for server state, persistent Agent execution, tool policy and actual remote tool execution.

### Local Provider path

Mobile may store a user-provided Provider API Key in the established secure-storage path, create device-local sessions, call the configured model directly, and run the already-defined foreground Mobile Agent Loop. This is an intended Mobile capability, not automatically an architectural violation.

Escalate when a change:

- silently moves Host/Harness-authoritative Planner, Tool execution, MCP, knowledge-base, server business truth, or Host credentials onto the device;
- leaks Local Provider API Keys to Host or moves Host Provider/Tool/MCP credentials to Mobile;
- creates a second incompatible Provider/Agent runtime instead of extending the established Mobile runtime and adapter boundaries;
- guesses an endpoint, field, error code, permission result, provider behavior, or server state instead of consuming an established contract or an explicit adapter boundary;
- lets UI components bypass the client/adapter/protocol/runtime layer for HTTP, WebSocket, SSE, or Remote calls;
- treats device-local state as account-global or cross-device truth;
- fabricates successful pairing, approval, tool execution, unread/pinned state, or server status.

For Remote / protocol changes, check parsing and validation at the external-data boundary, authentication behavior, timeout/retry/reconnect semantics, pagination/cursor behavior, and whether stale or partial data can be mistaken for authoritative state.

For Local Provider changes, check secure credential handling, provider wire compatibility, local-session lifecycle, streaming/cancellation behavior, and whether provider-specific behavior is isolated through explicit configuration/adapter mechanisms rather than URL-guessing conditionals.

## React Native and mobile-specific checks

Prioritize real user-flow defects in these areas:

### Lifecycle and concurrency

- app foreground/background transitions;
- reconnect/resume after network changes;
- stale async responses overwriting newer state;
- duplicate subscriptions/listeners/timers;
- aborted requests updating unmounted screens;
- persistence hydration races and incorrect fallback state;
- navigation state that loses IDs, ownership, source, or current-thread context.

### Android / iOS parity

When shared JS/TS or native configuration changes could affect platform behavior, consider both Android and iOS.

For native changes, check the relevant counterpart or state a gap instead of assuming parity. Pay special attention to:

- permissions and permission timing;
- camera, file, share, notification, and deep-link behavior;
- URL schemes / universal or app links;
- lifecycle hooks;
- build settings, signing, entitlements, manifests, plist entries, Gradle, CocoaPods, and generated artifacts.

A platform that was not built or tested is normally a **gap**, not automatically a defect.

### Local persistence and truthfulness

For device-local sessions and features such as pinned/read state:

- use stable identifiers;
- do not clear or advance state on failed authoritative reads;
- do not imply synchronization that does not exist;
- handle hydrate/write failure without corrupting the remote model;
- distinguish business state, network state, persisted device state, and transient UI state;
- preserve the Local Provider / Remote Host source boundary when routing actions.

### Security and privacy

Treat as high severity when a change can expose or mishandle credentials, pairing tokens, signing material, sensitive message content, or authorization boundaries.

Check that:

- secrets are not committed, logged, displayed in screenshots/debug surfaces, or placed in ordinary source configuration;
- pairing/auth failures do not silently downgrade to trusted state;
- Local Provider credentials use the established secure-storage path and stay on Mobile;
- Host credentials are not copied into Mobile configuration;
- CI changes do not weaken signing or expose secrets to untrusted PR code;
- external inputs such as pairing URIs and model/provider responses are parsed and validated before use.

### Release and CI

For workflow/build changes, inspect:

- least-privilege GitHub permissions;
- whether untrusted PR code can alter trusted reviewer/publisher behavior in the same run;
- Android/iOS build coverage and signing assumptions;
- artifact integrity and version/release branch behavior;
- the active `feat/* -> dev -> test -> prod` promotion boundary.

`predev` is a repository-specific historical buffer with its own workflow. It must not be treated as a required step in the Organization promotion chain or as a path that bypasses `dev -> test -> prod`.

Historical `feature/*`, `fix/*`, `docs/*`, or `chore/*` branches may still exist. Their presence is not evidence that new work should use those names.

Do not report a workflow merely because it differs from another repository. Judge it against this repository's release path and contracts.

### UI and interaction changes

Review behavior before aesthetics:

- loading / empty / error / data states;
- tap target actually navigates to the intended entity;
- back behavior and hierarchy are coherent;
- list/search/drawer views derive the same business truth where required;
- destructive or irreversible actions are not triggered accidentally.

Do not create findings for subjective visual taste unless the PR violates an explicit design or interaction contract.

## Severity calibration

Use these severities consistently:

- **P0** — credible secret exposure, destructive data/security boundary break, or release compromise requiring immediate stop.
- **P1** — core pairing/chat/auth/Remote or Local Provider flow broken; authoritative state corrupted; major Android/iOS regression; signing/security guard bypassed.
- **P2** — actionable defect affecting a bounded flow, recovery path, one platform, persistence correctness, navigation, or maintainability in a way likely to cause real failures.
- **P3** — minor robustness/style issue. Normally omit P3 from the final review.

If evidence is insufficient to justify P0-P2, do not promote uncertainty into a finding.

## Required output additions

The final review must contain this marker exactly once:

`<!-- mira-mobile-review-skill:v1 -->`

For each finding include:

- Observation
- Inference
- Judgment
- Platform / surface
- Location
- Suggested fix
- Verification

`Platform / surface` should use concrete values such as `Android`, `iOS`, `Both`, `Remote contract`, `Local Provider`, `Local persistence`, `Navigation`, or `CI / release`.

Under `Platform / validation gaps`, explicitly name important checks that could not be verified, including missing device, Host, Provider, permission, signing, or platform evidence. Write `None identified.` when there is no meaningful gap.
