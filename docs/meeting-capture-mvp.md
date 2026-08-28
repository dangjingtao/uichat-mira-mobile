# Mira Mobile 会议采集 MVP 设计

状态：设计草案，未进入施工

日期：2026-08-28

目标分支：`dev`

## 1. 背景

Mira Mobile 当前已经具备稳定的移动端壳层、远程连接与 API client 分层。下一步希望验证一个新的生产力入口：用户在手机端直接录制会议，将录音交给受控的云端流水线完成语音转文字、结构化整理，并最终沉淀为 GitHub Markdown 文档。

本方案的核心不是做完整会议助手，而是验证一条最小、可追踪、可替换 Provider 的工作信息采集链路。

## 2. MVP 目标

首版只验证以下闭环：

```text
Mira Mobile 录音
  -> 上传 R2
  -> Cloudflare Worker / Workflow 调度
  -> STT
  -> LLM 整理
  -> GitHub Markdown
  -> Mobile 展示处理结果
```

MVP 以一段约 40 分钟的真实会议录音为主要验收样本。

### 2.1 成功标准

- Mobile 可以开始、暂停、继续、结束一次录音。
- 录音先可靠保存到本机，再上传到 R2。
- 上传失败可重试，不要求用户重新录音。
- STT 可以把完整录音转成可读 transcript。
- LLM 可以基于 transcript 生成结构化会议文档。
- GitHub 中生成一篇 Markdown 草稿。
- Mobile 可以看到本次任务状态，以及最终文档地址或失败原因。
- 任一步失败时，不丢失原始录音和已经完成的中间结果。

## 3. 明确不做

MVP 不包含以下能力：

- Speaker diarization / 多人说话人区分。
- Speaker identification / 自动识别具体是谁。
- 实时字幕或边录边转写。
- 自动创建 PRD、Issue 或任务卡。
- 自动识别需求变更并修改现有文档。
- 自动派发负责人。
- Desktop / Host 参与录音处理。
- 跨设备录音同步。
- 完整会议管理系统、日历集成或会议机器人。

这些能力只有在 MVP 验证通过后再单独设计。

## 4. 架构原则

### 4.1 Mobile 只负责采集与状态

Mobile 不承担长音频 STT、LLM 整理或 GitHub 写入。

Mobile 负责：

- 录音。
- 本地持久化。
- 获取上传凭证。
- 直传 R2。
- 查询任务状态。
- 展示结果。

这样可以避免长任务占用 App 生命周期，也避免把第三方密钥放进客户端。

### 4.2 大文件不经 Worker 中转

录音文件由 Mobile 直接上传 R2。Worker 只签发上传信息、创建处理任务、更新状态和调度后续步骤。

不采用：

```text
Mobile -> Worker -> R2
```

采用：

```text
Mobile -> R2
           |
           v
      Worker / Workflow
```

### 4.3 STT Provider 必须可替换

首版默认使用 Cloudflare Workers AI Whisper，但业务层不得把 Cloudflare Whisper 写死。

建议合同：

```ts
export interface STTProvider {
  transcribe(input: STTInput): Promise<TranscriptResult>;
}
```

首版实现：

```text
CloudflareWhisperProvider
```

未来可以增加：

```text
DeepgramProvider
AssemblyAIProvider
VolcanoProvider
LocalWhisperProvider
```

Mobile 不感知具体 STT Provider。

## 5. 数据流

```text
[1] User starts recording
        |
        v
[2] Mobile records locally
        |
        v
[3] User finishes recording
        |
        v
[4] Mobile creates capture job
        |
        +--> Worker returns jobId + upload target
        |
        v
[5] Mobile uploads audio directly to R2
        |
        v
[6] R2 object ready
        |
        v
[7] Workflow starts
        |
        +--> STT
        |
        +--> normalize transcript
        |
        +--> LLM summarize
        |
        +--> render Markdown
        |
        +--> GitHub write
        |
        v
[8] Job completed
        |
        v
[9] Mobile shows result
```

## 6. Mobile 设计

### 6.1 首版入口

首版建议作为独立的“会议采集”能力进入，不嵌进聊天输入框，也不依赖某个 Thread。

