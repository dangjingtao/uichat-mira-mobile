# Mira Mobile Relay 接入排期

> 远程连接行为以 [远程连接唯一真相源 V1](remote-connection-canonical-v1.md) 为准；本文只记录实施排期与历史状态。

> 状态：Design contract complete; implementation verification pending
> 最近修订：2026-08-26
> 主站真相源：`dangjingtao/uichat-mira@dev`

## 1. 定位

Relay 是 Mobile 与 Mira Host 之间的 **Transport**，不是新的业务后端。

目标形态：

```text
Mira Mobile
    |
    | RemoteTransport
    |
    ├─ DirectRemoteTransport -> Tailscale Serve HTTPS -> Mira Desktop Host
    |
    └─ RelayRemoteTransport  -> Mira Relay WSS        -> Desktop Relay Connector
                                                   -> localhost Mira Server
```

两条传输共用同一套 Mira Remote Host 业务身份：

```text
mira_device_*
scopes
manifest
Thread / Message / Chat
```

Relay connection credential 与 `mira_device_*` 必须保持分离。Relay 不决定业务权限，不保存聊天历史，也不运行模型或 Agent。

## 2. 当前状态

### 已存在于主站 `dev`

- Relay protocol / Worker + Durable Object POC；
- Desktop Relay Connector 主动 WSS 出站；
- request / response / chunk / complete / cancel / error 转发；
- Desktop Relay 产品配置；
- `relayId`、`hostToken`、`clientToken` 由 Desktop 自动生成并保存；
- pairing URI 在 Relay 启用时可以追加 `relay` 与 `relayId`；
- 当前 Tailscale Remote Host V1 与 `mira_device_*` 业务鉴权保持不变。

### 当前状态边界

以下设计已经确定并以 canonical 文档为准：

- Mobile 不要求用户选择 Transport；
- 首次配对 Relay-first，Direct 只在 claim 前作为兜底；
- claim 发出后不得跨 Transport 自动重发；
- 配对后 Direct-first，只有网络/传输层失败才回 Relay；
- Direct 与 Relay 共用同一个 `mira_device_*` 业务身份；
- Relay credential 与 `mira_device_*` 分离，并使用平台安全存储；
- Transport 切换不清除凭证、不改变 scope、不重建设备身份。

以下仍是实现或环境验收项，不能仅凭文档宣称完成：

- Relay frame 级别的真实网络验收；
- Android 与 iOS 的 Relay streaming / cancel / reconnect 真机验证；
- iOS Keychain 原生桥和网络监听的构建验证；
- 同一设备多 endpoint 持久化的跨重启验证。

## 3. 最终配对体验

详细的 Relay-first 首次配对、claim 一次性副作用和日常 Direct-first 规则见唯一真相源，本文不重复定义另一套选择策略。

目标不是让用户分别做一次 Tailscale 配对、再做一次 Relay 配对。

目标体验：

```text
Desktop 远程连接
  -> 生成一次配对请求 / QR
  -> 请求描述当前可用 endpoint
       ├─ Tailscale Direct（可选）
       └─ Mira Relay（可选）

Mobile 打开一次配对请求
  -> 选择/探测可达 Transport
  -> claim
  -> Desktop 明确批准
  -> 获得同一个 mira_device_* 业务身份
  -> 保存该设备可用的多个 endpoint
```

后续连接默认：

```text
模式：自动

Direct probe ready
  -> Tailscale Direct

Direct unavailable
  -> Mira Relay
```

Transport 切换不能删除设备凭证，也不能重新创建业务身份。只有 Host 返回 401/403 才进入 Mira 授权失效判断。

## 4. Mobile 实施阶段

### R0 — RemoteTransport 抽象

日期：2026-08-12

目标：只整理 Mobile 传输边界，不改变当前 Tailscale 行为。

交付：

- 抽出 `RemoteTransport`；
- 当前 HTTP/JSON + SSE 实现封装为 `DirectRemoteTransport`；
- `RemoteMiraHostClient` 只消费 Transport 接口；
- credential / scope / messageId / reconnect 业务语义不变；
- 当前 Tailscale pairing 保持可用。

