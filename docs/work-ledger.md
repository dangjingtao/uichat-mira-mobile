# Mobile 工作台账

更新时间：2026-08-28（Asia/Shanghai）

本台账是当前移动端线程、项目与角色展示工作的统一事实来源。任务状态、Host 依赖、产品决定和验收结果统一在此维护，避免把设计稿状态、移动端推断或代理调查结论误当成已经可用的服务端能力。

旧 Remote / Relay / Tailscale 工程线已于 2026-08-27 归档；历史文档继续保留为协议与验收证据，但不再覆盖本台账的当前排期。

## 当前协作约定

- 当前阶段已进入受控实施；维护者已明确授权 MOB-001 至 MOB-006。
- MOB-007 至 MOB-010 已完成任务卡定义并纳入总台账；当前仅派卡，尚未开始对应业务代码施工。
- 移动端继续消费 Mira Desktop / Mira Host 的权威线程、项目和角色业务数据，不猜测远端接口字段。
- Desktop #77 / #78 / #80 已完成合同实现并合入 Desktop `dev`；Mobile 通过 MOB-010 统一完成正式 Remote 合同适配和真实联调，不重开旧任务历史。
- 线程置顶与未读首轮明确为 Mobile **设备级本地 UI 状态**，分别由 MOB-007 / MOB-008 实现；不得把本机状态伪装成账户级或跨端统一状态。
- 任何跨到 Mira 桌面端或服务端的协议问题，记录为依赖；未经维护者明确授权，不修改 Desktop / Host 代码。
- 当前施工分支：`dev`。

## 任务卡总览

| ID | 任务卡 | 范围 | 状态 | 负责人 | 依赖 |
|---|---|---|---|---|---|
| MOB-001 | 线程与项目数据契约确认 | 核对 `workspaceId`、`roleId`、`agentEnabled`、项目/角色名称、读状态、置顶状态及可用接口 | Mobile 侧字段保留已合入 `dev` 并通过 typecheck/lint/Jest；Workspace/Role Remote 合同已由 Desktop 交付，适配转 MOB-010 | `mob_001_contract` | MOB-010 |
| MOB-002 | 项目列表页 | 核对项目字段、筛选、真实置顶显示规则和缺省状态 | 原 Mobile 列表实现已完成；Desktop #77 已交付 `/remote/v1/workspaces`，现有 `/chat-workspaces` 读取适配由 MOB-010 收口 | `mob_002_workspace_list` | MOB-001, MOB-010 |
| MOB-003 | 项目详情页 | 设计项目详情/项目线程列表层级，核对导航数据与返回路径 | 原代码实施完成；Desktop #80 已交付 Workspace Thread 权威分页，替换全量 Thread + 本地过滤的适配由 MOB-010 收口 | `mob_003_workspace_detail` | MOB-001, MOB-002, MOB-010 |
| MOB-004 | 项目线程层级导航 | 核对“项目列表 → 项目详情线程列表 → 具体线程”在现有路由中的落点和状态传递 | **有条件完成**：Mobile 侧层级规则已完成；待 MOB-010 接入 #77/#80 正式接口并完成真机项目闭环后升级为完全完成 | `mob_004_hierarchy_nav` | MOB-001, MOB-002, MOB-003, MOB-010 |
| MOB-005 | 线程类型视觉区分 | 核对普通、角色、Agent 三类图标映射和字段共存优先级 | 原视觉分类代码完成；Desktop #78 已交付 `/remote/v1/roles`，权威角色名补充展示由 MOB-010 收口 | `mob_005_visual_kinds` | MOB-001, MOB-010 |
| MOB-006 | 真实线程状态与验收 | 核对真实标题、错误态、状态真实性，整理测试与视觉验收清单 | 代码实施完成并通过 typecheck/lint/Jest；自动化平台构建与真机视觉/网络验收单独执行 | `mob_006_truth_acceptance` | MOB-001, MOB-002, MOB-005 |
| MOB-007 | 本机线程置顶 | 以稳定线程 ID 持久化本机置顶，支持置顶/取消置顶与稳定排序，不写回 Remote Thread | 待实施；任务卡已创建，Desktop #79 不再作为依赖 | `mob_007_local_pinning` | MOB-006 |
| MOB-008 | 本机未读状态 | 持久化本机已读进度，以真实消息进度判定未读；仅表达当前设备是否读过 | 待实施；任务卡已创建，Desktop #79 不再作为依赖 | `mob_008_device_unread` | MOB-006 |
| MOB-009 | 简化桌面配对页与 Mira 链接兜底 | 移除主流程 Direct/Host 地址配置；保留扫码并增加 `mira://pair?...` 粘贴兜底 | 待实施；任务卡已创建；不修改 Desktop / Pairing V1 协议 | 待派工 | 现有 Remote Pairing V1 |
| MOB-010 | Desktop Remote 合同接入收口 | 对齐 `/remote/v1/workspaces`、`/remote/v1/roles`、Workspace Thread 权威分页，完成 #77/#78/#80 Mobile 联调验收 | 待实施；Desktop 正式合同已交付并合入 `dev` | `mob_010_remote_contract_alignment` | Desktop #77 / #78 / #80 |

