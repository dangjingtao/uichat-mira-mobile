# MOB-024：Mobile 新建会话与动态 Remote Capability

状态：**有条件完成**

负责人：`mob_024_mobile_thread_creation`

执行仓库：`dangjingtao/uichat-mira-mobile` + `dangjingtao/uichat-mira`

## 背景与协议决定

Mobile 已具备 Thread 列表、读取、删除、发送消息、Agent 审批和媒体读取，但 Drawer 底部“聊天”入口此前仍是 UI-only。底层 `RemoteMiraHostClient.createThread()` 已存在，真正阻塞点是 Mobile 上层明确拒绝创建，以及 Desktop Remote Gateway 的旧 V1 固定 route allowlist 未放行 `POST /threads`。

维护者于 2026-08-29 明确宣布：**旧 V1 文档中的固定 route allowlist 不再具有规范效力。** Remote capability truth 改为运行时：

1. Remote Gateway 的显式 method/path -> scope 映射；
2. 当前 paired device 实际持有的 scope；
3. Host `/remote/v1/manifest` 当前声明的 route；
4. canonical Host route 的 owner-user / business validation。

协议版本仍为 `1`。失效的是“V1 固定 allowlist 永久封闭”的规则，不是 pairing URI、device credential、Transport、消息 envelope 或重连语义。

## 权限与兼容决定

- `POST /threads` 已进入 Remote Gateway 显式能力映射。
- 当前 0.2.x 继续复用已有 `messages:write` 作为会话写兼容 scope，使已经配对的设备无需仅为新增 route 重新配对。
- Mobile 必须同时看到 `messages:write` 与 manifest `POST /threads` 才可创建。
- `PATCH /threads/:id`、archive / restore、bulk history cleanup、Workspace 创建 / 编辑 / 删除仍未授权。
- 后续若引入语义更准确的 `threads:write`，必须有显式迁移方案，不得静默扩大旧设备权限。

## 已完成实现

### Desktop / Host

Desktop PR #88 已合入 `dev`，merge commit：

`e1752500cafd300bb6c9c82e9b5a610beb985d2c`

- `POST /threads` -> `messages:write`；
- manifest `routes.threads` 已声明 `POST /threads`；
- 继续复用 canonical `/threads` + `threadService.createThread()`，Remote Gateway 不复制创建逻辑；
- owner user 仍由 device credential 映射，不接受 Mobile 指定 user；
- gateway tests 明确覆盖未授权的 PATCH / archive / restore / bulk history routes；
- Host legacy V1 reference 已明确记录“固定 V1 allowlist 失效”。

Desktop `dev` push workflow `Build Desktop Apps` run `33253320062` 的 `Check dev` 已通过，`pnpm check` / Type check 为 success。

### Mobile

Mobile PR #65 已 squash 合入 `dev`，merge commit：

`a668bf503b3d540a1bd521e3792684af258de0d4`

- `PairedRemoteMiraHostClient.createSession()` 已真实启用；
- 创建前检查 `messages:write` + manifest `POST /threads`；
- Drawer “聊天”按钮已从空回调改为真实创建，创建中禁用重复点击，成功后直接进入 canonical Chat；
- 失败不插入本地假 Thread；
- 对创建这种一次性副作用，先用 idempotent manifest probe 选择 Transport，POST 发出后若响应不确定则返回 `THREAD_CREATE_UNCERTAIN`，不跨 Direct / Relay 重放，避免重复创建；
- canonical Remote 文档已声明 runtime capability contract，并明确旧固定 allowlist 只可作为历史快照、不能继续阻塞新能力。

Mobile PR #65 `Mobile CI` run `33253250769`：typecheck、lint、Jest 已通过；Android / iOS 平台构建仍由该 run 继续执行，不伪造其最终结果。

OpenCode Review run `33253250735` 对 PR head `f4b2ae5ed0e52986a40b59507d44514d2fef2001` 给出：**No high-confidence P0-P2 findings**。Reviewer 将真实设备 / Host interoperability 列为人工 validation gap，而非代码 finding。

## 自动化覆盖

### Desktop

- `POST /threads` -> `messages:write`；
- `PATCH /threads/:id`、archive / restore、`DELETE /threads/history` 等继续拒绝；
- manifest 中出现 `POST /threads`；
- Desktop `pnpm check` success。

### Mobile

- manifest 缺 `messages:write` 时不调用 `createThread()`；
- manifest 缺 `POST /threads` 时不调用 `createThread()`；
- 两者同时具备时返回 canonical Session；
- Direct probe 失败可以在 POST 前选择 Relay；
- POST 已派发但响应不确定时不向另一 Transport 重放；
- typecheck / lint / Jest success；
- AI Review 无高置信 P0-P2 finding。

## 待人工验收

MOB-024 当前只保留真实跨端 smoke，不阻塞代码合同进入 `dev`：

1. 使用一个此前已经完成 0.2.x 配对、持有 `messages:write` 的真实设备，不重新配对；
2. 更新 Desktop Host 与 Mobile 到包含 MOB-024 的版本；
3. 打开 Drawer，点击“聊天”一次；
4. 确认进入新 Thread；
5. Desktop 与 Mobile 列表均看到同一个 canonical Thread；
6. 立即发送一条消息，确认沿用现有 persisted chat stream；
7. 模拟旧 Host / scope 缺失时，确认 Mobile 显示真实不可用状态而不是本地伪造会话。

## 非目标

- 不实现 Thread 重命名；
- 不实现 archive / restore；
- 不实现 Workspace 创建；
- 不实现 Role / Agent 新建会话选择器；
- 不新增第二套 Thread API；
- 不升级 Transport 或 pairing protocol version。