该阶段不需要发明 Relay credential。

### R1 — Relay JSON Transport（合同已冻结）

日期：2026-08-13 ～ 08-14

前置 Host 合同（已确定）：

- 配对二维码携带 `relay`、`relayId` 和一次性 `relayToken`；缺少 token 的 Relay hint 不能直接打开 Relay；
- Relay token 只用于 Relay Transport 建连，不替代 `mira_device_*`，不包含业务 scope；
- client hello 必须携带协议版本、角色、`relayId` 和 Relay token；服务端以 `hello_ack` 明确接受或拒绝；
- Relay token 过期、撤销或服务端返回认证失败时，Mobile 清除 Relay connection credential，但保留有效的 `mira_device_*`；
- 轮换通过重新生成配对请求完成，不在客户端静默重发 claim。

Mobile 交付：

- `RelayRemoteTransport` WSS 建连；
- hello / hello_ack；
- request / response / complete；
- `GET /remote/v1/manifest` 经 Relay 成功；
- `GET /threads` 经 Relay 成功；
- Relay credential 使用平台安全存储；
- Relay connection failure 不删除 `mira_device_*`。

### R2 — Chat Streaming

日期：2026-08-15

交付：

- `POST /proxy/chat/default` 经 Relay；
- chunk forwarding；
- Stop -> Relay cancel -> Desktop AbortController；
- 断线后 canonical state replay；
- 同一 User Message 重试保持稳定 `messageId`。

### R3 — Pairing 去 Tailscale 硬耦合

日期：2026-08-16

前置 Host 合同：

- pairing challenge endpoint 来源不再要求 Tailscale `ready`；
- 一次 pairing request 能表达 Direct / Relay endpoint；
- Relay-only 情况下 Mobile 仍可以完成 claim / poll / approval；
- 不改变 `mira_device_*` 业务 credential 语义。

Mobile 交付：

- 配对页不再写死 “Tailscale 联通” 才能申请；
- UI 改为“传输连接 / Mira 授权”两层；
- 能只通过 Relay 完成首次配对；
- 已有 Tailscale pairing 深链继续兼容。

### R4 — 自动选路（行为已冻结）

日期：2026-08-16

交付：

- 同一设备保存多个 endpoint；
- 默认模式 `auto`；
- Direct ready -> Direct；
- Direct unavailable -> Relay；
- 主界面不提供 Auto / Tailscale / Mira Relay 选择；Transport 选择仅存在于内部策略和连接详情；
- 网络恢复后允许回到 Direct；
- 不因 transport 切换改变业务身份。

## 5. 验收门槛

Relay Mobile 只有同时满足以下条件才算完成：

1. 主站 `dev` 对 Relay client credential / pairing / endpoint 合同已有 canonical 文档；
2. Mobile 不使用 Desktop JWT、用户名或密码；
3. Relay 只做 transport，不解释 Chat/Thread 业务；
4. `mira_device_*` 仍在 Desktop Mira Server 做 scope/allowlist 校验；
5. Direct 与 Relay 对同一业务调用返回等价语义；
6. JSON、Chat stream、cancel、reconnect 均有测试；
7. Android 与 iOS 至少各完成一次 Relay 实机/真实网络验证；
8. Tailscale 直连仍可独立工作；
9. Relay 不可用时不会破坏已经有效的设备配对。

## 6. 对业务排期的影响

Relay 属于业务能力之前的传输层前置工程。

新的 Mobile 总顺序：

```text
Chat / Tailscale baseline
  -> Relay R0-R4
  -> Memory
  -> File Library
  -> Workspace
  -> Plugins
  -> Voice
  -> Images
```

Memory、文件库、Workspace 等业务 adapter 应天然运行在 `RemoteTransport` 之上，这样后续不需要分别维护 Tailscale API 与 Relay API 两份客户端代码。