## 已确认产品规则

- Mobile 的“项目”与 Mira Desktop 现有 `ChatWorkspace` 是同一实体，不新增第二套 Project 模型。
- `workspaceId` 线程必须保留项目归属，并通过项目层级进入具体线程。
- `agentEnabled=true` 的合法 PC 数据必须绑定 `workspaceId`；Agent 完整接入和交互暂不在本轮。
- `roleId` 表示绑定角色的普通线程，界面需要体现角色身份。
- 普通聊天使用默认气泡图标；角色聊天使用人物图标；Agent 聊天使用独立图标。
- Agent 图标优先级高于角色图标；否则有 `roleId` 时使用人物图标，其余使用气泡图标。
- 线程名称、归属、角色、Agent 等业务属性必须来自 Host 真实数据。
- Desktop #77 的 Workspace Mobile-safe 真相入口为 `GET /remote/v1/workspaces`，返回 `id/name/isDefault/status/createdAt/updatedAt`，Mobile 不依赖 `rootPath`。
- Desktop #78 的 Role Mobile-safe 真相入口为 `GET /remote/v1/roles`，首轮仅消费 `id/name`，不调用原始 `/roles`，不复制内部 Role 配置。
- Desktop #80 的 Workspace Thread 真相入口为 `GET /remote/v1/workspaces/:workspaceId/threads`，Mobile 使用 `items/total/nextCursor/limit`，不再把“拉全量 Thread 后本地过滤”作为长期合同。
- #77 / #78 / #80 暂保持 open，作为跨端交付验收入口；MOB-010 完成真实接入与联调后由 Mobile 侧按验收结果关闭。
- 线程置顶首轮为设备级本地状态：本机持久化，只影响当前手机排序与展示，不写回 Remote Thread。
- 线程未读首轮为设备级本地状态：优先记录 `lastReadMessageId` / `lastReadAt` 或等价已读进度，只表达当前手机是否读过最新真实内容。
- Desktop Issue #79 已关闭为 `not planned`；只有未来明确需要 Desktop ↔ Mobile / 多 Mobile 同步时，才另建账户级线程状态同步能力。
- “连接桌面端”主流程只要求用户理解扫码/粘贴 Mira 配对链接、等待桌面授权和完成连接；Direct / Relay 是 transport 细节，不在主页面让用户配置或选择。
- 扫码失败兜底输入只接受 Mira 配对 URI，例如 `mira://pair?...`，并必须与扫码复用同一套 `parsePairingUriV1()` / `loadPairingUri()` / `useRemotePairing()` 流程。

> 说明：下方 MOB-001～MOB-006 的实施记录保留其发生当时的事实和判断；Desktop #77/#78/#80 后续合同交付后的最新状态，以本页任务卡总览、已确认产品规则及 MOB-010 为准，不回写篡改历史施工记录。

## 第一轮调查结论

### MOB-001：线程与项目数据契约确认

