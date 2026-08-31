# 拾言（Shiyan）MVP 技术设计

状态：技术设计基线，可进入任务拆分

初版日期：2026-08-29

最近核对：2026-08-31

唯一真相目录：`docs/shiyan/`

关联文档：

- 产品基线：[`PRD.md`](./PRD.md)
- 跨仓库治理：[`README.md`](./README.md)
- Dev 云环境状态：[`DEV_CLOUD_STATE.md`](./DEV_CLOUD_STATE.md)

> 本文负责回答“如何稳定、低成本、可调试地实现 PRD”。若本文与 PRD 冲突，以 PRD 为准；若实现需要改变产品行为或跨仓库合同，先更新 Mobile 的 `docs/shiyan/`，再修改下游仓库。

## 1. 技术目标

MVP 优先级固定为：

1. 稳定性
2. 落地成本
3. Debug 成本
4. 性能与扩展性

首版只服务一条真实闭环：

```text
Mobile 本地录音
  -> 用户确认标题 / 场景
  -> 创建云端 CaptureTask
  -> 直传 R2
  -> 后台 STT
  -> LLM 整理
  -> Mobile 回显 / 用户最终编辑
  -> GitHub 投递
```

不为了未来扩展提前引入复杂微服务、消息总线、实时协作或多租户平台。

## 2. 当前 Mobile 工程事实

当前 `dev` 的工程约束：

- React Native `0.86.2`，非 Expo。
- 已使用 React Navigation Native Stack。
- 已使用 Zustand。
- 已有 `MiraSecureCredentialStore` 原生安全存储能力。
- 已有 `localKeyValueStore`，可保存设备级轻量持久状态。
- Drawer 已存在“插件”分类，但当前只是 UI 占位，没有真实插件入口。
- iOS 当前只配置 Camera 权限，拾言需要新增 Microphone 权限；Android 同样需要 `RECORD_AUDIO`。
- 当前没有录音依赖。

因此拾言应作为独立功能域接入，不修改 Chat / Remote Host 主链。

## 3. 总体架构

```text
┌──────────────────────────┐
│ Mira Mobile              │
│                          │
│ Shiyan Plugin UI         │
│ RecordingAdapter         │
│ Local Capture Recovery   │
│ ShiyanClient             │
└─────────────┬────────────┘
              │ HTTPS
              ▼
┌──────────────────────────┐
│ shiyan-api Worker        │  public
│                          │
│ device auth              │
│ task API                 │
│ upload grant             │
│ D1 / R2 orchestration    │
│ Workflow trigger         │
│ Destination coordination │
└──────┬───────────┬───────┘
       │           │
       │           ├──────────────► D1
       │           │                task / stage / transcript / draft / delivery
       │           │
       │           └──────────────► R2
       │                            audio / raw provider artifacts
       │
       ▼
┌──────────────────────────┐
│ Shiyan Workflow          │
│                          │
│ verify asset             │
│ STT                      │
│ persist transcript       │
│ organize                 │
│ persist draft            │
└──────┬───────────────────┘
       │ Service Binding
       ▼
┌──────────────────────────┐
│ shiyan-llm Worker        │  private
│                          │
│ provider keys            │
│ provider adapter         │
│ primary + fallback       │
│ structured output check  │
│ latency / usage metadata │
└──────┬───────────────────┘
       │
       ▼
 Any OpenAI-compatible provider

Final Draft
   │
   └────► Destination Adapter ───► GitHub（MVP）/ Notion（next）
```

## 4. 三仓职责

### 4.1 `uichat-mira-mobile`

唯一真相与首发客户端。

负责：

- `docs/shiyan/` 产品、技术与跨仓库合同真相。
- 插件入口与页面。
- 本地录音与恢复。
- 云端任务客户端。
- Transcript / Draft 回显。
- 用户最终编辑与投递操作。

不负责：

- STT 执行。
- LLM Provider Key。
- GitHub PAT。
- 云端事实数据。

### 4.2 `mira-shiyan-cloud`

只实现 Mobile canonical truth。

首版只允许两个 Worker：

- `shiyan-api`：产品业务边界。
- `shiyan-llm`：轻量 LLM 服务层。

另包含：

- Workflow。
- D1 migrations。
- R2 / STT / Destination adapters。
- contract / integration tests。

MVP 不再拆第三个业务 Worker；只有出现明确的资源隔离或独立扩缩容理由才允许拆分。

### 4.3 `mira-shiyan`

默认 GitHub Destination。

只保存用户确认后投递的 Markdown 与 Git 历史，不承担任务、Transcript、Draft 或配置真相。

