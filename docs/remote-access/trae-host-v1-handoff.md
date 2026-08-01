# Trae 交接：接入 Mira Desktop Host V1

## 0. 文档用途

这是一份可直接交给 Trae 的施工提示词，同时记录 `uichat-mira-mobile` 当前代码真相、桌面 Host V1 的协议来源、施工顺序和验收边界。

本任务只修改移动端仓库：

```text
dangjingtao/uichat-mira-mobile
目标分支：dev
```

桌面端协议实现位于：

```text
仓库：dangjingtao/uichat-mira
分支：feature/tailscale-remote-access-runtime
协议文档：docs/remote-access/mobile-host-protocol-v1.md
配对与 manifest 路由：server/src/routes/remote-access.ts
设备鉴权：server/src/services/remote-device-auth.service.ts
聊天入口：server/src/routes/proxy-provider/chat.routes.ts
SSE 事件：server/src/services/chat-stream-events.ts
```

施工前必须重新回读这些文件，以桌面端实际代码为准，不根据本文件猜测字段。

---

## 1. 当前移动端代码真相

当前 `dev` 已有：

- React Native 0.86、React 19、TypeScript。
- React Navigation 页面壳。
- Zustand `hostStore`。
- `SessionListScreen`、`ChatScreen`、`HostConfigScreen` 和设置页面。
- Android / iOS CI、Android Debug APK、签名 Release 基建和 R2 发布链。
- 一套已成形的移动端视觉与交互原型。

但真实 Host 尚未接入：

1. `src/api/mockMiraHost.ts` 是当前唯一实现，所有会话和消息来自内存 Mock。
2. `HostConfigScreen` 通过固定延时模拟连接，手工填写的 token 没有经过真实验证，也没有安全持久化。
3. `src/api/miraHost.ts` 中的 `Session/createSession/deleteSession/renameSession` 是移动端自行假设的接口，不等于桌面 Host V1。
4. 桌面 Host V1 使用 `Thread`，当前 allowlist 不开放创建、删除、重命名 Thread。
5. `ChatScreen` 的“停止”只停止本地读取循环，不会取消后端任务。
6. 多处 `catch {}` 会吞掉真实错误，不能直接沿用到联网路径。
7. 当前 `Date` 字段由 Mock 直接创建；真实 JSON 返回字符串，必须在 Adapter 边界解析。
8. 当前聊天流只是逐字 Mock；真实 Host 返回 `POST /proxy/chat/default` 的 SSE 事件流。

结论：页面壳可以保留，但网络、协议、凭据和状态层需要按 Host V1 替换。不要重画 UI，不要继续扩充 Mock API。

---

## 2. Host V1 已确定的边界

### 2.1 Tailscale 的职责

Tailscale 只负责：

- 手机与桌面 Host 的 Tailnet 可达。
- MagicDNS / HTTPS。
- 节点层网络身份。

Mira 自己仍负责：

- 一次性配对。
- 独立设备凭证。
- 用户归属。
- scope。
- Agent 审批。
- 设备撤销。

同处一个 Tailnet 不代表已经获得 Mira 权限。

### 2.2 配对 public routes

Mobile 可以无设备凭证调用：

```text
POST /remote/pairing/claim
POST /remote/pairing/claims/:claimId/poll
```

Claim 请求：

```json
{
  "challengeId": "...",
  "code": "ABCDEFGH",
  "deviceName": "Mira Mobile",
  "platform": "android",
  "publicKey": "optional",
  "requestedScopes": [
    "threads:read",
    "messages:read",
    "messages:write",
    "agent:read",
    "agent:approve",
    "agent:control",
    "artifacts:read"
  ]
}
```

Claim 成功后返回：

```text
claimId
pollToken
status=claimed
expiresAt
```

轮询请求：

```json
{
  "pollToken": "..."
}
```

桌面批准后，完整 `device credential` 只返回一次。移动端领取成功后必须立即写入平台安全存储；不得写入 Zustand 持久化、AsyncStorage、日志、错误上报或截图调试信息。

### 2.3 配对 URI

桌面端提供：

```text
mira://pair?host=<hostUrl>&challenge=<challengeId>&code=<code>&version=1
```

V1 移动端至少支持粘贴完整 URI；也可以保留手工填写 Host、Challenge ID 和配对码的高级入口。

本任务不要求相机扫码，不要只为二维码引入相机依赖。

### 2.4 设备鉴权

配对完成后使用：

```http
Authorization: Bearer <device credential>
```

先调用：