- Host Thread 权威数据包含 `workspaceId`、`knowledgeBaseId`、`roleId`、`agentEnabled` 和 `status`，但没有互斥的 `threadType` / `kind`。
- 移动端协议层已经解析这些字段；此前 `RemoteThread -> Session` 映射和 `Session` 类型只保留 `id`、`title`、`updatedAt`，导致 UI 无法使用线程属性。
- `workspaceId` 是 Chat Workspace ID。Host 约束为 Agent Thread 必须绑定 Workspace；移动端只展示该关系，不自行修补异常数据。
- 项目名称的权威来源是 Desktop `ChatWorkspace` / `/chat-workspaces`，角色名称的权威来源是 Host `/roles`。
- Host 当前没有账户级线程已读/未读或置顶字段，也没有相应查询和持久化语义。
- 实施原则：`Session` 保留上述 Host 业务属性；项目和角色使用独立规范化只读实体；设备级置顶/未读由 MOB-007 / MOB-008 的本地 UI 状态层负责，不污染 Remote Thread 模型。

主要证据：

- 移动端解析：`src/protocol/remoteHostV1.ts`
- 移动端 Adapter：`src/api/miraHostClient.ts`
- 移动端 Session：`src/types/index.ts`
- Desktop Workspace：`desktop/src/shared/api/thread.ts`、`desktop/src/features/chat/components/UChatThreadListSidebar.tsx`（Mira 主工程）
- Host Thread：`server/src/services/thread.service.ts`（Mira 主工程）

### MOB-001：第二轮实施记录

实施结果已合入：`dev`。

已实施：

- `Session` 增加 `workspaceId`、`knowledgeBaseId`、`roleId`、`agentEnabled`、`status`。
- 为兼容现有集中 Mock / Story 数据，上述字段在 `Session` 类型层暂为 optional；真实 `RemoteThread -> Session` Adapter 会显式传入 Host 返回值，包括 `null`。
- `listSessions()` 与 `getSession()` 共用映射，确保真实 Thread 属性不再在 Adapter 层丢失。
- 原有 `miraHostClient` 测试全部保留，并新增列表与单线程映射测试。
- 未新增 Host `isUnread`、`isPinned`、`threadKind`，未猜测 Workspace/Role 名称。

自动化验证：

- GitHub Actions `Mobile CI #240`：`Typecheck, lint and test` 成功。
- `Typecheck`：success。
- `Lint`：success。
- `Test`：success。

当前剩余：

- Role 的 Mobile-safe 读取合同仍未完成。
- Workspace 的远程读取放行与安全投影转由 Desktop Issue #77 跟踪。
- 角色名继续等待权威合同；置顶/未读不再等待 Host 合同，分别转由 MOB-007 / MOB-008 以设备级本地状态实现。

### MOB-002：项目列表页

产品与 Desktop 事实源：

- Mobile 的“项目”对应 Desktop `ChatWorkspace`，字段为 `id`、`name`、`rootPath`、`isDefault`、`status`、`createdAt`、`updatedAt`。
- Desktop 已有 `listChatWorkspaces() -> GET /chat-workspaces`，Desktop 现有侧边栏也是先读取 Workspace，再按 `thread.workspaceId === workspace.id` 组织线程。
- `rootPath` 是 Desktop / Host 本机路径，不属于 Mobile UI 所需字段；Mobile-safe 投影应排除它。
- 没有项目置顶、创建者、共享状态、成员、线程数、封面或描述的权威字段；本轮不模拟。

当前 Mobile `dev` 已存在真实 Workspace 读取实现：

- `src/api/workspaceApi.ts` 按 Desktop `ChatWorkspace` 合同读取 `/chat-workspaces`，负责 Direct / Relay 传输，不另造 Project 模型。
- `WorkspaceListScreen` 已展示真实 `name`、`isDefault`、`status` 与更新时间，并区分 loading / empty / error / data。
- 项目列表不显示裸 `workspaceId`，不制造项目名。
- 当前 `workspaceApi` 仍按 Desktop 原始响应解析 `rootPath`；虽然 UI 不展示，但 Mobile-safe 合同仍应在传输边界排除该字段。此项由 Desktop Issue #77 跟踪，不在 Mobile 侧偷偷修改 Desktop。

自动化验证：

- GitHub Actions `Mobile CI #263`：早期项目入口/状态实现的 `Typecheck, lint and test` 成功。
- 后续真实 Workspace 读取代码已进入 `dev`，与 MOB-003 最终提交一起继续接受 Mobile CI 验证。

当前剩余：