## 5. Mobile 设计

### 5.1 插件入口

现有 Drawer 的“插件”分类从占位升级为真实入口。

建议路由层级：

```text
Plugins
  -> ShiyanHome
      -> Capture
      -> Confirm
      -> TaskDetail / Review
      -> History
      -> SceneConfig
```

具体组件命名可在施工时调整，但不得把拾言页面塞入 Chat Thread 层级。

### 5.2 Local-first 录音

MVP 不要求开始录音时网络可用。

因此：

1. 开始录音时先创建本地 `LocalCapture`。
2. 录音文件与最小恢复元数据必须本地落盘 / 持久化。
3. 用户结束录音后确认标题与场景。
4. 用户点击提交时才创建云端 `CaptureTask`。
5. 云端 task 创建成功后，将 `localCaptureId -> taskId` 绑定并开始上传。
6. 上传和后续处理失败都不得删除本地录音。
7. 云端确认接收且达到本地清理条件后，才允许清理本地副本。

这样弱网、离线、App 重启不会阻塞会议采集，也不会出现“服务端 Task 存在但录音根本没完成”的大量脏记录。

### 5.3 本地持久状态

复用现有 `localKeyValueStore` 保存轻量恢复元数据，不为了 MVP 再引入一套本地数据库。

本地至少需要保存：

- `localCaptureId`
- 本地音频 URI
- 开始 / 结束时间
- 录音时长
- 标题草稿
- scene id
- cloud task id（若已创建）
- upload state

音频内容本身由录音模块输出到应用私有文件目录，不放进 KV。

### 5.4 录音实现边界

定义稳定适配层：

```ts
interface RecordingAdapter {
  start(): Promise<LocalRecording>
  pause(): Promise<void>
  resume(): Promise<void>
  stop(): Promise<CompletedRecording>
  recover(): Promise<RecoverableRecording[]>
}
```

首选实现候选为 `react-native-nitro-sound`：其当前要求 React Native >= 0.79，能覆盖本项目 RN 0.86，并同时支持 iOS / Android。

但录音库属于高风险原生依赖，施工第一步必须先做 Release 真机 smoke：

- Android release 真机连续录制。
- iOS release 真机连续录制。
- 后台 / 前台切换。
- 暂停 / 恢复。
- 40 分钟文件完整性。
- 录音输出可被首选 STT 直接消费。

只有 smoke 通过才锁定具体库；失败时优先替换 `RecordingAdapter` 实现，不修改拾言业务层。

### 5.5 音频格式策略

MVP 的目标是“直接录制为 STT 可消费格式”，不在 Cloudflare Free Worker 中做 FFmpeg 转码。

因此不在跨仓库合同里强行写死容器格式；施工 smoke 按以下顺序选择：

1. 优先使用手机原生、体积较小、Cloudflare Whisper 可直接接受的单声道格式。
2. 如果直接压缩格式兼容性不稳定，回退到可确定处理的 PCM/WAV。
3. 不接受“先录一种格式、云端再重转码”作为 MVP 默认路径。

最终选定格式必须记录在 `mira-shiyan-cloud` 的实现文档与测试样本中。

### 5.6 Mobile 状态显示

UI 不直接消费一个笼统 `task.status`。

客户端需要得到：

- task lifecycle
- current stage
- 各 stage status
- retryable error
- available artifacts

展示规则以“已有产物优先”为原则。例如 GitHub 投递失败时，Review 页面仍能正常显示 Final Draft。

## 6. 云端实现

### 6.1 为什么只有两个 Worker

`shiyan-api` 与 `shiyan-llm` 分开，是因为它们有不同的安全边界：

- API Worker 面向 Mobile / Desktop，拥有业务数据权限。
- LLM Worker 持有多个外部 Provider Key，但不应暴露公网，也不应解释 CaptureTask 业务状态。

两者通过 Cloudflare Service Binding 通信。

Service Binding 不需要公开第二个 Worker，也不会因为拆成两个 Worker额外引入网络跳转；这正好满足“隔离 key，但不要堆微服务”的目标。

### 6.2 `shiyan-api`

职责：

- Shiyan 设备鉴权。
- CaptureTask 创建 / 查询。
- 上传授权。
- 上传完成校验。
- Workflow 启动与重试入口。
- Transcript / Draft / Final Draft 读取与保存。
- Scene 配置。
- Destination 投递。
- History 查询。

不职责：

- 直接接收大音频并转存 R2。
- 持有第三方 LLM Key。
- 把某个 stage error 改写成全局 task failed。

