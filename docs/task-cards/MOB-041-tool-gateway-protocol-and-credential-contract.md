# MOB-041：Tool Gateway / MCP 协议与凭据合同确认

状态：**TODO**（2026-09-06 已派卡）

范围：Mira Mobile + Mira Host / Tool Gateway 协议协作

依赖：MOB-037 阶段 B 基础接口；不依赖移动端具体 UI 实现

## 目标

把 Local Provider 使用远程工具所需的协议边界确认成可实现、可测试、可审计的合同，避免移动端根据页面需求猜测 endpoint、鉴权、工具发现或审批行为。

## 必须确认

- Tool Gateway 属于 Mira Host endpoint、独立服务，还是两者兼容。
- Local Provider 访问 Gateway 使用何种认证、设备授权和凭据轮换方式。
- 工具发现清单、工具名称、描述和 JSON Schema 格式。
- 工具调用请求、审批、取消、超时、结果和错误 envelope。
- 工具结果大小、敏感字段和日志脱敏规则。
- MCP 传输方式及其是否由 Gateway 代为承载。
- Tool Gateway 凭据与 Remote Host 凭据、Provider API Key 的存储和清除边界。

## 非目标

- 不在本卡实现移动端页面。
- 不在移动端启动 MCP 子进程、Shell 或任意本地工具。
- 未达成合同前，不新增真实 Gateway endpoint 或生产鉴权代码。

## 交付物

- 版本化协议文档和示例请求/响应。
- 错误码、审批状态、取消和超时语义说明。
- 移动端可引用的 TypeScript 类型或生成来源。
- 脱敏、凭据隔离和兼容策略说明。
- 一组跨仓合同测试或可运行测试夹具。

## 验收标准

- 移动端可以据此实现 `ToolGatewayClient`，不需要猜测字段或路由。
- 认证失败、工具未授权、Schema 错误、超时、取消和结果过大均有明确语义。
- 合同没有允许任意 URL、任意本地进程或把 Provider Key 传给 Gateway 的路径。
- 变更记录包含兼容范围、版本策略和迁移说明。

## 阻塞关系

MOB-042 的真实工具状态 UI、MOB-043 的持久运行时工具适配以及 MOB-044 的真实工具验收，均以本卡合同完成为前提。合同未确认时只能继续使用当前协议无关接口和测试替身。
