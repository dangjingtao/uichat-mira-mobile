# MOB-012：Agent 手机审批闭环

状态：有条件完成（代码与自动化门禁通过；真实 Desktop + Android / iOS 联调验收挂账）

负责人：`mob_012_agent_mobile_approval`

工作分支：`feature/mob-012-agent-mobile-approval`（Mobile PR #57 已合入 `dev`）

目标版本：`0.2.1`

范围：Mira Mobile；只消费现有 Mira Host Remote Agent 合同

Desktop / Host 依赖：现有 `agent:read` / `agent:approve` / `agent:control` 与 Agent Run 路由；不新增 Host 合同

## 背景

Mobile Remote Client 已具备 Agent Run 读取、批准、拒绝和取消能力，但 Chat UI 尚未消费。手机端最有价值的独立场景之一，是用户离开桌面后仍能处理 Desktop Agent 的等待审批。

## 目标

让合法 Agent Thread 在出现真实 `waiting_approval` 时，Mobile 能读取权威 Run 状态并完成批准 / 拒绝 / 取消，不在手机端伪造 Agent 状态。

## 施工前真相检查

施工者必须先证明现有 Remote SSE / Thread / Message 数据中存在可稳定取得的 `runId`，并给出代码证据。

- 如果已有稳定 `runId`：继续施工；
- 如果只能靠猜测、解析文案或客户端生成 `runId`：立即停止，记录 Host 依赖；
- 不允许自行发明 Agent Run 列表接口、轮询接口或第二套状态模型。

该前置已于 2026-08-29 核实：Desktop `dev` 会把 Agent `run.id` 持久化到 Assistant Message `metadata.agent.runId`，Remote manifest 与配对 scope 已正式开放 Agent Run read / approve / reject / cancel，因此不存在新增 Host 合同前置。

## 实现要求

- 复用 `RemoteMiraHostClient.getAgentRun()` / `approveAgentRun()` / `rejectAgentRun()` / `cancelAgentRun()`；
- 仅以 Host 返回的 `RemoteAgentRun.status` 与 `pendingApproval` 为真相；
- `waiting_approval` 展示审批卡，至少包含工具/原因与批准、拒绝操作；
- running / queued 可提供取消运行；终态不继续显示可操作按钮；
- 操作期间防重复提交；Host 返回后的最新状态覆盖本地乐观态；
- 401 / 403 / 404 / 网络错误显示真实失败，不自动伪造“已批准”；
- Agent Run 与当前 Thread 必须能验证关联，禁止把其它 Thread 的 Run 注入当前聊天；
- 不改变普通 Thread / Role Thread 的聊天行为。

## 实施结果（2026-08-29）

- Mobile PR #57 已合入 `dev`，merge commit：`c8e4cbcc518d7a572afe755ccffec2245c11cde0`。
- Mobile adapter 保留 canonical Assistant Message `metadata.agent.runId`，并在 Chat canonical history refresh 后发布消息快照。
- Agent 层仅从最新 Assistant Message metadata 读取稳定 `runId`，随后通过 Host `GET /agent/runs/:runId` 读取权威状态，并校验 `run.threadId === 当前 Thread`。
- `waiting_approval` 显示真实 tool / reason 与批准、拒绝；queued / running 支持取消；终态不暴露错误操作。
- approve / reject / cancel 操作先读取当前 canonical Run 校验状态，使用同步 action lock 防重复提交，并以 Host 返回结果覆盖本地状态。
- 401 / 403 / 404 / network / Thread mismatch 均保持真实失败语义，不制造本地假成功。
- 为减少与 MOB-013 / MOB-014 的共享 Chat 竞态，Agent 状态由 `AgentChatScreen` 包装层承接，原 `ChatScreen` 主状态机未被重写。
- OpenCode PR Review verdict：`NO_BLOCKING_FINDINGS`，无高置信 P0-P2 finding。
- `typecheck` / `lint` / Jest 已通过。Android / iOS 自动构建与真实 Desktop + 真机交互属于平台 / 最终验收证据，不重新阻塞后续任务。

## 并行边界

MOB-012 已合入 `dev`，Chat Agent 运行态边界已冻结。MOB-013 / MOB-014 可从最新 `dev` 开工；若需修改 Chat，应优先下沉到独立组件并避免重写 MOB-012 的 Agent wrapper / 状态边界。

MOB-015 可独立并行。

## 测试要求

- 能从现有合同稳定获得 `runId`，并有回归测试固定该来源；
- waiting_approval -> approve；
- waiting_approval -> reject；
- queued/running -> cancel；
- completed/failed/blocked/cancelled 不显示错误操作；
- 重复点击不重复提交；
- 401 / 403 / 404 / 网络错误保持真实状态；
- Thread / Run 不匹配时拒绝渲染或操作；
- 普通聊天回归不受影响。

上述代码级要求已由 PR #57 自动化覆盖；真实 Desktop + Android / iOS 设备链路保留为最终人工验收项。

## 验收

1. Desktop Agent 进入等待审批；
2. 手机端无需回桌面即可看到真实审批请求；
3. 手机批准后 Desktop Agent 继续执行；
4. 手机拒绝后 Desktop 反映真实拒绝状态；
5. 手机可取消可取消状态的运行；
6. 弱网 / 断网不产生假成功。

以上 1～6 的真实跨端 / 真机证据尚待最终验收；不影响本卡代码施工 Gate 与后续 MOB-013 / MOB-014 放行。

## 非目标

- 不新增 Agent 创建入口；
- 不在手机端重做 Planner / Tool / Evidence UI；
- 不实现完整 Agent trace 调试器；
- 不修改 Desktop Agent 状态机；
- 不为拿不到 `runId` 而发明新合同。