### 6.3 `shiyan-llm`

私有 Worker，只允许 Service Binding 调用。

职责固定为：

- Secrets 管理。
- OpenAI-compatible Provider 适配，协议层使用 AI SDK v6 + `@ai-sdk/openai-compatible`。
- 一个 primary + 可选 fallback；不得在业务合同中绑定具体厂商。
- primary 最小配置为 `LLM_PRIMARY_BASE_URL`、`LLM_PRIMARY_MODEL`、`LLM_PRIMARY_API_KEY`；`LLM_PRIMARY_PROVIDER` 仅作可选观测标签。
- fallback 使用对应 `LLM_FALLBACK_*` 键，整组可不配置。
- 非敏感 endpoint / model 配置使用 Cloudflare Vars，API Key 使用 Cloudflare Secrets；部署保留控制台 Vars，不将凭据写入仓库。
- 结构化输出校验。
- Provider error 归一。
- latency / token / usage 元数据。

MVP 不做：

- 智能模型路由。
- 用户级余额系统。
- 复杂模型市场。
- CaptureTask 状态机。

建议内部合同：

```ts
interface LlmGateway {
  generateStructured(input: OrganizeRequest): Promise<OrganizeResult>
}
```

当前已验证工程事实（2026-08-31）：AI SDK 依赖安装、Cloudflare runtime types、TypeScript、全部拾言测试、`shiyan-api` dry-run、`shiyan-llm` dry-run 与本地 D1 migration 校验均已通过。

当前 dev 的 D1、远端 migration、初始化设备、R2 bucket 与运行时配置状态属于可变环境事实，统一以 [`DEV_CLOUD_STATE.md`](./DEV_CLOUD_STATE.md) 为准。架构设计不再用仓库中的 D1 placeholder 推断“资源未创建”，也不把具体环境 ID 固化为长期架构合同。

错误只允许表达 Provider 层事实，例如：

- `provider_error`
- `rate_limited`
- `timeout`
- `invalid_response`

是否重试、是否 fallback、Task 下一步由业务层决定。

## 7. 异步处理

### 7.1 Workflow，而不是同步 HTTP

上传完成后由 `shiyan-api` 验证 R2 object，再启动 Workflow。

Mobile 不保持长连接等待 STT / LLM。

Workflow 负责：

```text
verify-audio
  -> transcribe
  -> persist-transcript
  -> organize
  -> persist-ai-draft
  -> mark-ready
```

用户最终编辑与 GitHub 投递是人机交互后的独立阶段，不放进自动整理 Workflow。

### 7.2 不在 Workflow state 放大对象

Cloudflare Free Workflow 单 step 非流式结果上限为 1 MiB，且 Free CPU 时间很紧。

因此 Workflow state 只保存：

- task id
- object key
- transcript id
- draft id
- stage result metadata

完整音频、原始 STT JSON、长 Transcript 不通过 step result 链式传递。

### 7.3 STT

默认 Provider：Cloudflare Workers AI `@cf/openai/whisper-large-v3-turbo`。

必须包在：

```ts
interface TranscriptionProvider {
  transcribe(asset: AudioAsset, context: TranscriptionContext): Promise<TranscriptResult>
}
```

要求：

- Provider 可替换。
- 40 分钟真实会议必须通过 smoke。
- 如果长音频需要切片，切片属于 Provider 内部实现细节。
- 禁止把“第 N 个 chunk”暴露成产品 Task stage。
- 禁止无格式意识地切坏音频；切片必须产生模型可解码的有效输入。
- Transcript 最终按稳定顺序合并并持久化。

Cloudflare 当前官方已经提供 Whisper Large v3 Turbo 的长音频 chunking 示例，因此 MVP 优先沿用官方支持路径，而不是自建音频计算服务。

## 8. 数据模型与持久化

### 8.1 D1 是服务端事实数据库

MVP 逻辑实体：

- `devices`
- `scenes`
- `capture_tasks`
- `task_stages`
- `transcripts`
- `transcript_segments`
- `drafts`
- `delivery_records`

具体表名、列名、索引和 migration 由 cloud 实现决定；但语义边界不能改变。

### 8.2 Task 与 Stage

Task 不设置通用 `failed` 终态。

推荐语义：

```text
Task lifecycle:
  active | ready | completed | cancelled

Stage status:
  pending | running | succeeded | failed | skipped
```

同时记录：

- `currentStage`
- `errorCode`
- `errorMessage`
- `retryable`
- `retryCount`
- `startedAt / finishedAt`

