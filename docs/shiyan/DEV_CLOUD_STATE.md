# 拾言（Shiyan）Dev 云环境真相

状态：当前 dev 环境事实（Mutable Environment Truth）

最近核对：2026-08-31

适用环境：Shiyan dev / `dangjingtao/mira-shiyan-cloud` `dev`

> 本文只记录“当前 dev 云环境已经真实存在什么、还缺什么”。产品行为以 `PRD.md` 为准，稳定技术合同以 `TECHNICAL_DESIGN.md` 为准。环境资源变化后应更新本文，不得用旧环境状态反向修改产品合同。

## 1. 已落地 Cloudflare 资源

### D1

- 数据库：`mira-shiyan`
- Database ID：`5f923203-bb4f-40a1-9b83-d6cf493f3114`

远端已应用 migration：

- `0001_capture_foundation.sql`
- `0002_stt_transcript.sql`
- `0004_delivery_records.sql`
- `0005_llm_organization.sql`

### Device

已初始化设备：

- `mira-mobile-primary`

### R2

已创建 bucket：

- `mira-shiyan-audio`

### Worker 构建

- `shiyan-api`：dry-run 构建通过。
- `shiyan-llm`：AI SDK v6 + `@ai-sdk/openai-compatible` 方案已通过 Cloudflare Worker dry-run。
- Cloudflare runtime types、TypeScript、拾言 cloud tests 与本地 D1 migration 校验已通过。

## 2. D1 配置语义

“D1 资源已创建”和“仓库中的 Wrangler 配置如何引用它”是两件事。

当前 `mira-shiyan-cloud/dev` 可以继续在仓库配置中保留 D1 placeholder，并由部署流程通过 `SHIYAN_D1_DATABASE_ID` 注入真实 ID。

因此：

- `REPLACE_WITH_D1_DATABASE_ID` 不得再被解释为“D1 尚未创建”。
- 真正的 dev D1 事实以本文记录的 `mira-shiyan` / `5f923203-bb4f-40a1-9b83-d6cf493f3114` 为准。
- GitHub Actions 若仍因 `SHIYAN_D1_DATABASE_ID` 缺失而阻塞，表示部署输入尚未同步，不表示 Cloudflare D1 资源不存在。

## 3. LLM 配置合同

`shiyan-llm` 不绑定具体厂商，协议层为 OpenAI-compatible。

Primary 最小配置：

- `LLM_PRIMARY_BASE_URL` — Cloudflare Var
- `LLM_PRIMARY_MODEL` — Cloudflare Var
- `LLM_PRIMARY_API_KEY` — Cloudflare Secret
- `LLM_PRIMARY_PROVIDER` — 可选观测标签

Fallback 整组可选：

- `LLM_FALLBACK_BASE_URL`
- `LLM_FALLBACK_MODEL`
- `LLM_FALLBACK_API_KEY`
- `LLM_FALLBACK_PROVIDER` — 可选观测标签

Base URL / Model 等非敏感配置使用 Cloudflare Vars；API Key 使用 Cloudflare Secrets。不得把真实 Secret 写入仓库、日志或本文。

## 4. 当前尚不能据此宣告完成的事项

本文列出的资源落地，不等价于拾言端到端闭环已经验收通过。仍需分别确认：

- GitHub Actions 的 `SHIYAN_D1_DATABASE_ID` 部署输入已同步；
- `shiyan-llm` 的实际 primary（及可选 fallback）Vars / Secrets 已配置；
- `shiyan-api` 所需 R2 credential、device auth pepper、GitHub Destination token 等运行时 Secrets 已配置；
- public/private Worker 已完成真实 dev deploy，而不只是 dry-run；
- Mobile -> CaptureTask -> R2 -> STT -> LLM -> Final Draft -> GitHub 的真实端到端 smoke 已通过。

这些事项应由对应任务卡 / E2E 验收记录更新，不得因为底层资源已经创建而自动判为成功。

## 5. 相关真相

- 产品：[`PRD.md`](./PRD.md)
- 技术架构：[`TECHNICAL_DESIGN.md`](./TECHNICAL_DESIGN.md)
- 跨仓库治理：[`README.md`](./README.md)
- Cloud Foundation 任务卡：`../task-cards/MOB-018-shiyan-cloud-foundation.md`
