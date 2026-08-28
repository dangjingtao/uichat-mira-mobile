# MOB-019：拾言 STT Workflow 与 Transcript 证据层

状态：待实施

负责人：`mob_019_shiyan_stt_transcript`

执行仓库：`dangjingtao/mira-shiyan-cloud`

目标基线：MOB-018 合入后的 Cloud 基线

目标里程碑：Shiyan MVP

依赖：MOB-018

## 背景

拾言的 Transcript 是长期保留、只读的证据层；原始录音默认 3 天后清理，但 Transcript 不随录音删除。STT 失败只能表示转写阶段失败，不能把整个 CaptureTask 判成失败。

## 目标

在既有 CaptureTask / R2 / Workflow 基础上完成可重试 STT 阶段，持久化长期 Transcript，并实现默认 3 天原始录音保留策略。

## 范围

- 建立 `STTProvider` Adapter；
- MVP 默认接 Cloudflare Workers AI Whisper Large V3 Turbo 或当前技术设计确认的等价模型；
- STT 输入来自已确认的 R2 AudioAsset；
- Workflow 在 STT 前验证资产存在且 metadata 合法；
- 保存结构化 Transcript 与必要 provider metadata；
- Transcript 一旦成功生成，作为长期证据数据保存；
- 原始 Provider 响应如需保留，应放 R2 / 原始资产层，不污染业务主表；
- STT Stage 独立记录 running / succeeded / failed、错误码、重试性与尝试次数；
- 可重试错误允许只重跑 STT，不重新上传录音、不重建 Task；
- 配置原始录音默认 3 天清理策略；重要录音的 `retained` 标记必须能阻止默认清理；
- 清理录音不得删除 Transcript、Draft、Final Draft 或 Delivery Record；
- 支持 `initial_prompt` 或等价术语提示能力的 Provider Adapter 接口，但 MVP 不做复杂术语管理产品。

## Hard Constraints

- Transcript 原文只读，不提供“修改原始 STT”语义；
- 不做 speaker diarization / identification；
- 不做实时字幕；
- 不把 STT Provider 错误归一成“任务失败”；
- 不因 STT 重试重复生成新的 CaptureTask；
- 默认录音保留 3 天，不能改成“STT 成功立即删除”。

## Execution Entry Points

- MOB-018 创建的 Workflow / Stage / AudioAsset / D1 / R2 结构
- `STTProvider` 新增实现
- Transcript persistence
- R2 lifecycle / retained asset policy

## Validation

- provider adapter unit tests；
- Workflow：成功、Provider 5xx / timeout、不可重试输入错误、重复重试；
- STT 失败后 AudioAsset 仍存在且 Task 可恢复；
- STT 成功后 Transcript 可独立读取；
- 原始录音删除模拟后 Transcript 仍可读取；
- `retained` 录音不被默认 3 天清理规则命中；
- 真实会议样本至少完成一次长音频转写验证，并记录耗时 / Provider 结果。

## 验收

1. 上传成功的音频可进入 STT Stage；
2. 成功后生成长期 Transcript；
3. 失败只影响 STT Stage，并能按错误类型重试；
4. 原始录音默认 3 天清理，重要录音可保留；
5. 清理录音不影响 Transcript；
6. Transcript 不支持覆盖式人工修改；
7. 不引入说话人识别和实时转写。

## 非目标

- 不做 AI 摘要 / 整理；
- 不做人工 Transcript 编辑器；
- 不做术语词库管理 UI；
- 不做多 STT Provider 智能路由。

## 并行边界

MOB-019 在 MOB-018 合入后施工。它主要拥有 STT Stage、Transcript 与音频保留策略；在 Transcript 合同冻结前，不建议 MOB-020 并行修改同一 Workflow 主链。