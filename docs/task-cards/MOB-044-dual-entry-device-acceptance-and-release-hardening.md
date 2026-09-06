# MOB-044：双入口真机验收与发布加固

状态：**TODO**（2026-09-06 已派卡）

范围：Mira Mobile；Android / iOS；真实 Mira Host 与真实 OpenAI-compatible Provider

依赖：MOB-038、MOB-039、MOB-040；MOB-042；如验收真实远程工具或持久任务，还依赖 MOB-041、MOB-043

## 目标

用真实设备、真实安全存储、真实 Provider 和已批准的远程服务完成双入口功能验收，并把发现的问题回流到对应实现卡或新修复卡。

## 验收矩阵

- Android / iOS 保存、读取、掩码和清除 Provider API Key。
- 多 Provider 切换、选定 Provider 新建会话和会话归属。
- 远程 Host / 本地 Provider 来源菜单、Drawer、聊天头部和空状态。
- 本地流式输出、弱网、网络切换、取消、超时、失败重试和幂等 transcript。
- App 前后台切换、挂起恢复和本地 Agent 状态解释。
- 真实 Provider 的 401、403、404、429、5xx 和不兼容 SSE 响应。
- 既有 Remote Host 配对、流式消息和 Agent 审批回归。
- 发布构建、日志脱敏、崩溃路径和安装升级检查。

## 非目标

- 不把模拟器结果当作完整真机验收。
- 不用 Mock Gateway 结果替代真实协议联调证据。
- 不因构建环境失败而修改产品安全边界或关闭类型/安全检查。

## 验收标准

- Android 与 iOS 核心矩阵均有可复现记录、截图或录屏和设备信息。
- 关键失败路径有用户可执行的下一步，不只留下日志。
- 未发现 Provider Key、Host 凭据、Tool Gateway 凭据或完整敏感消息泄漏。
- 通过后才能将 MOB-037 以及 MOB-038、MOB-039、MOB-040、MOB-042、MOB-043 按实际证据升为 `PASS`；未通过项必须回流到对应卡。

## 交付物

- Android / iOS 验收记录。
- 版本、设备、网络条件和服务端合同版本。
- 已知问题、复现步骤、修复卡关联和发布说明。
