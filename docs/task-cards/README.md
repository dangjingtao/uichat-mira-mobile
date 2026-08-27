# Mobile 新增任务卡索引

本目录补充 `docs/work-ledger.md` 的后续 Mobile 任务。旧任务编号 MOB-001～MOB-006 不改号、不重开。

## 当前新增

| ID | 任务 | 状态 | Desktop 依赖 |
|---|---|---|---|
| MOB-007 | 本机线程置顶 | 待实施 | 无 |
| MOB-008 | 本机未读状态 | 待实施 | 无 |
| MOB-009 | 简化桌面配对页与 Mira 链接兜底 | **有条件完成**：代码与自动化平台验收已通过并合入 `dev`；待真机五路径人工验收 | 无新增依赖 |
| MOB-010 | Desktop Remote 合同接入收口 | 待实施 | Desktop #77 / #78 / #80 已完成合同交付 |

## 产品决策

2026-08-28 决定：线程置顶与未读首轮由 Mira Mobile 以**设备级本地状态**实现。Desktop Issue #79 已关闭为 `not planned`。

- 置顶：本机持久化，只影响当前设备排序与展示。
- 未读：本机持久化已读进度，只表达当前设备是否读过最新内容。
- 不把设备级状态伪装成账户级或跨端统一状态。
- 将来如明确需要 Desktop ↔ Mobile 或多 Mobile 同步，再新建设计账户级线程状态同步任务。

2026-08-28 决定：桌面配对页只暴露用户需要理解的配对流程。扫码为主入口，扫码失败时允许粘贴 `mira://pair?...` 配对链接兜底；Direct / Relay 继续作为底层 transport，不再在主页面提供 Host URL、手工 Direct 检查或传输选择。

2026-08-28 实施结果：MOB-009 已通过 PR #27 squash 合入 `dev`（merge `7fae64189aadda6bf7e59230d49a201e1d108b82`）。typecheck / lint / Jest、Android debug APK、iOS Simulator、unsigned iPhone / IPA 构建均通过；真机扫码、粘贴、等待批准、拒绝/过期、完成配对五条路径仍作为人工验收项保留。

2026-08-28 决定：Desktop #77 / #78 / #80 已给出并合入正式 Remote 合同。MOB-002 / MOB-003 / MOB-005 的原始产品结构和完成记录不重开，由 MOB-010 统一负责把已完成 Mobile 代码适配到 `/remote/v1/workspaces`、`/remote/v1/roles` 和 Workspace Thread 权威分页接口。

详细任务卡：

- `MOB-007-local-thread-pinning.md`
- `MOB-008-device-local-unread.md`
- `MOB-009-pairing-screen-simplification.md`
- `MOB-010-desktop-remote-contract-alignment.md`
