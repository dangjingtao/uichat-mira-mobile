# MOB-021：拾言处理状态、结果编辑与历史任务

状态：待实施

负责人：`mob_021_shiyan_mobile_results_history`

执行仓库：`dangjingtao/uichat-mira-mobile`

目标基线：MOB-016、MOB-017 合入后的 Mobile；MOB-020 完成 Cloud 内容合同

目标里程碑：Shiyan MVP

依赖：MOB-016、MOB-017、MOB-018、MOB-019、MOB-020

## 背景

拾言 Mobile 需要把本地录音、云端阶段状态、Transcript、AI Draft 与 Final Draft 串成一个真实任务体验。产品要求任何单阶段错误都不能粗暴显示成“整个任务失败”，Transcript 只读，AI 调整发生在人工最终编辑之前。

## 目标

完成 Mobile 端“确认提交 -> 上传 -> 处理状态 -> Transcript / AI Draft 回显 -> AI 调整 -> 用户最终编辑 -> 历史任务”的主工作流，并提供 Markdown / 系统分享。

## 范围

- 建立独立 `ShiyanClient`，页面不得散落直接 HTTP 调用；
- 用户结束录音并确认标题 / 场景后创建 CaptureTask；
- 获取上传授权并从本地文件直接上传 R2，完成后确认资产；
- 弱网 / 上传失败时保留本地录音并支持重试；
- 任务详情按真实 Stage 展示上传、转写、整理、待调整、投递等状态；
- 单阶段失败显示具体阶段、错误和可重试入口；
- Transcript 只读，可折叠查看完整原文；
- AI Draft 支持轻量 AI 调整指令；
- 用户开始最终编辑后形成 Final Draft，后台 AI 不得自动覆盖；
- 若用户在 Final Draft 后主动再次调用 AI，必须生成候选结果，不静默覆盖当前人工稿；
- 历史任务列表展示标题、场景、时间、当前阶段 / 状态、真实去向；
- 已有 Destination URL 时显示可打开 canonical link；没有链接时不伪造；
- MVP 支持 Markdown 导出 / 系统分享；
- 提供“保留原始录音”控制，与 Cloud retained 语义对齐。

## Hard Constraints

- 不把 Desktop / Host 连接状态当作拾言云端可用性的前提；
- 不把云端事实复制成第二套 authoritative 本地状态；
- 不修改 Transcript 原文；
- 不把错误统称“任务失败”；
- 不在 AI Draft 未经用户确认时自动投递；
- 不实现 PDF / Word；
- 不实现原文精确时间点跳转（MVP+1）。

## Execution Entry Points

- MOB-016 建立的 `src/shiyan/` 路由 / 页面壳
- MOB-017 的 RecordingAdapter 与 local capture recovery
- `src/api/` 的客户端层风格
- `src/store/` 的 Zustand 约定
- `src/theme/` 与现有分享系统能力

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test -- --runInBand`
- 上传失败 -> 重试不丢本地录音；
- STT / LLM 阶段错误分别显示并只重试对应阶段；
- Transcript 只读；
- AI 调整后再进入人工编辑；
- Final Draft 不被后台刷新覆盖；
- 历史任务真实链接展示 / 无链接状态；
- Markdown / 系统分享内容来自当前 Final Draft。

## 验收

1. 用户可从本地录音确认页提交真实 CaptureTask；
2. 上传和处理阶段状态与 Cloud 事实一致；
3. 任一阶段失败都能看出失败位置并正确重试；
4. Transcript 可查看但不可直接修改；
5. AI 可在最终人工编辑前调整内容；
6. Final Draft 由用户最终控制；
7. 历史任务能打开真实 Destination URL；
8. Markdown / 系统分享可用。

## 非目标

- 不做 GitHub 写入实现；
- 不做 Notion；
- 不做 PDF / Word；
- 不做 transcript -> 音频时间点定位；
- 不做 Desktop 页面。

## 并行边界

MOB-021 在 MOB-020 冻结内容合同后可与 MOB-022 并行。MOB-021 主要拥有 Mobile ShiyanClient、任务状态 UI、Transcript / Draft / Final Draft、历史任务与系统分享；不得改 Cloud Destination 实现。