- Desktop Issue #77：为已配对 Mobile Device 提供 `ChatWorkspace` 只读能力，并明确 Mobile-safe 响应不暴露 `rootPath`。
- 在 #77 完成前，真实设备通过当前 Remote credential 访问 `/chat-workspaces` 仍可能收到 401/403；这属于传输合同，不改变“项目 = ChatWorkspace”的产品定义。

### MOB-003：项目详情页

代码实施已完成并合入 `dev`：

- 新增 `WorkspaceDetail` Stack 路由，唯一输入为 `{ workspaceId, workspaceName }`；两项都必须来自真实 Workspace，不接受客户端猜测。
- 新增 `WorkspaceDetailScreen`。进入或重新聚焦页面时读取真实 Session 列表，只保留 `session.workspaceId === workspaceId` 的线程，并按 `updatedAt` 倒序展示。
- 项目详情复用 MOB-005 的 `SessionKindIcon`，项目内普通 / 角色 / Agent 线程继续保持统一视觉分类和可访问性文案。
- 项目详情明确区分 loading / empty / error / data；读取失败沿用真实会话错误映射并提供重试。
- 路由参数缺少真实 `workspaceId` 或 `workspaceName` 时显示“项目数据无效”，不展示裸 ID、不生成替代项目名。
- `WorkspaceListScreen` 的真实 Workspace 行已改为可点击，并传真实 `item.id + item.name` 进入 `WorkspaceDetail`。
- 项目详情点击真实线程后进入 `Chat({ sessionId, title })`；标准 Stack 返回顺序为 Chat -> WorkspaceDetail -> WorkspaceList。
- 新增 `workspaceDetailState.ts` 与 Jest 覆盖，验证 Workspace 参数合同、按 `workspaceId` 精确过滤及更新时间排序。
- 本轮未修改 Mira Desktop / Host 代码。

自动化验证：

- GitHub Actions `Mobile CI #273`：`Typecheck, lint and test` 成功。
- `Typecheck`：success。
- `Lint`：success。
- `Test`：success。
- Android / iOS 平台构建由同一 CI 独立执行；MOB-003 的代码级完成不以平台构建替代真机验收。

当前剩余：

- `WorkspaceList -> WorkspaceDetail` 的运行时可用性仍依赖 Desktop #77 是否允许配对设备读取 Workspace；003 自身不需要再修改 Desktop。
- 全局其它 Chat 入口是否必须经过项目层级，属于 MOB-004，不在 MOB-003 偷做。

### MOB-004：项目线程层级导航

**状态：有条件完成。** Mobile 侧实现与代码级验证已完成；升级为“完全完成”的条件是 Desktop Issue #77 放行 Workspace Remote 读取后，完成真实设备的项目层级闭环回归。

代码实施已完成并合入 `dev`：

- 新增共享 `resolveSessionOpenTarget()`，主会话列表、抽屉最近会话、搜索结果三个全局入口统一消费同一层级规则。
- 无有效 `workspaceId` 的普通 / 角色线程仍直接进入 `Chat`；`roleId` 不改变归属层级。
- 任何带有效 `workspaceId` 的线程都不再从全局入口直接进入 `Chat`，而是先进入项目列表，再使用 MOB-003 的真实 Workspace 行进入 `WorkspaceDetail -> Chat`。
- `agentEnabled=true` 且缺少有效 `workspaceId` 时按 Host 契约异常处理，显示明确错误，不降级为普通线程。
- 主列表、抽屉和搜索结果对项目线程增加“项目会话 / 从项目中打开”提示；不展示裸 `workspaceId`，不猜项目名称。
- 如果 `/chat-workspaces` 的 Mobile Remote 权限尚未放行，页面停留在项目层级展示真实 401/403/网络错误，不绕过层级进入 Chat。
- 新增 `sessionNavigation.test.ts` 覆盖普通线程、Workspace 线程、Workspace Agent 与非法 Agent。
- 本轮未修改 Mira Desktop / Host，也未新增或猜测 Remote API。

自动化验证：

- GitHub Actions `Mobile CI #282`：`Typecheck, lint and test` 成功。
- `Typecheck`：success。
- `Lint`：success。
- `Test`：success。
- PR #25 已 squash 合入 `dev`，提交 `ff0edfe`。
- Android / iOS 平台构建由同一 CI 独立执行；MOB-004 为 JS/TS 导航层改动，代码级完成不以平台构建替代真机验收。

完成条件 / 当前剩余：

