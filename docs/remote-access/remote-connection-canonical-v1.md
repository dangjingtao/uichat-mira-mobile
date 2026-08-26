# Mira Mobile 远程连接唯一真相源 V1

状态：Current canonical contract

适用分支：`dev`

本文定义 Mira Mobile 首次配对与配对后远程连接的 Transport 行为。其他移动端远程连接文档必须引用本文；如有冲突，以本文为准。

## 1. Transport 边界

Mira Mobile 与 Mira Host 共用同一套 `mira_device_*` 设备凭据和 scope。Relay 与 Tailscale Direct 都只是 Transport，不负责业务授权、scope 判定、Agent、Provider 或消息事实。

二维码可以携带：

- `host`：可选的 Tailscale Direct HTTPS endpoint；
- `relay`、`relayId`、`relayToken`：可选的 Mira Relay endpoint。

必须至少存在一种可达 endpoint。Relay-only 配对不要求 Tailscale 已开启。

## 2. 首次配对：Relay-first

```text
有 Relay endpoint
  -> Relay /health preflight
  -> 成功：只通过 Relay 提交一次 claim
  -> Relay transport error：claim 前检查 Direct
      -> Direct 成功：只通过 Direct 提交一次 claim
      -> Direct 失败：显示连接失败，不提交 claim

无 Relay endpoint
  -> 检查 Direct
  -> Direct 成功：提交一次 claim
```

`claim` 是一次性副作用。claim 发出后，即使响应超时、断网或状态不确定，也不得跨 Transport 自动重发；用户应回到 Desktop 确认是否已收到申请。

## 3. claim 通道字段

Mobile 可在 `/remote/pairing/claim` body 中发送：

```json
{ "transport": "relay" }
```

允许值为 `relay`、`direct`。字段只用于 Desktop 展示和诊断，不参与认证、poll token、设备凭据、scope、审批或 endpoint 判定。旧版 Mobile 缺少该字段时，Desktop 显示“未知”，并继续完成配对。

## 4. 配对后日常请求

配对完成后的业务请求使用 Direct-first：

```text
Direct 可用 -> Direct
Direct 网络/传输失败 -> Relay
401/403、业务 HTTP 错误、协议解析错误 -> 不跨 Transport fallback
```

Transport 切换不能删除、重建或改变已经批准的 `mira_device_*` 身份。

## 5. Mobile 界面流程

1. 扫码或粘贴链接后显示“正在检查可用传输”。
2. Relay 可用时显示“已选择 Mira Relay”，然后提交 claim。
3. Relay 预检失败但 Direct 可用时显示“Relay 不可用，正在切换 Tailscale Direct”，然后提交 claim。
4. 两者都不可用时显示可操作的连接错误，不提交 claim。
5. claim 成功后显示“已提交设备申请，等待桌面确认”。
6. claim 响应不确定时不自动换通道重试，提示用户回到 Desktop 确认。

## 6. Desktop 对应要求

Desktop 创建配对挑战时，只要 Relay connected 或 Direct ready 任一成立即可；二维码同时携带当前可用 endpoint。收到 claim 后展示实际申请通道：Mira Relay、Tailscale Direct 或未知。

## 7. 验收

- Relay + Direct：先 Relay `/health`，成功后只发 Relay claim；
- Relay preflight 失败：claim 前才切 Direct；
- Relay claim 已发出：不向 Direct 重发；
- Relay-only：无需 Tailscale 完成配对；
- Direct-only：旧二维码继续可用；
- 缺少 `transport`：兼容旧 Mobile；
- 配对后 Direct 网络失败：可回 Relay；
- 401/403 与业务错误：不触发 Transport fallback。
