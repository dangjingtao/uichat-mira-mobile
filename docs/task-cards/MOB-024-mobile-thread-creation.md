# MOB-024：Mobile 新建会话与动态 Remote Capability

状态：实施中

负责人：`mob_024_mobile_thread_creation`

Mobile 工作分支：`feature/mob-024-mobile-thread-create`

Desktop / Host 工作分支：`feature/mob-024-remote-thread-create`

执行仓库：`dangjingtao/uichat-mira-mobile` + `dangjingtao/uichat-mira`

目标版本：当前 Mobile `dev` 后续版本

## 背景

Mobile 已具备 Thread 列表、读取、删除、发送消息、Agent 审批和媒体读取，但 Drawer 底部“聊天”入口仍是 UI-only。代码中 `RemoteMiraHostClient.createThread()` 已存在，真正阻塞点是上层 `PairedRemoteMiraHostClient.createSession()` 明确拒绝创建，以及 Desktop Remote Gateway 旧 V1 固定 route allowlist 未放行 `POST /threads`。

维护者现已明确宣布：**旧 V1 文档中的固定 route allowlist 不再具有规范效力。** Remote 能力真相改为运行时 `manifest routes + device scope`；静态文档只能描述当前能力，不得再作为永久封闭清单阻止已经明确授权的 Mobile 能力。

协议版本号仍保持 `1`，因为本卡不改变配对 URI、凭据格式、Transport、消息 envelope 或重连语义；失效的是“V1 固定 allowlist 永久封闭”的规则，不是整个 Remote Host V1 协议。

## 目标

让已配对 Mobile 用户从现有“聊天”入口创建一个真实 canonical Thread，并直接进入该 Thread，不在 Mobile 创建第二套会话数据。

## 权限与兼容决定

- `POST /threads` 进入 Remote Gateway 的显式能力映射。
- 本卡继续复用现有 `messages:write` 作为 0.2.x 已配对设备的会话写兼容 scope，使已有设备无需重新配对即可创建 Thread。
- `manifest.routes.threads` 必须真实声明 `POST /threads`；Mobile 同时检查 `messages:write` 与该 route，缺任一项均不得创建。
- `PATCH /threads/:id`、archive/restore、bulk history cleanup、Workspace 创建/编辑仍未授权；本卡不得借“allowlist 失效”扩大到未批准能力。
- 后续若引入语义更准确的 `threads:write`，必须有显式迁移方案，不在本卡静默改变旧设备权限。

## Mobile 范围

允许修改：

- `src/api/miraHostClient.ts`
- `src/components/CustomDrawer.tsx`
- 与上述能力直接相关的测试
- Remote canonical 文档、任务卡索引与 `docs/work-ledger.md`

要求：

1. `createSession()` 必须先读取 manifest，并验证 `messages:write` + `POST /threads`。
2. 通过现有 `RemoteMiraHostClient.createThread()` 创建 canonical Thread。
3. Drawer 底部“聊天”按钮调用同一真实创建路径；创建中防重复点击。
4. 成功后关闭 Drawer 并直接进入新 Thread 的 Chat。
5. 403、网络错误、旧 Host 未声明 route 等失败必须真实提示；不得本地伪造 Thread。
6. 不修改 MOB-012 Agent wrapper、MOB-013 Message renderer、MOB-014 查找/分享语义。

## Desktop / Host 范围

允许修改：

- `server/src/services/remote-device-auth.service.ts`
- 对应 Remote Gateway 测试
- `server/src/routes/remote-access.ts`
- 对应 manifest / route 测试
- Remote access 文档

要求：

1. `POST /threads` 显式映射为现有 `messages:write` 兼容 scope。
2. 仍复用 canonical `/threads` route 与 `threadService.createThread()`；Remote Gateway 不实现第二套 Thread 创建逻辑。
3. `request.authUser` 继续由设备凭据映射出的 owner user 决定，不能由 Mobile body 指定 user。
4. manifest 宣告 `POST /threads`。
5. 其它 Thread / Workspace 写 route 继续默认拒绝。

## 测试要求

### Desktop

- `POST /threads` -> `messages:write`；
- `PATCH /threads/:id`、`POST /threads/:id/archive`、`DELETE /threads/history` 等仍拒绝；
- manifest 中出现 `POST /threads`；
- 没有 `messages:write` 的设备仍不能通过 Remote Gateway 创建 Thread。

### Mobile

- manifest 缺 `messages:write` 时不调用 `createThread()`；
- manifest 缺 `POST /threads` 时不调用 `createThread()`；
- 两者同时具备时返回 canonical Session；
- Drawer 创建中不重复提交，成功后进入真实 Chat；
- 创建失败不插入假会话。

## 验收

1. 现有已配对 0.2.x 设备无需重新配对即可使用新建会话；
2. “聊天”不再是空按钮；
3. 新 Thread 出现在 Desktop / Mobile 同一 canonical Thread 列表；
4. 新 Thread 可立即发送消息并沿用现有 persisted chat stream；
5. 固定 V1 allowlist 已在文档中明确失效，runtime manifest + scope 成为能力真相；
6. 未授权的其它写能力没有被顺带放开。

## 非目标

- 不实现 Thread 重命名；
- 不实现 archive / restore；
- 不实现 Workspace 创建；
- 不实现 Role / Agent 新建会话选择器；
- 不新增第二套 Thread API；
- 不升级 Transport 或 pairing protocol version。