- Desktop Issue #77 完成后，使用已配对真实设备验证 `主列表 / Drawer / Search -> WorkspaceList -> WorkspaceDetail -> Chat` 的完整路径、返回路径与错误恢复。
- 在上述运行时闭环验收通过前，MOB-004 保持“有条件完成”，不升级为“完全完成”。
- 真机视觉覆盖继续并入 MOB-006 的设备验收清单。

### MOB-005：线程类型视觉区分

代码实施已完成并合入 `dev`：

- 使用现有 `lucide-react-native`，不新增依赖或自绘资产：
  - 普通聊天：`MessageSquare`
  - 角色聊天：`UserRound`
  - Agent 聊天：`Bot`
- 新增共享 `SessionKindIcon` / `getSessionVisualKind()`，唯一派生顺序为：`agentEnabled === true` -> 有效非空 `roleId` -> 普通聊天。
- `workspaceId` 和 `knowledgeBaseId` 继续只作为归属/能力属性，不覆盖三类主图标。
- 主会话列表、抽屉最近会话、搜索结果统一消费同一映射，不再各自硬编码图标或空色块。
- 三个入口统一可访问性文案：`Agent 对话` / `角色对话` / `普通对话` + Host 真实线程标题。
- 角色名或项目名不可读取时，只显示类型图标和真实线程标题；不展示原始 ID，不猜名称。
- 新增 `SessionKindIcon.test.ts`，覆盖 Agent 优先级、角色识别、空白 `roleId` 和缺省普通会话。

自动化验证：

- GitHub Actions `Mobile CI #255`：`Typecheck, lint and test` 成功。
- `Typecheck`：success。
- `Lint`：success。
- `Test`：success。
- 设备视觉覆盖并入 MOB-006。

### MOB-006：真实线程状态与验收

代码实施已完成并合入 `dev`：

- `src/screens/SessionListScreen.tsx` 已移除按 index 伪造的未读点、置顶图标和“置顶/最近对话”假分组；列表只展示 Host 真实标题与更新时间。
- `src/components/CustomDrawer.tsx` 不再把 `sessions[0]` 伪造成“已置顶”，真实会话统一按“最近”展示。
- `src/screens/SearchScreen.tsx` 已将 loading / success-empty / success-data / error 明确分离；骨架不再承担空结果或失败状态。
- 主列表、抽屉、搜索均提供真实错误状态和可操作重试；401、403、网络失败分别给出不同提示。
- 新增 `sessionCollectionState.ts` 统一列表四态判定与错误映射，并增加基础 Jest 覆盖。
- `ChatScreen` 不再永久依赖导航标题快照：进入或重新聚焦 Chat 时重新读取 Host `getSession()` 权威标题，发送后也会再次刷新；Host 临时不可读时保留上一次真实标题，不生成替代标题。
- Chat 历史读取失败不再显示空白：401、403、404、网络失败分别给出真实错误提示，并提供明确重试入口。
- 新增 `chatSessionState.ts` 与 Jest 覆盖，验证 Host 权威标题读取和聊天历史错误映射。
- `ConversationMenu` 中尚无真实合同/实现的会话动作统一呈现为 disabled，不再产生“点击即已执行”的假状态；顶部分享按钮同样在真实实现前禁用。
- MOB-006 本身仍不向 Remote `Session` 注入伪造 `isUnread` / `isPinned`；后续 MOB-007 / MOB-008 会在独立设备级本地 UI 状态层实现真实持久化状态。

自动化验证：

- GitHub Actions `Mobile CI #244`：第一轮 `Typecheck, lint and test` 成功。
- GitHub Actions `Mobile CI #249`：第二轮 Chat 标题/错误态/动作真实性改动的 `Typecheck, lint and test` 成功。
- `Typecheck`：success。
- `Lint`：success。
- `Test`：success。

当前剩余验收：

- 真机视觉/网络验收仍需覆盖 Android/iOS、浅色/深色、动态字体、长标题、多线程、慢网/断网/401/403、返回路径、VoiceOver/TalkBack。
- 置顶/未读不再是 Desktop / Host 阻塞；其设备级实现分别进入 MOB-007 / MOB-008。

### MOB-007：本机线程置顶

**状态：待实施。** 任务卡已创建：`docs/task-cards/MOB-007-local-thread-pinning.md`。