```text
GET /remote/v1/manifest
```

manifest 是当前设备真实能力来源。不要根据 UI 或本地默认值假设 scope。

### 2.5 V1 allowlist

设备凭证只允许：

```text
GET  /remote/v1/manifest
GET  /threads
GET  /threads/:id
GET  /threads/:id/messages
POST /proxy/chat/default
GET  /agent/runs/:runId
POST /agent/runs/:runId/approve
POST /agent/runs/:runId/reject
POST /agent/runs/:runId/cancel
GET  /threads/:id/media/:mediaId/content
```

因此 V1 不做：

- 创建 Thread。
- 删除 Thread。
- 重命名 Thread。
- Provider / 模型配置。
- Knowledge Base 管理。
- Role 编辑。
- Terminal 或任意非 allowlist 工具入口。

现有新建、删除、重命名交互不得继续调用 Mock 假装成功。应在真实模式下隐藏、禁用或明确标记“当前 Host V1 未开放”，同时保留 Mock 开发模式的独立能力。

### 2.6 聊天请求

真实发送入口：

```text
POST /proxy/chat/default
Content-Type: application/json
Authorization: Bearer <device credential>
```

Body 以桌面端 `ProviderChatBody` 为准，核心字段：

```json
{
  "id": "<threadId>",
  "messageId": "<stable-client-message-id>",
  "messages": [
    {
      "role": "user",
      "content": "用户消息"
    }
  ]
}
```

不得重复发送同一个用户消息。每次发送先生成稳定 `messageId`，断线恢复时通过回读消息确认是否已持久化，而不是换新 ID 重发。

### 2.7 SSE 事件

Host 返回 `text/event-stream`，每帧格式：

```text
data: <JSON>\n\n
```

终止标记：

```text
data: [DONE]\n\n
```

至少解析：

```text
start
text-start
text-delta       -> data.delta
text-end
data-tool-event
data-execution-node
finish            -> finishReason = stop | error
error             -> errorText
[DONE]
```

不要把整个响应读完后再一次性显示。必须先做 Android 真机或模拟器的 POST 流式读取 spike，证明增量事件可达。

不要盲目引入只支持 GET 的 EventSource 实现。若 React Native 当前 fetch 不能稳定增量读取，建立 `ChatStreamTransport` 抽象，再选择一个只解决 POST 流读取的轻量方案，并在 PR 中说明兼容性、体积和许可证。

### 2.8 重连

V1 没有 durable `eventCursor`，也没有 WebSocket 事件日志。

重连只能做 canonical state replay：

1. 重新读取 manifest，确认 credential 未撤销。
2. 重新读取 Thread 列表。
3. 打开 Thread 后重新读取消息。
4. 若 Assistant metadata 中存在 `agent.runId`，再读取 Agent Run。
5. 只有 Run 仍为 `waiting_approval` 且 approval ID 未变化时，才能显示原审批按钮。

不得宣称“无损续传”。

---

## 3. 建议代码目录

保留现有页面，新增清晰的协议与运行时边界：

```text
src/
├── api/
│   ├── miraHost.ts                 # 面向页面的稳定接口，按 Host V1 修订
│   ├── mockMiraHost.ts             # 仅开发模式
│   └── realMiraHost.ts             # 真实 Adapter，组合下列模块
├── remote/
│   ├── protocol/
│   │   ├── types.ts                # Host V1 DTO，不直接复用页面 ViewModel
│   │   ├── parsers.ts              # success envelope、日期、未知字段校验
│   │   └── sse.ts                  # 增量帧解析器
│   ├── transport/
│   │   ├── httpClient.ts           # timeout、Authorization、错误映射
│   │   └── chatStreamTransport.ts  # POST 流抽象与取消
│   ├── pairing/
│   │   ├── pairingUri.ts           # mira://pair 解析
│   │   └── pairingClient.ts        # claim / poll
│   ├── auth/
│   │   └── credentialStore.ts      # 平台安全存储 Adapter
│   ├── host/
│   │   ├── manifest.ts
│   │   ├── threadClient.ts
│   │   └── agentClient.ts
│   └── errors.ts
├── store/
│   ├── hostStore.ts                # 非敏感连接状态
│   └── pairingStore.ts             # 临时 UI 状态，不保存 credential 明文
└── screens/
    ├── HostConfigScreen.tsx        # 改为真实配对 / 已连接状态
    ├── SessionListScreen.tsx       # 真实 Thread 列表
    └── ChatScreen.tsx              # 真实 Message + SSE + Agent 状态
```

