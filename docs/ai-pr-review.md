# Mira Mobile PR Review

Mira Mobile 的自动 Pull Request Review 当前由 **CodeRabbit** 提供，配置来源是仓库根目录 `.coderabbit.yaml`。

旧的 OpenCode 自动 Review 已于 2026-09-03 停用；`.github/workflows/ai-pr-review.yml` 目前只保留一个可手工触发的 disabled tombstone，不参与正常 PR Review。

## Trigger

CodeRabbit 自动审查面向目标分支为 `dev` 的非 Draft PR：

- automatic review enabled；
- incremental review enabled；
- Draft PR 不自动审查；
- base branch：`dev`。

正常工作流因此是：

```text
feat/* -> PR(dev) -> repository CI + CodeRabbit -> maintainer decision -> dev
```

CodeRabbit Review 是审查证据，不替代 CI、真机验证、协议验证或维护者的验收决定。

## Review profile

当前 `.coderabbit.yaml` 使用：

- language: `zh-CN`
- profile: `assertive`
- high-level summary: enabled
- review status: enabled
- request-changes workflow: disabled
- poem: disabled

仓库要求 Review 优先报告经过验证的 P0-P2 问题，避免低价值样式评论。

## Repository review rules

CodeRabbit 被要求把以下内容作为仓库级 Review 规则：

- `AGENTS.md`
- `.opencode/skills/mira-mobile-pr-review/SKILL.md`

其中 Review 重点包括：

- React Native lifecycle、异步竞态、reconnect / resume、hydration、navigation state；
- Mira Host / Remote 合同与外部数据校验；
- Local Provider / Remote Host 的状态与凭据边界；
- Android / iOS parity、权限、deep link、native configuration 与 build impact；
- credential、pairing token、signing、CI / release 安全边界；
- Tool Gateway / Agent Runtime 的权威边界；
- loading / empty / error / data 等交互状态。

缺少真机、Host、Cloud、Provider、签名或跨仓库验证时，默认记录为 validation gap；除非任务合同明确要求该证据作为实现条件，否则不能仅凭“尚未验证”升级成代码缺陷。

## Finding format

实质性 finding 应清楚区分：

```text
Observation
Inference
Judgment
```

并说明：

- 影响平台 / surface；
- 相关代码或合同位置；
- 风险；
- 建议修复；
- 可执行的验证方式。

Task Card / work ledger 变更还必须核对状态与 Acceptance Evidence 是否一致，并尊重维护者已经明确作出的验收决定。

## Old OpenCode review loop

仓库历史上存在项目专用 OpenCode PR Review 工作流及辅助脚本。它们不再是当前自动 Review 的事实来源。

当前自动 Review 行为以 `.coderabbit.yaml` 为准；历史实现如需删除、归档或重新启用，应另立工作项处理，不在普通功能 PR 中顺手修改。
