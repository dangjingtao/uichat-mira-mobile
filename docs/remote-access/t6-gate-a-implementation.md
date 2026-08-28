# T6 / Gate A 施工记录

日期：2026-08-26

## 已实现

- Mobile Chat 继续使用 `POST /proxy/chat/default`，并复用稳定的 `messageId`。
- 每次发送前读取 Thread canonical messages，将已有 User / Assistant / System
  文本历史与当前用户消息一起提交，保持与桌面端 Chat 请求的上下文语义一致；Tool
  消息不作为普通模型上下文发送。
- SSE adapter 处理 `text-delta` 增量、`finishReason=stop/error`、`error` 和 `[DONE]`；没有 `finish` 的 `[DONE]` 不会被当作成功。
- `data-tool-event` 与 `data-execution-node` 保留为结构化运行状态，不注入普通聊天文本。
- Chat 页面停止时只 Abort 当前 HTTP stream；不调用 backend cancel，也不宣称后端生成已停止。
- 流结束、Stop、断线或异常后，页面回读 Thread / Message canonical state，不本地伪造 Assistant 消息，也不自动重复 POST。
- Direct / Relay 选择仍只在 Transport failure 边界 fallback；业务 HTTP error、401/403 和协议错误不触发盲目 fallback。

## 自动化验证

- `npm run typecheck`：通过。
- `npm test -- --runInBand`：通过，12 suites / 50 tests。
- `npm run lint`：无 error；仓库已有 warning 保持不变。

新增测试覆盖稳定 `messageId`、正常 finish、finish error、stream error、无 finish 的 `[DONE]`，以及结构化 tool/execution 事件。

## 尚未验证

- Android Debug 构建：未通过，当前机器没有可用 Java Runtime。
- iOS 构建：未执行成功，仓库当前没有生成 `ios/*.xcworkspace`，需先完成 CocoaPods 工程生成。
- Android / iOS 真机上的真实 Host SSE、Stop、断网恢复、Direct/Relay 切换尚未验证。
- backend generation cancellation、durable request state、request-level exactly-once 仍属于 Gate B，未施工。
- T7 Agent 查询、审批和 backend cancel 未施工。
