# MOB-020：拾言 LLM 整理与 AI 调整

状态：待实施

负责人：`mob_020_shiyan_llm_organization`

执行仓库：`dangjingtao/mira-shiyan-cloud`

目标基线：MOB-019 合入后的 Cloud 基线

目标里程碑：Shiyan MVP

依赖：MOB-018、MOB-019

## 背景

拾言不是单纯转写工具。Transcript 只是证据层，核心价值来自“按场景整理 -> AI 调整 -> 用户最终编辑”。LLM 使用现有 Provider Key，通过私有 `shiyan-llm` Worker 统一适配；业务 Task 状态仍由 `shiyan-api` / Workflow 解释。

## 目标

完成 Transcript -> Structured Result(JSON) -> Markdown AI Draft 的整理链路，并支持用户在最终人工编辑前反复提出轻量 AI 调整指令。

## 范围

- 在私有 `shiyan-llm` Worker 建立统一 Provider Adapter；
- MVP 配置一个 primary + 一个 fallback，不做复杂智能路由；
- Provider Key 仅放 Cloudflare Secret / 等价安全配置；
- 支持会议、临时口述需求、个人复盘 / 想法记录三个内置场景；
- 自定义场景只消费“名称 + 整理要求 + 输出结构”，不把完整系统 Prompt 暴露给普通用户；
- 组织结果先生成结构化 JSON，再生成 / 派生 Markdown AI Draft；
- 会议内置结构至少覆盖：摘要、关键决策、待办事项、风险 / 阻塞、待确认问题；
- AI 调整基于当前 AI Draft 与用户轻量指令产生新候选版本；在进入用户最终编辑前可以多次执行；
- 整理 Stage 与 AI 调整请求都要记录 provider、model、latency、usage（Provider 支持时）、错误类别与 correlation id；
- fallback 只处理明确可重试 / provider 不可用场景，不能吞掉 schema / prompt / 业务输入错误；
- structured output 必须经过服务端校验，失败时返回明确可诊断错误，不把不合法 JSON 当成功结果。

## Hard Constraints

- `shiyan-llm` 不公开暴露业务 API，只通过内部调用；
- `shiyan-llm` 不写 CaptureTask 业务状态；
- 不让每个 Destination 各自重新调用 LLM；
- 不让 AI 自动覆盖用户 Final Draft；
- 不自动拆任务卡、生成 PRD、修改正式需求文档或外发内容；
- 不把 Provider 原始错误 / Key 泄露给客户端。

## Execution Entry Points

- MOB-018 的 `shiyan-llm` Worker 壳与 Service Binding
- MOB-019 的 Transcript contract
- scene model / prompt composition
- structured result validation
- AI Draft persistence / adjustment endpoint or command contract

## Validation

- primary provider success；
- primary 可重试失败 -> fallback success；
- primary 输入 / schema 错误不错误 fallback；
- structured JSON 校验失败可诊断；
- 三个内置场景输出结构稳定；
- 自定义场景只使用允许字段；
- 连续两次 AI 调整不会覆盖 Transcript；
- provider telemetry 不包含 secret / 完整敏感原文日志。

## 验收

1. Transcript 可生成结构化结果与 Markdown AI Draft；
2. 三个内置场景行为符合 PRD；
3. AI 调整可在人工最终编辑前重复执行；
4. provider fallback 与错误归一可测试、可观察；
5. `shiyan-llm` 不拥有 Task 状态解释权；
6. 不存在未经用户确认的自动外发。

## 非目标

- 不做复杂模型路由平台；
- 不做 Prompt 市场；
- 不做知识库 / RAG；
- 不做 Final Draft 后静默 AI 改写；
- 不做 Destination-specific LLM。

## 并行边界

MOB-020 建议在 MOB-019 Transcript 合同合入后施工。它主要拥有 LLM Adapter、scene organization、structured result 与 AI Draft；完成后应冻结 Final Draft 上游内容合同，MOB-021 与 MOB-022 才适合并行。