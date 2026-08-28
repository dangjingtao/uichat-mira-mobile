# Codex小弟敬请Mira大姐审查

## Remote Host V1 Chat Contract Hardening 架构报告

状态：送审，不施工

日期：2026-08-26

适用分支：`dev`

## 1. 总体方向

本报告不新增 Remote Mobile Facade 业务层。

基线结构保持为：

```text
Mobile
  -> Direct / Relay Transport
  -> Remote Host V1 / Remote Gateway
  -> canonical Thread / Message / Chat / Agent services
```

Remote Gateway 继续负责：

- `mira_device_*` 身份验证；
- owner user 映射；
- scope；
- method/path allowlist；
- 401 / 403；
- manifest。

不得再复制一层拥有独立 Thread、Message、Chat 或 Agent 语义的 Mobile backend。

本次方案只处理 Remote Host V1 Chat contract 的稳定性，并明确拆成两个 Gate：

```text
Gate A：Runnable Remote Chat
  -> 先让 Mobile 按现有 Remote Host V1 跑通一次可用聊天

Gate B：Shared Chat Contract Hardening
  -> Gate A 跑通后，再加固 Desktop / Mobile 共享 Chat 能力
```

完整 Shared Chat Contract Hardening 不得作为 Mobile T6 真实聊天闭环的前置条件。

## 2. 两类问题的边界

### 2.1 Remote 专属问题

以下属于 Remote Gateway / Transport 边界：

- device credential；
- scope 与 manifest；
- Direct / Relay；
- Transport fallback；
- Remote route exposure。

业务 HTTP error、401/403 和协议错误不得触发 Transport 盲目 fallback。

### 2.2 Mira Chat 共享问题

以下属于共享 persisted Chat / Host contract，不应由 Mobile 专属实现解决：

- messageId 请求级幂等；
- User / Assistant canonical state；
- SSE terminal semantics；
- backend cancellation；
- 断线后的 state replay；
- 请求已接受但客户端丢失响应后的查询；
- error persistence；
- retry 与重新读取边界。

## 3. Gate A：Runnable Remote Chat

### 3.1 目标

先让 Mobile 按现有 Remote Host V1 真正完成一次可用聊天，并完成 T6 真机 Chat 闭环验收。

Gate A 不要求先完成完整的共享 Chat 加固，也不等待 Gate B。

### 3.2 Gate A 必须依赖的合同

- 继续使用现有 `POST /proxy/chat/default`；
- 使用稳定 client `messageId`；
- 使用现有共享 SSE 事件：

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

- 正确解析 `finishReason=stop/error`；
- `[DONE]` 只表示 SSE stream 结束；
- 请求结果不确定时不得自动重新 POST；
- 断线后通过 Thread / Message canonical state replay 恢复；
- 业务 HTTP error、401/403、协议错误不得触发 Transport fallback；
- Stop 第一阶段允许只 Abort 当前 HTTP stream；
- 必须明确：Abort HTTP stream 不等于 backend generation 已停止。

### 3.3 Gate A 明确不要求

Gate A 不要求：

- durable request journal；
- accepted / running / finished 状态表；
- backend Normal/RAG cancellation；
- error Assistant 完整持久化；
- request-level exactly-once；
- 新 `/remote/v1/...` Chat route；
- 新 SSE taxonomy。

### 3.4 Gate A 的运行边界

当 POST 已经可能被 Host 接受但 SSE 结果不确定时，Mobile 不得自动重新 POST。应先读取 Thread / Message canonical state；只有共享 Host 明确返回可重试且未产生业务副作用时，才讨论 retry。

Gate A 的“可用聊天”不等于声明完整 exactly-once、backend cancellation 或 durable request state 已完成。

## 4. Gate B：Shared Chat Contract Hardening

Gate B 在 Gate A 跑通后，作为 Desktop / Mobile 共享 Chat 能力独立排期，不阻塞 T6。

### 4.1 加固范围

- request-level `messageId` 幂等；
- User / Assistant / request correlation；
- accepted / running / completed / failed / cancelled canonical state；
- backend cancellation；
- error persistence；
- retryable error contract；
- cancel / finish race semantics；
- 已接受但 SSE 丢失后的精确查询；
- 必要时评估 `/remote/v1/...` thin adapter。

这些能力必须进入共享 persisted Chat，而不是 Mobile 专属实现。

### 4.2 `messageId` 待确认语义

共享 Chat 服务需要继续确认：

- 同一 thread + messageId 重试是否重新生成；
- 已存在 User Message 时如何处理；
- Assistant 是否产生新的 messageId，以及如何关联请求；
- 请求已接受但 SSE 丢失后如何查询 canonical result；
- 什么条件允许 retry；
- 什么条件只允许重新读取 Thread / Message；
- 如何避免重复 User Message、Assistant Message 或工具执行。

建议的共享判定方向：

