# MOB-012：Agent 手机审批闭环

状态：待实施

负责人：`mob_012_agent_mobile_approval`

工作分支：`dev`

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

## 实现要求

- 复用 `RemoteMiraHostClient.getAgentRun()` / `approveAgentRun()` / `rejectAgentRun()` / `cancelAgentRun()`；
- 仅以 Host 返回的 `RemoteAgentRun.status` 与 `pendingApproval` 为真相；
- `waiting_approval` 展示审批卡，至少包含工具/原因与批准、拒绝操作；
- running / queued 可提供取消运行；终态不继续显示可操作按钮；
- 操作期间防重复提交；Host 返回后的最新状态覆盖本地乐观态；
- 401 / 403 / 404 / 网络错误显示真实失败，不自动伪造“已批准”；
- Agent Run 与当前 Thread 必须能验证关联，禁止把其它 Thread 的 Run 注入当前聊天；
- 不改变普通 Thread / Role Thread 的聊天行为。

## 并行边界

MOB-012 对 Chat Agent 运行态拥有优先修改权。MOB-013 / MOB-014 若需修改 `ChatScreen.tsx`，应在 MOB-012 合入后 rebase，或将改动下沉到独立组件，避免并发改同一块状态机。

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

## 验收

1. Desktop Agent 进入等待审批；
2. 手机端无需回桌面即可看到真实审批请求；
3. 手机批准后 Desktop Agent 继续执行；
4. 手机拒绝后 Desktop 反映真实拒绝状态；
5. 手机可取消可取消状态的运行；
6. 弱网 / 断网不产生假成功。

## 非目标

- 不新增 Agent 创建入口；
- 不在手机端重做 Planner / Tool / Evidence UI；
- 不实现完整 Agent trace 调试器；
- 不修改 Desktop Agent 状态机；
- 不为拿不到 `runId` 而发明新合同。