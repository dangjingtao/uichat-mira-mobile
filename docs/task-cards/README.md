# Mobile 新增任务卡索引

本目录补充 `docs/work-ledger.md` 的后续 Mobile 任务。旧任务编号 MOB-001～MOB-006 不改号、不重开。

## 当前新增

| ID | 任务 | 状态 | Desktop 依赖 |
|---|---|---|---|
| MOB-007 | 本机线程置顶 | 待实施 | 无 |
| MOB-008 | 本机未读状态 | 待实施 | 无 |

## 产品决策

2026-08-28 决定：线程置顶与未读首轮由 Mira Mobile 以**设备级本地状态**实现。Desktop Issue #79 已关闭为 `not planned`。

- 置顶：本机持久化，只影响当前设备排序与展示。
- 未读：本机持久化已读进度，只表达当前设备是否读过最新内容。
- 不把设备级状态伪装成账户级或跨端统一状态。
- 将来如明确需要 Desktop ↔ Mobile 或多 Mobile 同步，再新建设计账户级线程状态同步任务。

详细任务卡：

- `MOB-007-local-thread-pinning.md`
- `MOB-008-device-local-unread.md`