```text
未接受请求
  -> 可重新发送

已接受但结果未知
  -> 不自动重发
  -> 先按 threadId + messageId 查询 canonical state

已完成且存在 canonical result
  -> 返回或重新读取原结果

明确失败且确认无业务副作用
  -> 按 retryable error contract 决定
```

### 4.3 现有 SSE 的增量补齐

不新建第二套 SSE taxonomy。继续基于：

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

Gate B 可增量补齐字段和状态约束，例如：

- `start` 增加 request/message correlation；
- `finish` 增加 `finishReason`、canonical message 标识和最终状态；
- `error` 增加稳定错误码、是否已持久化、是否允许 retry；
- cancel 通过现有事件字段表达明确的终止原因；
- `[DONE]` 仍只代表 SSE stream 结束。

不新增平行的：

```text
message-start
message-complete
message-error
message-cancelled
```

除非证明必须修改整个 Desktop + Mobile 共用 Chat stream contract。

## 5. Stop、断线与 canonical replay

### Gate A

- Stop 至少可以 Abort 当前 HTTP stream；
- 必须向用户和文档明确，Abort 不等于 backend generation 已停止；
- SSE 丢失时不自动重新 POST；
- 通过 Thread / Message 读取恢复 canonical state；
- `[DONE]` 不单独等同于 Assistant 已成功持久化。

### Gate B

再补齐：

- backend generation cancellation；
- cancel 与 finish/error 并发时的优先级；
- 部分 Assistant 内容是否持久化；
- cancel 的 canonical state；
- 已接受请求的精确查询和恢复状态。

## 6. `/proxy/chat/default` 与可选 thin adapter

当前 `/proxy/chat/default` 仍是 Remote Host V1 的 canonical persisted Chat route，Gate A 继续使用它。

不立即废弃，也不要求迁移 Mobile。

如果 Gate B 之后证明长期公网合同需要更清晰的版本化入口，可以评估：

```text
/remote/v1/threads/:id/messages:stream
  -> same canonical Chat handler/service
```

该入口只能是可选的 versioned thin adapter：

- 不复制业务逻辑；
- 不复制持久化；
- 不复制 SSE 状态机；
- 不形成 Desktop / Mobile 两套 Chat truth；
- 与 `/proxy/chat/default` 共用同一套幂等、取消、错误和 replay 语义。

在证明版本化入口确有价值前，不要求新建或迁移。

## 7. 与 Mobile 排期对齐

保持既定顺序：

```text
T1-T5
协议 / 配对 / 恢复 / Thread / Message

  -> T6
真实 SSE Chat
先完成 Gate A

  -> T7
Agent 状态 / 审批 / Agent cancel

  -> 后续
Agent / Media / Memory / Workspace 等按原排期逐步开放

  -> Gate B
可与后续稳定性工作独立排期，不阻塞 T6
```

普通 Chat 先闭环，Agent / Media 后续分阶段开放；Relay 继续只是 Transport，不成为业务 backend。

## 8. 最终架构原则

> **Remote Host V1 不新增第二套业务边界。**
>
> **第一阶段优先利用现有 canonical Chat contract 跑通 Mobile。**
>
> **现有合同足以安全运行但不够完善的部分，不得为了架构完美阻塞真实 Chat。**
>
> **完整幂等、backend cancellation、durable request state 和 error persistence 作为共享 Chat 的后续 hardening。**

## 9. 送审确认项

请审查并确认：

1. 是否接受 Gate A 先完成 T6 真实 Chat 闭环，Gate B 不作为前置条件？
2. 是否确认 Gate A 继续使用 `/proxy/chat/default` 和现有共享 SSE？
3. 是否确认稳定 `messageId`、不确定结果禁止自动重 POST、canonical replay 和 Transport fallback 边界足以支撑 Gate A？
4. 是否确认 Stop 第一阶段只 Abort HTTP stream，并明确不等于 backend cancellation？
5. 是否确认 Gate B 的幂等、durable state、backend cancellation、error persistence 归属共享 persisted Chat？
6. 是否确认不新增第二套 SSE taxonomy？
7. 是否确认 `/remote/v1/...` 仅作为 Gate B 后可选 thin adapter，不要求立即迁移？

## 10. 当前不做的事情

- 不施工；
- 不修改 Desktop、Server 或 Mobile 代码；
- 不新增 Remote Mobile Facade 业务层；
- 不新增第二套 SSE taxonomy；
- 不立即废弃 `/proxy/chat/default`；
- 不让 Gate B 阻塞 T6；
- 不把 Relay 变成业务 backend。

## 11. 结论

本报告建议采用：

> **先以现有 Remote Host V1 和 canonical Chat contract 完成 Gate A：Runnable Remote Chat；再以共享 persisted Chat 为边界推进 Gate B：Shared Chat Contract Hardening。Gate B 不阻塞 Mobile T6。**

本文件仅更新架构报告，审查通过后再进入施工排期。
