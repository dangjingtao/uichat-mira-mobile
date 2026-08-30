# MOB-011：0.2.1 对话入口与会话体验回归修复

状态：实施中

负责人：`mob_011_conversation_ux_regression`

工作分支：`fix/mob-011-conversation-ux-regression`

目标版本：`0.2.1`

## 背景

0.2.0 发版后真机复查确认存在一组同源的会话体验回归。本任务只建一张卡统一收口，不再拆分子卡。

## 产品决定

1. **全局线程入口平铺**
   - 首页会话列表、Drawer「最近」、Search 结果中的合法线程点击后直接进入对应 Chat。
   - `workspaceId` 是线程归属/上下文元数据，不是全局线程入口的导航父级。
   - Drawer「项目」入口保持现状：`项目列表 -> 项目详情 -> 项目线程 -> Chat`，用于按项目浏览与管理。
   - `agentEnabled=true` 且缺少 `workspaceId` 仍视为 Host 合同异常，不绕过校验。

2. **线程列表恢复旧版置顶视觉与滑动操作**
   - 正常态不常驻 Pin 操作按钮。
   - 右划线程行呼出操作：`置顶/取消置顶`、`删除`。
   - 置顶后的列表视觉以旧版 `predev` 为准：置顶区与最近对话分组，小型 Pin 仅作为状态标记，不作为常驻操作按钮。
   - 置顶继续使用 MOB-007 的设备级本地持久化与稳定排序，不写回 Remote Thread。

3. **删除恢复为真实操作**
   - 删除必须删除 Host 权威线程，不做“仅本机隐藏”的假删除。
   - Mobile 复用已有 `RemoteMiraHostClient.deleteThread()`；Paired adapter 恢复 `deleteSession()` 委托。
   - Desktop / Host 允许 paired device 对 `DELETE /threads/:id` 执行受控写操作。本任务协同修改 Host 合同与 allowlist，不另拆任务卡。
   - 为兼容 0.2.0 已配对设备，本轮沿用现有 `messages:write` 作为聊天写权限门槛，不强制重新配对；协议文档需明确该兼容语义。
   - 删除成功后清理当前设备的本地置顶与已读状态。

4. **聊天发送失败视觉修复**
   - 移除“浅粉色背景 + 白字”的失败气泡视觉。
   - 用户原消息继续使用正常用户气泡；失败状态作为气泡下方的轻量错误提示与重试操作呈现。
   - 不把网络/传输错误伪装成一条粉色聊天消息。

## 实施范围

Mobile：

- `src/screens/sessionNavigation.ts` 及测试
- `src/screens/SessionListScreen.tsx`
- `src/components/CustomDrawer.tsx`
- `src/screens/SearchScreen.tsx`
- `src/api/miraHostClient.ts`
- `src/screens/ChatScreen.tsx`
- 必要的测试与台账更新

Desktop / Host（同一任务卡协同改动）：

- paired device route allowlist / manifest
- Remote Host V1 文档与测试

## 验收

- 首页点击带 `workspaceId` 的合法线程直接进入该 Chat。
- Drawer「最近」和 Search 同样直接进入线程；Drawer「项目」仍按项目层级进入。
- Agent Thread 缺少 `workspaceId` 时仍显示合同错误。
- 右划线程可呼出置顶/取消置顶与删除；正常态没有常驻 Pin 按钮。
- 置顶区/最近对话分组与小型 Pin 状态标记恢复旧版视觉；App 重启后置顶仍存在。
- 删除确认后 Host 线程真实删除；列表立即移除，本机 pin/read 状态同步清理。
- 发送失败时原用户气泡不再变成浅粉白字；错误信息与“点击重试”作为次级状态显示。
- Mobile typecheck / lint / Jest 通过；Desktop 相关 Remote tests 通过。

## 非目标

- 不改变 Workspace 数据模型。
- 不改变项目入口的层级浏览方式。
- 不做 Desktop ↔ Mobile 置顶同步。
- 不新增线程重命名能力。
- 不重做整个 Chat 页视觉系统；本轮只修复已确认的失败态回归。
