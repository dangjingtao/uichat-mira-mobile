# MOB-007：本机线程置顶

状态：待实施

负责人：`mob_007_local_pinning`

工作分支：`dev`

## 目标

在 Mira Mobile 内实现真实、可持久化的**本机线程置顶**。该状态只影响当前移动设备上的会话排序与展示，不要求 Mira Desktop / Host 提供 `isPinned`、写接口或跨端同步。

## 产品边界

- 置顶状态以稳定 `thread/session id` 为键。
- 置顶必须在 App 重启后仍保留。
- 置顶只代表“当前手机上的置顶”，不宣称 Desktop、其他手机或账户级同步。
- Host Thread 仍是线程标题、归属、角色、Agent 等业务数据的权威来源；本机置顶不得写回或污染 Remote Thread 模型。
- Desktop Issue #79 已关闭为 `not planned`，本任务不再依赖 Desktop / Host。

## 实施要求

1. 新增独立的 Mobile 本地线程 UI 状态存储，不把置顶数据塞入 `deviceCredentialStore` 等安全凭证存储。
2. 首轮只持久化必要数据，例如 `threadId -> pinnedAt`；如果不需要手工排序，不新增 `pinOrder`。
3. 主会话列表至少支持：
   - 置顶；
   - 取消置顶；
   - 置顶线程优先于未置顶线程；
   - 同组内保持稳定排序，默认继续按 Host `updatedAt` 倒序。
4. Drawer / Search 是否展示置顶标记应复用同一状态源；Search 不因置顶改变搜索相关性排序，除非后续另有产品决定。
5. Host 删除/404 的线程应允许清理对应本机置顶记录，不制造幽灵会话。
6. 不用数组 index、随机值或当前列表位置模拟置顶。

## 验收

- 置顶一个真实线程后，返回列表立即反映置顶状态。
- App 重启后置顶仍存在。
- 取消置顶后恢复普通排序。
- 多个置顶线程排序稳定。
- Host 刷新线程标题/更新时间不会丢失本机置顶。
- 不影响 Workspace 层级规则、Role/Agent 类型映射或 Remote 权限。
- typecheck / lint / Jest 通过；本机持久化逻辑有单测。

## 非目标

- Desktop ↔ Mobile 置顶同步。
- 多台 Mobile 置顶同步。
- Workspace 级置顶。
- 账户级恢复、冲突合并或审计。
- 修改 Mira Desktop / Host。