UI 的“当前状态”由 lifecycle + current stage + stage status 组合得到。

### 8.3 Transcript

Transcript 是长期一等数据，不作为 Draft 的附属字段。

为避免单行过大并支持未来时间点引用：

- `transcripts` 保存整体元数据。
- `transcript_segments` 保存有序文本片段及可用的时间信息。
- Provider 原始响应可放 R2 归档，不要求长期塞进 D1 单行。

MVP Transcript 只读。

### 8.4 Draft

MVP 只保留当前工作态，不复制 Git：

- AI Draft：AI 当前整理结果。
- Final Draft：用户最终编辑结果。

用户进入 Final Draft 后，后台 AI 不得自动覆盖。

已投递文档的可信版本历史由 Destination 自己承担；GitHub 使用 commit history。

### 8.5 R2

R2 保存：

```text
audio/ephemeral/...
audio/retained/...
provider-raw/...
exports/...
```

默认录音进入 `audio/ephemeral/`，生命周期规则 3 天自动删除。

用户选择“保留原始录音”时，在过期前将对象转移 / 复制到不受 3 天 lifecycle 规则影响的 `audio/retained/`。

录音删除不会删除 Transcript、Draft 或 Delivery Record。

## 9. 上传设计

MVP 采用“录完再传”，不边录边上传。

流程：

1. Mobile 创建 CaptureTask。
2. `shiyan-api` 返回一次性 / 短时效上传授权与 object key。
3. Mobile 直接上传 R2。
4. Mobile 通知 API 上传完成。
5. API 从 R2 校验 object 存在、大小 / metadata 合理。
6. API 启动 Workflow。

大文件不经过业务 Worker 中转。

MVP 不要求断点续传；上传失败允许整文件重试，但绝不要求重新录音。

如果真实弱网测试证明整文件重试不可接受，再单独升级 multipart / resumable，不提前增加首版复杂度。

## 10. 设备身份

MVP 使用独立 Shiyan device credential，不复用 Mira Host 的 Remote credential，也不依赖 Desktop 在线。

复用现有 `MiraSecureCredentialStore` 原生安全存储能力，但使用独立 service name。

云端数据模型必须保留 nullable `userId`，为未来 Mira Account 合并多设备留出空间。

MVP enrollment 允许采用简单的一次性 / 管理员生成注册凭证；不得把长期服务端 secret 硬编码进 App 包。

## 11. Scene 与整理合同

Scene 决定整理方式，Destination 决定送到哪里。

MVP Scene 数据只需要支持 PRD 已确认的：

- name
- organize instruction
- output structure

LLM 请求由 cloud 把 Scene 配置与固定系统约束组合，普通用户不直接控制完整系统 Prompt。

LLM 输出先生成结构化 JSON，再由统一 renderer 生成 Markdown。

不允许 GitHub Adapter、Notion Adapter 各自重新调用 LLM 解释一次内容。

## 12. Destination

### 12.1 Adapter 边界

```ts
interface DestinationAdapter {
  deliver(input: FinalDraft, config: DestinationConfig): Promise<DeliveryResult>
}
```

`DeliveryResult` 至少包含：

- provider
- external id / revision id（如果有）
- canonical URL（如果有）
- timestamp
- result status

### 12.2 GitHub MVP

默认仓库：`dangjingtao/mira-shiyan`。

MVP：

- Fine-grained PAT 只保存在 cloud secret。
- 权限限制在目标仓库 Contents。
- 用户确认 Final Draft 后才写入。
- 文件路径必须稳定可推导，避免重复点击生成多篇重复文档。
- 写入成功保存 commit SHA 与真实文件 URL。
- 重试必须幂等：若目标文件已存在，按当前 SHA 更新，不创建随机重复文件。

Notion 使用同一 Destination Adapter 合同后续接入，不改变 CaptureTask 主模型。

## 13. 错误、重试与幂等

### 13.1 核心原则

任何后续 stage 失败都不能使已成功产物失效。

### 13.2 推荐恢复规则

- Upload 失败：复用本地录音重传。
- STT 失败：只重跑 STT。
- Organize 失败：复用 Transcript，只重跑 LLM。
- Delivery 失败：复用 Final Draft，只重跑 Destination。

### 13.3 幂等键

cloud 对以下动作必须有幂等保护：

- task create / submit
- upload complete
- workflow start
- STT persist
- organize persist
- GitHub deliver

具体实现可以使用 task id + stage version / operation key；不要求在 canonical truth 中固定 HTTP 形式。

## 14. 观测与 Debug