目录可以按现有工程习惯微调，但禁止把配对、HTTP、SSE、凭据、页面状态全部塞进一个 Screen 或 Store。

---

## 4. 施工顺序

### T1：协议类型与解析

- 根据 Host 源码定义 DTO。
- 统一解析 `{ success, data, message, timestamp }`。
- 将服务端日期字符串转为页面 ViewModel 的 `Date`。
- 未知或不合法响应必须抛出结构化错误，不能静默返回空数组。
- 修订 `MiraHostApi`，移除真实 V1 不支持的写操作，或把这些操作明确标记为 capability-gated。

验收：纯函数单测覆盖合法响应、错误 envelope、缺失字段和日期解析。

### T2：安全凭据存储

实现 `CredentialStore`：

```text
saveHostCredential(hostUrl, credential)
readHostCredential()
clearHostCredential()
```

要求：

- Android Keystore / iOS Keychain。
- 不允许明文 AsyncStorage。
- 不允许 credential 进入日志或 Zustand 持久化。
- 若需要新增依赖，先验证 React Native 0.86 兼容性；优先使用单一、成熟、轻量的 Keychain/Keystore 方案，并记录引入理由。

验收：Adapter 单测；断开连接后凭据被清除。

### T3：真实配对页

改造 `HostConfigScreen`：

- 支持粘贴 `mira://pair`。
- 解析 host、challenge、code、version。
- 调用 claim。
- 显示“等待桌面确认”。
- 使用 `pollToken` 轮询；后台或页面卸载时停止轮询。
- approved 且收到 credential 后写安全存储。
- 调用 manifest 做最终验证。
- 成功后进入已连接状态。
- rejected、expired、错误 code、Host 不可达均显示可操作错误。

不要在本地自动批准，不要把 pollToken 当长期凭据。

### T4：连接恢复与断开

应用启动时：

```text
读取安全凭据
→ GET manifest
→ 成功：connected
→ 401/403：清除失效凭据并进入 disconnected
→ 网络错误：offline/reconnecting，不删除凭据
```

监听 AppState 与网络恢复时机，但不要做无限快速重试。采用有上限的指数退避，并允许用户手工重试。

`hostStore` 只保存：

- hostUrl。
- connectionStatus。
- manifest 的非敏感摘要。
- 最后错误。

### T5：真实 Thread 与 Message

- `GET /threads` 映射到移动端会话列表。
- `GET /threads/:id/messages` 映射到聊天页。
- 保留现有页面视觉，替换数据源。
- 不吞错误。
- 空状态、离线状态、无 `threads:read/messages:read` scope 必须区分。
- 真实模式禁用当前未开放的 create / rename / delete。

### T6：真实 SSE Chat

- 先做独立 POST 流 spike。
- `ChatScreen` 发送稳定 `messageId`。
- 增量处理 `text-delta`。
- `finishReason=error` 或 `error` 事件进入失败态。
- `data-tool-event` 和 `data-execution-node` 先保存为结构化运行状态；V1 UI 可只显示简洁状态，不必复制桌面 Trace 面板。
- Stop 必须通过 AbortController 取消当前 HTTP 读取；同时明确这不等于已取消后端 Agent。
- 真正的 Agent 取消使用 `/agent/runs/:runId/cancel`。

### T7：Agent 状态与审批

当消息 metadata 或流事件暴露 runId 时：

- `GET /agent/runs/:runId`。
- waiting_approval 时展示最小审批卡。
- approve / reject 使用现有 Host route。
- cancel 使用 control scope。
- scope 不足时只读展示，不提供按钮。
- 审批后回读 Run，不在本地猜测结果。

### T8：Mock 与真实模式隔离

- 保留 Mock 供 Story / Jest / 无 Host 开发。
- 用一个明确的 composition root 选择 Mock 或 Real Client。
- 页面不得直接 import `mockMiraHost`。
- 生产构建默认 Real Client。
- Mock 数据不得进入真实连接路径。

### T9：验证

必须执行并如实记录：

```sh
npm run typecheck
npm run lint
npm test
```

至少补充：

- pairing URI 解析。
- claim / poll 状态转换。
- credential 只交给安全存储一次。
- 401/403 清凭据，网络失败不清凭据。
- manifest scope gate。
- Thread / Message DTO 解析。
- SSE 分帧、半帧、连续多帧、`[DONE]`、error。
- 稳定 messageId 与重试防重复。
- Agent approval / cancel 的 scope gate。