产品与实现边界：

- 以稳定 `thread/session id` 为键持久化本机置顶；首轮可使用 `threadId -> pinnedAt`，不无故引入 `pinOrder`。
- 置顶只影响当前手机的排序与展示，不写回 Remote Thread，不宣称 Desktop / 其他 Mobile 已同步。
- 主列表支持置顶、取消置顶；置顶组优先，同组默认继续按 Host `updatedAt` 倒序。
- Drawer / Search 如展示置顶标记，应复用同一状态源；Search 不因置顶修改搜索相关性排序。
- Host 删除 / 404 的线程允许清理本机置顶记录，避免幽灵会话。
- 本地 UI 状态不得塞入 `deviceCredentialStore` 等安全凭证存储。

验收至少覆盖：App 重启后置顶保留、取消置顶恢复普通排序、多置顶稳定排序、Host 刷新标题/更新时间不丢置顶，以及 typecheck / lint / Jest。

### MOB-008：本机未读状态

**状态：待实施。** 任务卡已创建：`docs/task-cards/MOB-008-device-local-unread.md`。

产品与实现边界：

- 未读是设备级 UI 状态，不进入 Remote Thread 真相模型。
- 优先持久化已读进度，如 `threadId -> lastReadMessageId / lastReadAt` 或等价稳定方案，不只存一个容易漂移的 `isUnread`。
- 打开 Chat 并成功读取当前线程权威消息后，才推进本机已读进度。
- 拉取到比本机已读进度更新的真实 assistant / user 内容时显示未读；读取失败、离线、401/403 不得误清未读。
- 主列表、Drawer、Search 如展示未读标记，必须复用同一状态源。
- Desktop 上是否已读不会自动改变 Mobile 状态，这是当前设备级语义的预期行为。

验收至少覆盖：新消息产生未读、成功打开后消除、App 重启后进度保留、慢网/断网/401/403 不误清、多线程互不串扰，以及 typecheck / lint / Jest。

### MOB-009：简化桌面配对页与 Mira 链接兜底

**状态：待实施。** 任务卡已创建：`docs/task-cards/MOB-009-pairing-screen-simplification.md`。

当前 `HostConfigScreen.tsx` 仍把 transport 工程细节直接暴露在主流程，包括 `Tailscale Direct`、`Mira Host 地址`、手工 Host URL、Direct 状态卡和“重新检查 Direct”。本任务将主流程收回到：

```text
扫码配对
  ↓
桌面授权
  ↓
连接完成
```

实施边界：

- 删除主页面整个 `Tailscale Direct` 卡片、Host 地址输入、Direct 状态框和重新检查按钮。
- 保留“扫码配对”为第一主操作。
- 扫码按钮下方增加“无法扫码？粘贴配对链接”兜底输入，只接受 `mira://pair?...`。
- 粘贴与扫码必须复用现有 `parsePairingUriV1()`、`loadPairingUri()`、`PairingDescriptorV1` 和 `useRemotePairing()` 状态流。
- 无效 Mira URI 显示协议解析错误，不进入 Host URL 探测逻辑。
- Direct / Relay 底层 transport 可以继续存在，但不再要求用户理解、选择或配置。
- 不修改 Desktop / Host，不修改 Remote Pairing V1 字段，不顺手重做网络诊断中心。

完成后至少通过 typecheck / lint / Jest、Android / iOS 构建，并真机验证扫码、粘贴链接、等待批准、拒绝/过期、完成配对五条路径。

### MOB-010：Desktop Remote 合同接入收口

**状态：待实施。** 任务卡已创建：`docs/task-cards/MOB-010-desktop-remote-contract-alignment.md`。

Desktop / Host 已完成并合入 `dev` 的正式交接合同：

- #77：`GET /remote/v1/workspaces`，Mobile-safe Workspace projection 不返回 `rootPath`；
- #78：`GET /remote/v1/roles`，只返回 `{ id, name }` Role summary；
- #80：`GET /remote/v1/workspaces/:workspaceId/threads?status=active&limit=50&cursor=<opaque>`，返回 `items / total / nextCursor / limit`。

本任务集中调整已经写完、但基于旧临时读取方式的 Mobile 代码：

