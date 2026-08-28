# Codex小弟敬请Mira大姐审查

## T6 / Gate A：Runnable Remote Chat 施工派工卡

状态：已派工，未施工

日期：2026-08-26

目标分支：`dev`

上位约束：[Remote Host V1 Chat Contract Hardening 架构报告](remote-mobile-facade-review.md)

## 1. 施工目标

先让 Mobile 按当前 Remote Host V1 完成一次真实、可恢复、可验收的普通 Chat 闭环：

```text
已配对设备
  -> POST /proxy/chat/default
  -> 真实 POST SSE
  -> 增量展示 Assistant 文本
  -> 正确处理 finish / error / [DONE]
  -> 断线后读取 Thread / Message canonical state 恢复
```

Gate A 完成后，Mobile 可以进行 T6 真机 Chat 验收，不等待 Gate B。

## 2. 必须遵守的边界

### 2.1 允许使用

- 现有 `POST /proxy/chat/default`；
- 现有 Remote Host V1；
- 现有 Direct / Relay Transport；
- 现有共享 SSE 事件：

```text
start
text-start
text-delta
text-end
error
finish
[DONE]
data-tool-event
data-execution-node
```

- 已配对的 `mira_device_*` credential 和既有 scope；
- Thread / Message canonical state replay。

### 2.2 禁止扩张

- 不新增 Remote Mobile Facade 业务层；
- 不新增 `/remote/v1/...` Chat route；
- 不新增第二套 SSE taxonomy；
- 不改 `mira_device_*`、Remote Gateway、Relay frame 或 Provider/Agent 业务语义；
- 不把 Gate B hardening 作为 T6 前置；
- 不把 T7 Agent 状态、审批或真正 backend cancel 混入本卡。

## 3. 施工范围

### 3.1 Mobile Chat 请求

- Chat 继续使用 `POST /proxy/chat/default`；
- 每次发送使用稳定 client `messageId`；
- 重试发送必须复用原消息 ID，不能在不确定状态下自动重新 POST；
- Direct / Relay 只在 Transport failure 时 fallback；
- 业务 HTTP error、401/403、协议错误不得触发 Transport fallback。

### 3.2 SSE 读取与状态

- 正确处理 `start`、`text-start`、`text-delta`、`text-end`；
- 正确解析 `finishReason=stop` 与 `finishReason=error`；
- `error` 事件进入明确失败态；
- `finish` 表示当前共享事件流的终止信息；
- `[DONE]` 只表示 SSE stream 结束，不单独等同于 Assistant 已成功持久化；
- `data-tool-event`、`data-execution-node` 先保存为结构化运行状态，T6 UI 可以只呈现简洁状态，不复制 Desktop Trace 面板。

### 3.3 Stop 行为

- Stop 第一阶段只要求 Abort 当前 HTTP stream；
- 必须在代码、测试和交付说明中明确：Abort HTTP stream 不等于 backend generation 已停止；
- 不调用 T7 的 Agent cancel route；
- 不对后端取消结果做本地猜测。

### 3.4 不确定结果与恢复

当请求可能已被 Host 接受但 SSE 响应丢失时：

- 不自动重新 POST；
- 通过 Thread / Message 读取 canonical state；
- 已有 Assistant 结果时展示 canonical result；
- 状态仍不确定时进入可重试/待确认 UI，但不重复提交副作用请求；
- 只有 Host 明确确认失败且允许 retry 时，才允许再次发送。

## 4. 明确不属于本卡的内容

以下属于 Gate B，独立排期，不阻塞 T6：

- request-level `messageId` exactly-once；
- durable request journal；
- accepted / running / completed / failed / cancelled 状态表；
- request/User/Assistant correlation 的完整持久化模型；
- backend Normal/RAG cancellation；
- error Assistant 完整持久化；
- retryable error contract；
- cancel / finish race semantics；
- 已接受但 SSE 丢失后的精确查询接口；
- `/remote/v1/...` thin adapter 评估。

以下属于 T7，不得混入 T6：

- Agent run 查询；
- Agent 审批卡；
- Agent approve / reject；
- Agent run 的真正 cancel；
- control scope 下的 Agent 操作。

T6 只需要识别并保存现有 `data-tool-event`、`data-execution-node`，不负责 Agent 业务闭环。

## 5. 验收标准

### 5.1 自动化验收

至少覆盖：

- 发送请求带稳定 `messageId`；
- `start` 到 `text-delta` 的增量拼接；
- `finishReason=stop` 正常完成；
- `finishReason=error` 和 `error` 进入失败态；
- `[DONE]` 只结束 SSE reader，不伪造业务成功；
- `data-tool-event`、`data-execution-node` 被保留为结构化状态；
- Stop 只 Abort 当前 HTTP stream；
- 不确定结果不自动重新 POST；
- 断线后从 Thread / Message 恢复 canonical state；
- Direct / Relay 只对 Transport failure fallback；
- 业务 HTTP error、401/403、协议错误不 fallback；
- 同一 User Message 的显式 retry 使用原 `messageId`。

### 5.2 真机验收

至少验证：

1. 已配对 Android 真机发送普通文本并收到真实流式回复；
2. 回复正常结束后重新进入 Thread，内容与 Host canonical state 一致；
3. 流式过程中 Stop，确认本地读取停止，并记录“未证明 backend generation 已停止”；
4. 流式过程中断网/切换网络，恢复后不重复 POST，并能从 Thread / Message 恢复；
5. Direct 可用、Relay 可用时按既定 Transport 策略工作；
6. Transport failure 可以 fallback，业务错误和 401/403 不 fallback；
7. `data-tool-event`、`data-execution-node` 不导致 Chat UI 崩溃或被误显示为普通文本；
8. T7 Agent 审批和 Agent cancel 不纳入本次验收。

## 6. 交付证据

施工完成后必须提交：

- 修改文件清单；
- `npm run typecheck` 结果；
- `npm run lint` 结果；
- `npm test` 结果；
- Android / iOS 构建结果；
- 真机型号、系统版本、Transport 条件；
- Chat 正常流、Stop、断网恢复和错误路径证据；
- 明确列出未验证的 backend cancellation、durable request state 和 exactly-once 风险；
- Gate B 未施工说明；
- T7 未施工说明。

## 7. 完成定义

只有同时满足以下条件，T6 / Gate A 才能标记完成：

- Mobile 使用现有 `/proxy/chat/default` 完成真实 POST SSE Chat；
- 普通文本可以正常增量展示并落回 canonical Thread / Message；
- `finish`、`error`、`[DONE]` 语义没有被混淆；
- 不确定结果不会自动重复 POST；
- 断线后可以通过 Thread / Message 恢复；
- Transport fallback 边界符合 Remote Host V1；
- Stop 的能力边界被如实说明；
- T7 Agent 与 Gate B 均未被偷渡进本卡；
- 验收证据完整且可复现。

## 8. 派工结论

> **先施工 T6 / Gate A：Runnable Remote Chat。**
>
> **Gate B 独立排期，不阻塞 T6；T7 Agent 不混入 T6。**

本卡只作为施工约束和验收清单，当前不执行代码修改。
