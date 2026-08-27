# MOB-008：本机未读状态

状态：待实施

负责人：`mob_008_device_unread`

工作分支：`dev`

## 目标

在 Mira Mobile 内实现真实、可持久化的**本机未读状态**。该状态只表达“这台手机是否已经读过该线程的最新内容”，不要求 Mira Desktop / Host 提供账户级未读合同或跨端同步。

## 产品边界

- 未读状态是设备级 UI 状态，不进入 Remote Thread 真相模型。
- 优先记录已读进度，而不是持久化一个容易漂移的 `isUnread` 布尔值；可采用 `threadId -> lastReadMessageId / lastReadAt` 或等价稳定方案。
- 只有存在足够的 Host 消息/更新时间证据时才判定未读；不能靠数组 index、首项、随机值等方式伪造。
- 在 Desktop 已读不会自动清除 Mobile 未读，这是当前设备级语义的预期行为，不是 bug。
- Desktop Issue #79 已关闭为 `not planned`，本任务不再依赖 Desktop / Host。

## 实施要求

1. 新增独立的 Mobile 本地已读进度存储，不复用 `deviceCredentialStore` 保存非敏感 UI 状态。
2. 打开 Chat 并成功读取到当前线程权威消息后，将本机已读进度推进到当前最新可确认位置。
3. 拉取线程/消息后，如果发现比本机已读进度更新的真实内容，则显示未读。
4. 需要明确哪些消息变化触发未读：首轮至少覆盖来自 Host 的新增 assistant/user 内容；tool/system 等特殊消息若当前 UI 不作为独立内容展示，不单独发明未读语义。
5. 主列表、Drawer、Search 如展示未读标记，必须消费同一状态源。
6. 读取失败、离线或 401/403 时不得把线程误标为已读。
7. Host 删除/404 的线程应允许清理对应本地已读进度。

## 验收

- 新消息到达后，该线程在当前手机显示未读。
- 打开线程并成功读取最新消息后，未读消失。
- App 重启后已读进度保持。
- 慢网/断网/401/403 不会错误清除未读。
- Desktop 上阅读与否不会被 Mobile 伪装成已同步。
- 多线程状态互不串扰。
- typecheck / lint / Jest 通过；已读推进与未读判定有单测。

## 非目标

- Desktop ↔ Mobile 已读同步。
- 多台 Mobile 已读同步。
- 推送通知角标与系统通知中心状态。
- 账户级未读数、冲突合并、审计或恢复。
- 修改 Mira Desktop / Host。