1. `workspaceApi.ts` 从 `/chat-workspaces` 切换到 `/remote/v1/workspaces`，并从 Mobile projection 移除 `rootPath`；
2. `WorkspaceDetail` 从 `listSessions() -> 本地 workspaceId 过滤` 切换到 Host 权威 Workspace Thread 分页，正确处理 `total` 和 `nextCursor`；
3. 新增共享 Role summary 只读接入，以 `thread.roleId -> role.id -> name` 展示权威角色名；
4. 保留 Direct 网络失败 -> Relay fallback、Device Credential、401/403/404/网络错误真实性；
5. 不改变 MOB-004 项目层级、MOB-005 `Agent > Role > 普通` 优先级、MOB-006 四态错误规则，也不影响 MOB-007/008/009。

完成后必须通过 typecheck / lint / Jest、Android / iOS 构建，并使用包含 #77/#78/#80 的 Desktop 0.99.11 或等价 `dev` 构建完成真实配对联调。验收通过后由 Mobile 侧按交接要求关闭 Desktop #77/#78/#80。

## 跨端依赖与待维护者决定

1. Desktop #77 / #78 / #80 已完成合同实现并合入 `dev`；当前不再等待 Desktop 设计决定，转为 MOB-010 的 Mobile 接入与跨端验收。
2. #77 / #78 / #80 暂不关闭，待 Mobile 完成真实接入、权限/错误态和真机或等价远程联调后关闭。
3. 是否需要权威唯一 `threadKind` 仍未决定；若不需要，移动端继续只派生 UI 显示分类。

线程已读 / 置顶已从跨端阻塞中移除：Desktop #79 已关闭为 `not planned`，当前由 MOB-007 / MOB-008 负责设备级本地实现。

## 实施授权门槛

- MOB-001：已获得维护者明确实施授权；Mobile 侧最小字段映射已合入 `dev`。
- MOB-002：已获得维护者明确实施授权；原项目列表实现已完成，正式 Workspace Remote 适配转 MOB-010。
- MOB-003：已获得维护者明确实施授权；原项目详情与层级实现已完成，Workspace Thread 权威分页适配转 MOB-010。
- MOB-004：已获得维护者明确实施授权；层级规则已完成，待 MOB-010 完成后做真实闭环验收。
- MOB-005：已获得维护者明确实施授权；三类视觉映射已完成，Role summary 名称接入转 MOB-010。
- MOB-006：已获得维护者明确实施授权；代码实施已完成并通过自动化代码级验证，真机验收仍单独记录。
- MOB-007：已完成任务卡和产品边界定义；当前未开始业务代码施工。
- MOB-008：已完成任务卡和产品边界定义；当前未开始业务代码施工。
- MOB-009：已完成任务卡和产品边界定义；当前未开始业务代码施工。
- MOB-010：已完成任务卡和 Desktop 正式合同核对；当前未开始业务代码施工。
- 默认不修改 Mira Desktop / Host 仓库；任何跨仓修改必须再次明确授权。

## 建议实施顺序

1. MOB-010：优先接住 Desktop 0.99.11 已交付的 #77/#78/#80，避免 Mobile 继续依赖已经过时的 `/chat-workspaces` 与全量 Thread 本地过滤方式。
2. MOB-009：把配对主流程从网络工程配置页收回为“扫码 / 粘贴 Mira 链接 -> 桌面授权”，解决当前真机直接可见的问题。
3. MOB-007：实现本机线程置顶，恢复真实而非伪造的置顶交互。
4. MOB-008：实现本机未读进度和判定，恢复真实而非伪造的未读提示。
5. MOB-006：继续完成 Android/iOS 真机视觉、网络和可访问性验收；007/008/009/010 完成后补相应回归。
6. MOB-004：MOB-010 接入完成后执行真实设备项目层级闭环回归，通过后标记完全完成。
7. MOB-001 / MOB-002 / MOB-003 / MOB-005：保留原完成历史，不重开；后续正式 Remote 合同适配统一由 MOB-010 记录。

## 交付记录