原因：

- 录音任务生命周期明显长于一条 Chat Message。
- 录音属于工作采集，不应伪装成普通聊天附件。
- 后续可以自然扩展成工作采集入口，而不污染聊天协议。

具体入口位置在施工前再结合当前导航确认，但本设计要求其业务状态独立于 Chat Thread。

### 6.2 录音状态

建议最小状态：

```ts
type RecordingState =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'saved'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed';
```

本地记录至少保留：

```ts
interface LocalCapture {
  id: string;
  localUri: string;
  createdAt: string;
  durationMs: number;
  state: RecordingState;
  jobId?: string;
  error?: string;
}
```

### 6.3 生命周期要求

- 用户结束录音后，先完成本地文件落盘，再启动上传。
- App 进入后台不得立即删除录音。
- 上传失败时保留本地文件。
- 服务端返回 `completed` 后，首版仍可保留本地文件，清理策略后续再定。

## 7. Cloudflare 服务边界

建议把云端处理视为独立服务，不与 Mira Desktop Remote Host 合并。

首版服务职责：

- 创建 Capture Job。
- 签发 R2 上传目标。
- 接收或监听上传完成事件。
- 驱动 STT。
- 驱动 LLM 整理。
- 写入 GitHub。
- 保存任务状态。
- 向 Mobile 返回最终结果。

### 7.1 Job 状态

建议统一为：

```text
created
uploading
uploaded
transcribing
summarizing
publishing
completed
failed
```

失败状态需附带：

```ts
interface JobFailure {
  stage: 'upload' | 'stt' | 'summary' | 'github';
  code: string;
  message: string;
  retryable: boolean;
}
```

## 8. 建议 API 合同

具体域名与鉴权方式施工时确定，首版合同可以保持极小。

### 8.1 创建任务

```http
POST /v1/captures
```

请求：

```json
{
  "filename": "meeting-2026-08-28.m4a",
  "contentType": "audio/mp4",
  "durationMs": 2400000
}
```

响应：

```json
{
  "jobId": "cap_xxx",
  "upload": {
    "url": "...",
    "method": "PUT"
  }
}
```

### 8.2 查询状态

```http
GET /v1/captures/:jobId
```

处理中：

```json
{
  "jobId": "cap_xxx",
  "status": "transcribing"
}
```

完成：

```json
{
  "jobId": "cap_xxx",
  "status": "completed",
  "result": {
    "documentUrl": "https://github.com/...",
    "path": "meeting-inbox/2026-08-28-product-meeting.md"
  }
}
```

## 9. STT

### 9.1 首版默认

默认 Provider：Cloudflare Workers AI Whisper。

首版只要求：

- 中文普通会议可读。
- 支持约 40 分钟录音。
- 长音频可以安全切片处理。
- 片段最终按时间顺序合并。

### 9.2 工作词典

为了提升内部术语识别率，首版保留一个静态 `initial_prompt` / glossary 注入能力。

例如：

```text
Mira, Mira Mobile, PRD, dev, task card, 泡泡值, 兑换码
```

首版不做词典 UI。词典可以由服务端配置维护。

## 10. Transcript 中间产物

原始 STT 结果和整理后的 transcript 应视为中间产物，不直接覆盖。

建议至少区分：

```text
raw transcript
normalized transcript
summary document
```

如果后续发现 LLM 整理错误，可以基于原 transcript 重跑，不必重新 STT。

## 11. LLM 整理合同

首版输出固定结构，避免模型自由发挥成一篇散文。

```markdown
# 会议标题

- 时间：
- 来源：Mira Mobile Recording
- 状态：draft

## 摘要

## 关键结论

## 决策

## 新需求 / 变化

## TODO

## 风险与待确认

## 原始记录说明
```

LLM 规则：

- 不确定的负责人不得猜测。
- 不确定的截止时间不得补全。
- 事实、推断、建议尽量分开。
- 没有的信息保持空缺或明确写“未确认”。
- 首版不自动创建 Issue / Task Card。

## 12. GitHub 输出

首版不直接写正式 PRD 或任务目录。

默认进入：

```text
meeting-inbox/
```

建议路径：