MVP 不需要复杂 APM，但必须做到“一个 task 能查到底”。

所有 cloud 日志至少带：

- `taskId`
- `stage`
- `requestId / workflowInstanceId`
- provider
- duration
- retry count
- normalized error code

禁止在普通日志打印：

- 完整音频内容
- 完整 Transcript
- API Key / PAT
- 完整用户 Final Draft

D1 的 `task_stages` 是产品状态事实；Cloudflare logs 是运行诊断，不允许用日志反推并覆盖 D1 状态。

LLM gateway 额外记录：

- provider / model
- latency
- token / usage（Provider 能提供时）
- fallback 是否发生
- normalized error

## 15. Cloudflare Free Plan 约束

设计按 Free Plan 能跑 MVP 为目标，但不把“永远免费”当产品合同。

截至 2026-08-29，需要特别遵守：

- Workers Free：100,000 requests/day，10 ms CPU / invocation，128 MB memory。
- D1 Free：5M rows read/day、100k rows written/day、5 GB account storage、单库 500 MB。
- Workflows Free：3,000 steps/day，单 invocation 10 ms CPU，单 step 非流式结果 1 MiB。
- R2 支持 lifecycle 自动删除，适合实现 3 天原始录音策略。
- Service Binding 可让 `shiyan-api` 私有调用 `shiyan-llm`，无需公开 LLM Worker。

由此得到的实现约束：

- Worker 只编排，不做本地重转码或大文本 CPU 处理。
- 大对象放 R2 / D1，不塞 Workflow step state。
- 不在一个 HTTP 请求里同步跑完整会议处理。

## 16. Cloud 仓库建议结构

`mira-shiyan-cloud` 首版建议保持单仓：

```text
apps/
  api/
  llm/
packages/
  contracts/
  providers/
  destinations/
workflows/
migrations/
tests/
README.md
```

允许施工根据 Wrangler / workspace 约束微调目录，但不要为了目录美观拆仓库。

## 17. 测试策略

### 17.1 Mobile

- RecordingAdapter 单元 / contract test。
- LocalCapture 恢复测试。
- ShiyanClient parser / error mapping。
- Task 状态 UI 映射测试。
- Android + iOS release 真机录音 smoke。

### 17.2 Cloud

- D1 migration test。
- Task / Stage 状态机 contract test。
- STT Provider fixture test。
- LLM gateway provider mock + fallback test。
- Structured JSON schema validation。
- GitHub Destination 幂等测试。
- Workflow stage recovery test。

### 17.3 端到端

最终必须用一段约 40 分钟真实会议录音验证：

- 本地录音完整。
- 上传成功。
- 5 分钟内产生可编辑 Draft。
- Transcript 可读。
- Final Draft 可编辑。
- GitHub 投递成功并回显真实 URL。
- STT / LLM / GitHub 任一阶段故障时，恢复行为符合 PRD。

## 18. 暂不引入

MVP 不引入：

- Durable Objects。
- Queue（当前 Workflow 足够）。
- Redis / 外部数据库。
- 独立音频转码服务器。
- WebSocket 实时字幕。
- 第三方插件运行沙箱。
- 完整账户 / 组织 / RBAC。
- AI 自动改 Final Draft。
- 自研 Git 版本系统。

当真实使用数据证明现有方案不足时，再增加对应组件。

## 19. 一致性检查

任何拾言施工前后都要按以下顺序检查：

1. `uichat-mira-mobile/docs/shiyan/PRD.md`
2. `uichat-mira-mobile/docs/shiyan/TECHNICAL_DESIGN.md`
3. `uichat-mira-mobile/docs/shiyan/README.md`
4. `uichat-mira-mobile/docs/shiyan/DEV_CLOUD_STATE.md`
5. `mira-shiyan-cloud` 实现与 README
6. `mira-shiyan` Destination 边界

若 cloud 或 Destination 的既有实现与 Mobile canonical truth 冲突，修改下游实现；不得反向把实现现状写成产品事实。

## 20. 外部技术参考

Cloudflare：

- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- D1 pricing / limits: https://developers.cloudflare.com/d1/platform/pricing/
- Workflows pricing / limits: https://developers.cloudflare.com/workflows/reference/pricing/
- R2 lifecycle: https://developers.cloudflare.com/r2/buckets/object-lifecycles/
- Service Bindings: https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/
- Whisper Large v3 Turbo: https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/
- Long audio Whisper example: https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-workers-ai-whisper-with-chunking/

React Native recording candidate：

- react-native-nitro-sound: https://github.com/hyochan/react-native-nitro-sound