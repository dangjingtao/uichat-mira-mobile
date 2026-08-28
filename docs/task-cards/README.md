# Mobile 新增任务卡索引

本目录补充 `docs/work-ledger.md` 的后续 Mobile 任务。旧任务编号 MOB-001～MOB-006 不改号、不重开。

## 当前新增

| ID | 任务 | 状态 | Desktop / Host 依赖 |
|---|---|---|---|
| MOB-007 | 本机线程置顶 | **完成**：PR #28 已 squash 合入 `dev`；设备级本机置顶、主列表排序、Drawer/Search 同源展示已完成 | 无 |
| MOB-008 | 本机未读状态 | **完成**：PR #30 已 squash 合入 `dev`；设备级已读进度、真实消息未读判定与主列表/Drawer/Search 同源展示已完成 | 无 |
| MOB-009 | 简化桌面配对页与 Mira 链接兜底 | **有条件完成**：代码与自动化平台验收已通过并合入 `dev`；待真机五路径人工验收 | 无新增依赖 |
| MOB-010 | Desktop Remote 合同接入收口 | **有条件完成**：代码与自动化验收完成；真实 Desktop 配对联调待验收 | Desktop #77 / #78 / #80 已完成合同交付 |
| MOB-011 | 0.2.0 会话交互回归修复 | **有条件完成**：Mobile PR #46 / Host PR #87 已合入 `dev`；0.2.1 真机交互回归待验收 | 单线程删除需要 Host Remote 放行，已随本卡完成 |
| MOB-012 | Agent 手机审批闭环 | 待实施 | 只消费现有 `agent:read` / `agent:approve` / `agent:control`；施工前必须证明稳定 `runId` 来源 |
| MOB-013 | 会话媒体与附件读取 | 待实施 | 只消费现有 Message parts / `artifacts:read` / 线程媒体读取 |
| MOB-014 | 会话手机工具 | 待实施 | 无新增依赖；使用手机系统分享与本地查找 |
| MOB-015 | 设备设置与连接收口 | 待实施 | 无新增依赖；复用设备本地存储与现有 `disconnect()` |

## 产品决策

2026-08-28 决定：线程置顶与未读首轮由 Mira Mobile 以**设备级本地状态**实现。Desktop Issue #79 已关闭为 `not planned`。

- 置顶：本机持久化，只影响当前设备排序与展示。
- 未读：本机持久化已读进度，只表达当前设备是否读过最新内容。
- 不把设备级状态伪装成账户级或跨端统一状态。
- 将来如明确需要 Desktop ↔ Mobile 或多 Mobile 同步，再新建设计账户级线程状态同步任务。

2026-08-28 实施结果：MOB-007 已通过 PR #28 squash 合入 `dev`；本机线程置顶代码完成，平台构建与真机视觉回归继续并入 MOB-006，已知 hydrate 失败缺少显式错误/重试入口记录为 P2 技术债。

2026-08-28 实施结果：MOB-008 已通过 PR #30 squash 合入 `dev`（merge `e78e3e81329c01b8f12636a1dad673ffbdc6c6c7`）。本机持久化已读进度，以 Remote Thread `messageCount` 仅作为变化探针，真正未读由 Host 权威 `user` / `assistant` 消息判定；Chat 仅在权威消息读取成功后推进已读，401/403/断网不误清。按维护者决定，本轮不等待 Android / iOS 平台构建作为合并阻塞条件。

2026-08-28 决定：桌面配对页只暴露用户需要理解的配对流程。扫码为主入口，扫码失败时允许粘贴 `mira://pair?...` 配对链接兜底；Direct / Relay 继续作为底层 transport，不再在主页面提供 Host URL、手工 Direct 检查或传输选择。

2026-08-28 实施结果：MOB-009 已通过 PR #27 squash 合入 `dev`（merge `7fae64189aadda6bf7e59230d49a201e1d108b82`）。typecheck / lint / Jest、Android debug APK、iOS Simulator、unsigned iPhone / IPA 构建均通过；真机扫码、粘贴、等待批准、拒绝/过期、完成配对五条路径仍作为人工验收项保留。

2026-08-28 决定：Desktop #77 / #78 / #80 已给出并合入正式 Remote 合同。MOB-002 / MOB-003 / MOB-005 的原始产品结构和完成记录不重开，由 MOB-010 统一负责把已完成 Mobile 代码适配到 `/remote/v1/workspaces`、`/remote/v1/roles` 和 Workspace Thread 权威分页接口。

2026-08-29 决定：全局最近会话中的 Thread 是一等入口，`workspaceId` 表示归属 / 运行上下文，不再作为全局入口必须经过的导航父级。Drawer「项目」仍保留项目列表 -> 项目详情 -> 项目线程的浏览路径。MOB-011 已按该决定修复 0.2.0 回归。

2026-08-29 决定：0.2.1 后续不删除现有占位入口，优先把**手机当前已经具备、现有 Host 已允许**的能力接成真实功能。首轮授权 MOB-012～MOB-015，共四张任务卡，不为额度凑数。

### 0.2.1 并行规则

- MOB-012 优先拥有 Chat Agent 运行态；必须先确认稳定 `runId` 真相来源。
- MOB-013 主要拥有 Message / media 展示层，尽量下沉独立组件。
- MOB-014 主要拥有系统分享与当前聊天内查找；不得与 MOB-012 / MOB-013 并发重写同一段 `ChatScreen`。
- MOB-015 主要拥有 Settings / Theme / 本地存储 / Host disconnect，可与 MOB-012～014 独立并行。
- 任一施工者发现需要新增 Host 合同、扩大 scope 或修改 Desktop 业务语义，应停止并记录依赖，不得在 Mobile 卡内偷偷扩权。

详细任务卡：

- `MOB-007-local-thread-pinning.md`
- `MOB-008-device-local-unread.md`
- `MOB-009-pairing-screen-simplification.md`
- `MOB-010-desktop-remote-contract-alignment.md`
- `MOB-011-conversation-ux-regression-repair.md`
- `MOB-012-agent-mobile-approval.md`
- `MOB-013-media-attachment-reading.md`
- `MOB-014-mobile-conversation-tools.md`
- `MOB-015-device-settings-connection.md`