```text
meeting-inbox/YYYY-MM-DD-<slug>.md
```

Front Matter 可选：

```yaml
---
status: draft
source: mira-mobile-recording
capture_id: cap_xxx
recorded_at: 2026-08-28T14:30:00+08:00
---
```

GitHub 仓库、目标分支和目录均应作为服务端配置，不写死在 Mobile。

## 13. 安全边界

- GitHub Token 不进入 Mobile。
- STT / LLM Provider Key 不进入 Mobile。
- R2 写权限不长期暴露给 Mobile，只使用短期上传目标。
- Mobile 只能读取自己创建的 Capture Job。
- 原始录音默认私有，不公开生成 URL。
- 日志不得记录完整 Token、录音二进制或完整敏感 transcript。

## 14. 重试与失败恢复

### 上传失败

- 本地录音继续保留。
- 用户可重新上传。

### STT 失败

- R2 原始录音继续保留。
- Workflow 从 STT 阶段重试。

### LLM 整理失败

- 不重新执行 STT。
- 基于 transcript 重试。

### GitHub 写入失败

- 不重新执行 STT / LLM。
- 只重试 publish 阶段。

MVP 的核心要求是“阶段失败不倒退”。

## 15. 可观测性

首版最少记录：

```text
jobId
capture duration
file size
upload latency
STT provider
STT latency
LLM provider/model
LLM latency
GitHub publish latency
failure stage
```

不要求首版提供复杂 Debug UI，但服务端必须留下可定位一次失败任务的基本日志。

## 16. MVP 任务拆分建议

当前只做设计，不自动进入任务台账。后续若批准施工，建议拆为 4 张任务卡：

### A. Mobile Recording

- 录音权限。
- 本地录音。
- 暂停 / 继续 / 结束。
- 本地 Capture 状态。

### B. Upload & Job Client

- 创建 Capture Job。
- R2 直传。
- 上传重试。
- Job 状态查询。

### C. CF Processing Pipeline

- R2 / Job 状态。
- STT Provider abstraction。
- Cloudflare Whisper 实现。
- Transcript normalization。
- LLM summary。

### D. GitHub Publish & End-to-End Acceptance

- Markdown renderer。
- GitHub draft 写入。
- Mobile 完成态。
- 40 分钟真实录音端到端烟测。

A 与 C 在合同冻结后可以并行；B 依赖最小 Job API；D 依赖 B/C。

## 17. MVP 验收用例

### E2E-01 正常 40 分钟会议

Given：Mobile 有麦克风权限且网络可用。

When：用户录制约 40 分钟会议并结束。

Then：

- 本地录音存在。
- R2 上传成功。
- Job 完成 STT 与整理。
- GitHub `meeting-inbox/` 出现 Markdown。
- Mobile 显示完成状态和文档入口。

### E2E-02 上传中断

- 录音不丢失。
- 可重新上传。
- 不要求重新录音。

### E2E-03 STT 失败

- 原始录音仍存在于 R2。
- Job 可从 STT 阶段重试。

### E2E-04 GitHub 失败

- transcript 和 summary 保留。
- 仅重新 publish。

### E2E-05 内部术语

使用包含 Mira / PRD / dev 等词汇的样本，检查 glossary / initial prompt 是否明显减少错误转写。

## 18. 后续能力，但不进入 MVP

只有 MVP 通过后再评估：

1. Speaker diarization。
2. 会后人工映射 Speaker A/B/C 到具体人员。
3. 实时转写。
4. 自动抽取需求变更。
5. 自动生成 PRD / Task Card。
6. 对比历史会议承诺与未决事项。
7. Mira Desktop / Mobile 联合工作台。
8. 本地 Whisper 或其它 Provider fallback。

## 19. 当前设计结论

首版采用“Mobile 采集、R2 保存、Cloudflare 编排、STT/LLM 可替换、GitHub 草稿沉淀”的边界。

它不修改现有 Chat Thread 合同，也不依赖 Desktop / Host 承担新职责。

MVP 只证明一件事：

> 用户结束一次真实会议后，Mira 可以可靠地把这段声音转成一篇可审阅、可追踪、可继续工作的 GitHub 文档。