Android 必须进行一次真实 Host 联调；iOS 无法实机验证时必须明确说明，不能写“已验证”。

---

## 5. 明确非目标

本轮不要做：

- 重写导航与视觉体系。
- Provider、模型、角色、知识库管理。
- 新建 / 删除 /重命名 Thread 的假实现。
- WebSocket 或 eventCursor。
- 后台常驻 Agent。
- 推送通知。
- 相机扫码。
- 文件、相册、语音输入。
- 修改桌面仓库。
- 为“完成度”生成大量空页面。

发现 Host 契约缺字段或行为不明确时，记录具体请求/响应与影响，停止猜测，不得自行扩展服务端协议。

---

## 6. 完成定义

只有以下闭环真实跑通才算完成：

```text
手机加入同一 Tailnet
→ 粘贴桌面 pairing URI
→ claim
→ 桌面明确批准
→ mobile 领取一次性 credential
→ credential 写入安全存储
→ manifest 验证
→ 读取真实 Thread
→ 打开真实 Message
→ 发送消息
→ 增量显示真实 SSE 回复
→ 应用短暂后台/断网后通过 canonical state replay 恢复
→ 用户主动断开并清除凭据
```

同时满足：

- 没有秘密进入源码、日志或普通 Store。
- 没有使用 Mock 冒充联网成功。
- 没有开放 Host allowlist 之外的能力。
- 测试与构建结果如实记录。
- PR 包含协议影响、Android/iOS 验证范围、截图或录屏、已知限制。

---

## 7. 可直接交给 Trae 的提示词

```text
你现在接手 dangjingtao/uichat-mira-mobile 的 Mira Desktop Host V1 接入。

工作仓库：dangjingtao/uichat-mira-mobile
目标基线：dev

开始前必须阅读：
1. 根目录 AGENTS.md
2. README.md
3. docs/remote-access/trae-host-v1-handoff.md
4. 当前 src/api、src/store、HostConfigScreen、SessionListScreen、ChatScreen

协议来源只认桌面仓库真实实现：
仓库 dangjingtao/uichat-mira
分支 feature/tailscale-remote-access-runtime
重点文件：
- docs/remote-access/mobile-host-protocol-v1.md
- server/src/routes/remote-access.ts
- server/src/services/remote-device-auth.service.ts
- server/src/routes/proxy-provider/chat.routes.ts
- server/src/routes/proxy-provider/types.ts
- server/src/services/chat-stream-events.ts

当前移动端 UI 已经存在，但数据路径仍是 Mock。你的目标不是重画页面，而是打通以下真实闭环：
配对 URI -> claim -> 等待桌面批准 -> poll 领取一次性 device credential -> 平台安全存储 -> manifest -> Thread 列表 -> Message -> POST SSE Chat -> Agent 状态/审批 -> canonical state replay -> 断开并清除凭据。

关键约束：
- 不修改桌面仓库。
- 不猜 API、字段、事件名和错误码。
- 不在移动端复制 Agent、Provider 或 Harness。
- 不使用 AsyncStorage 或普通 Zustand 持久化保存 credential。
- 页面不得直接调用 HTTP/SSE。
- 生产代码不得直接 import mockMiraHost。
- Host V1 未开放 create/delete/rename Thread，真实模式必须禁用这些 Mock 能力。
- V1 没有 eventCursor，不得声称无损续传。
- SSE 是 POST /proxy/chat/default，不要盲目采用只支持 GET 的 EventSource。
- 先做 Android POST 流式读取 spike，再完成 ChatScreen 接入。
- 所有错误必须进入结构化状态，禁止 catch {} 吞错。
- 只做当前闭环，不做相机扫码、推送、文件、语音、Provider/KB 管理或大规模 UI 重构。

施工顺序严格按文档 T1-T9：
协议解析 -> 安全存储 -> 配对 -> 启动恢复 -> Thread/Message -> SSE -> Agent -> Mock 隔离 -> 验证。

先检查 dev 最新状态和工作区；从最新 dev 创建合规工作分支，不直接在 dev 长期施工。每一步小提交。完成后运行：
npm run typecheck
npm run lint
npm test
并完成至少一次 Android 与真实 Mira Host 的联调。

输出要求：
1. 先汇报现状、风险和计划，不要立刻整仓重写。
2. 每个阶段说明修改文件与验证结果。
3. 最终汇报真实通过项、环境阻塞、未验证平台和剩余协议问题。
4. 命令失败或无法实机验证时必须明确说明，禁止伪称完成。
```