- 2026-08-27：创建统一移动端工作台账。
- 2026-08-27：真实派发 MOB-001 至 MOB-006；六张卡均完成只读现状核对，未修改业务代码、未提交、未推送。
- 2026-08-27：记录 Remote Workspace/Role 合同、假置顶/未读状态、项目层级导航与双端验收阻塞。
- 2026-08-27：旧 Remote / Relay / Tailscale 工程线归档，`docs/work-ledger.md` 升为当前工程任务主线。
- 2026-08-27：开始 MOB-001；补齐 Remote Thread 属性到 Session 的映射并增加回归测试。
- 2026-08-27：PR #23 的 `Typecheck, lint and test` 通过；MOB-001 合入 `dev`。
- 2026-08-27：开始 MOB-006；提交 `2d0c906` 到 `dev`，移除假置顶/未读/搜索假骨架，补齐 loading/empty/data/error 与重试、401/403/网络错误区分和基础测试。
- 2026-08-27：Mobile CI #244 的 `Typecheck, lint and test` 通过；MOB-006 第一轮状态清理完成。
- 2026-08-27：继续 MOB-006；补 Host 权威 Chat 标题刷新、聊天历史错误/重试、`chatSessionState` 测试，并禁用未接入的会话动作。
- 2026-08-27：Mobile CI #249 的 `Typecheck, lint and test` 通过；MOB-006 代码实施完成。
- 2026-08-27：开始 MOB-005；新增共享线程视觉分类与 `SessionKindIcon`，主列表、抽屉、搜索统一普通/角色/Agent 图标和可访问性文案。
- 2026-08-27：Mobile CI #255 的 `Typecheck, lint and test` 通过；MOB-005 代码实施完成。
- 2026-08-27：开始 MOB-002；核对 Desktop `ChatWorkspace` 与 Remote 读取边界；后续 Mobile `dev` 已出现真实 `workspaceApi` / WorkspaceList 读取实现。
- 2026-08-27：向 Mira Desktop 提交 Issue #77，请求配对设备 ChatWorkspace 只读能力与不暴露 `rootPath` 的 Mobile-safe 投影；不修改 Desktop 代码。
- 2026-08-27：开始 MOB-003；新增 `WorkspaceDetail` 路由、真实 Workspace 参数合同、按 `workspaceId` 精确过滤的项目线程列表、loading/empty/error/retry 和回归测试。
- 2026-08-27：WorkspaceList 真实项目行接入 `WorkspaceDetail({ workspaceId, workspaceName })`；详情线程进入 Chat，形成项目列表 -> 项目详情 -> Chat 的可运行 Mobile 路径。
- 2026-08-27：Mobile CI #273 的 `Typecheck, lint and test` 通过；MOB-003 代码实施完成，Desktop / Host 未在本轮修改。
- 2026-08-27：开始 MOB-004；新增统一线程打开策略，收紧主列表、抽屉、搜索三个全局入口，并为项目线程补充 UI 层级提示与非法 Agent 契约异常处理。
- 2026-08-27：Mobile CI #282 的 `Typecheck, lint and test` 通过；PR #25 squash 合入 `dev`，MOB-004 Mobile 侧代码实施完成。
- 2026-08-27：MOB-004 标记为“有条件完成”；完全完成条件为 Desktop #77 放行 Workspace Remote 读取后完成真实设备项目层级闭环回归。
- 2026-08-28：关闭 Desktop Issue #79 为 `not planned`；置顶与未读改由 Mobile 设备级本地状态实现，不再阻塞 Desktop / Host。
- 2026-08-28：新增 MOB-007《本机线程置顶》和 MOB-008《本机未读状态》任务卡；仅派卡，未施工业务代码。
- 2026-08-28：新增 MOB-009《简化桌面配对页与 Mira 链接兜底》任务卡；明确删除主流程 Direct/Host 地址工程配置，并以 Mira URI 粘贴作为扫码失败兜底；仅派卡，未施工业务代码。
- 2026-08-28：MOB-007 至 MOB-009 正式并入 `docs/work-ledger.md` 总台账，旧编号与历史交付记录保持不变。
- 2026-08-28：Desktop #77 / #78 / #80 正式合同已完成并合入 Desktop `dev`；Mobile 新增 MOB-010《Desktop Remote 合同接入收口》统一承接 Workspace、Role summary 与 Workspace Thread 分页适配。
- 2026-08-28：MOB-010 正式并入总台账；旧 MOB-002 / MOB-003 / MOB-005 完成记录保留，正式 Remote 合同增量适配不通过“重开旧卡”改写历史。
