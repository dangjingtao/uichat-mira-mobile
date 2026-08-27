# Mobile 工作台账

更新时间：2026-08-27 23:38（Asia/Shanghai）

本台账是当前移动端线程、项目与角色展示工作的统一事实来源。任务状态、Host 依赖、产品决定和验收结果统一在此维护，避免把设计稿状态、移动端推断或代理调查结论误当成已经可用的服务端能力。

旧 Remote / Relay / Tailscale 工程线已于 2026-08-27 归档；历史文档继续保留为协议与验收证据，但不再覆盖本台账的当前排期。

## 当前协作约定

- 当前阶段已进入受控实施；维护者已明确授权 MOB-001 至 MOB-006。
- 未获得对应任务授权前，其余任务卡仍只做必要的依赖核对，不越界修改业务代码。
- 移动端只消费 Mira Desktop / Mira Host 的权威线程、项目和角色数据，不猜测接口字段，不伪造已读、未读或置顶状态。
- 任何跨到 Mira 桌面端或服务端的协议问题，记录为依赖；未经维护者明确授权，不修改 Desktop / Host 代码。
- 当前施工分支：`dev`。

## 任务卡总览

| ID | 任务卡 | 范围 | 状态 | 负责人 | 依赖 |
|---|---|---|---|---|---|
| MOB-001 | 线程与项目数据契约确认 | 核对 `workspaceId`、`roleId`、`agentEnabled`、项目/角色名称、读状态、置顶状态及可用接口 | Mobile 侧字段保留已合入 `dev` 并通过 typecheck/lint/Jest；Workspace/Role 远程读取合同仍分别处理 | `mob_001_contract` | Remote contract |
| MOB-002 | 项目列表页 | 核对项目字段、筛选、真实置顶显示规则和缺省状态 | Mobile 已按 Desktop `ChatWorkspace` 接真实项目列表读取并通过代码级验证；远程只读放行与 `rootPath` 安全投影由 Desktop Issue #77 跟踪 | `mob_002_workspace_list` | MOB-001, Desktop #77 |
| MOB-003 | 项目详情页 | 设计项目详情/项目线程列表层级，核对导航数据与返回路径 | 代码实施完成并通过 typecheck/lint/Jest；真实 Workspace 行可进入详情，详情按 `workspaceId` 精确过滤真实线程 | `mob_003_workspace_detail` | MOB-001, MOB-002 |
| MOB-004 | 项目线程层级导航 | 核对“项目列表 → 项目详情线程列表 → 具体线程”在现有路由中的落点和状态传递 | 代码实施完成并合入 `dev`；主列表、抽屉、搜索统一遵守项目层级，非法 Agent 不降级；typecheck/lint/Jest 通过 | `mob_004_hierarchy_nav` | MOB-001, MOB-002, MOB-003 |
| MOB-005 | 线程类型视觉区分 | 核对普通、角色、Agent 三类图标映射和字段共存优先级 | 代码实施完成并通过 typecheck/lint/Jest；三入口已统一视觉分类与可访问性文案 | `mob_005_visual_kinds` | MOB-001 |
| MOB-006 | 真实线程状态与验收 | 核对真实标题、已读/未读、置顶字段覆盖，整理测试与视觉验收清单 | 代码实施完成并通过 typecheck/lint/Jest；自动化平台构建与真机视觉/网络验收单独执行 | `mob_006_truth_acceptance` | MOB-001, MOB-002, MOB-005 |

## 已确认产品规则

- Mobile 的“项目”与 Mira Desktop 现有 `ChatWorkspace` 是同一实体，不新增第二套 Project 模型。
- `workspaceId` 线程必须保留项目归属，并通过项目层级进入具体线程。
- `agentEnabled=true` 的合法 PC 数据必须绑定 `workspaceId`；Agent 完整接入和交互暂不在本轮。
- `roleId` 表示绑定角色的普通线程，界面需要体现角色身份。
- 普通聊天使用默认气泡图标；角色聊天使用人物图标；Agent 聊天使用独立图标。
- Agent 图标优先级高于角色图标；否则有 `roleId` 时使用人物图标，其余使用气泡图标。
- 线程名称必须来自 Host 真实数据。
- 没有权威已读/未读字段时不显示状态。
- 没有权威置顶字段时不显示置顶状态；截图中的置顶仅是待实现设计。

## 第一轮调查结论

### MOB-001：线程与项目数据契约确认

- Host Thread 权威数据包含 `workspaceId`、`knowledgeBaseId`、`roleId`、`agentEnabled` 和 `status`，但没有互斥的 `threadType` / `kind`。
- 移动端协议层已经解析这些字段；此前 `RemoteThread -> Session` 映射和 `Session` 类型只保留 `id`、`title`、`updatedAt`，导致 UI 无法使用线程属性。
- `workspaceId` 是 Chat Workspace ID。Host 约束为 Agent Thread 必须绑定 Workspace；移动端只展示该关系，不自行修补异常数据。
- 项目名称的权威来源是 Desktop `ChatWorkspace` / `/chat-workspaces`，角色名称的权威来源是 Host `/roles`。
- Host 当前没有线程已读/未读或置顶字段，也没有相应查询和持久化语义。
- 实施原则：`Session` 保留上述线程属性；项目和角色使用独立规范化只读实体；`isUnread` / `isPinned` 暂不进入模型。

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
- 未新增 `isUnread`、`isPinned`、`threadKind`，未猜测 Workspace/Role 名称。

自动化验证：

- GitHub Actions `Mobile CI #240`：`Typecheck, lint and test` 成功。
- `Typecheck`：success。
- `Lint`：success。
- `Test`：success。

当前剩余：

- Role 的 Mobile-safe 读取合同仍未完成。
- Workspace 的远程读取放行与安全投影转由 Desktop Issue #77 跟踪。
- 在合同出现之前，不为角色名、未读或置顶制造客户端替代字段。

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

当前剩余：

- Desktop Issue #77 仍决定真实设备是否能读取 Workspace；该跨端依赖不再阻塞 Mobile 的层级 UI、路由规则和异常处理完成状态。
- 真机返回路径与视觉覆盖并入 MOB-006 的设备验收清单。

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
- 未新增 `isUnread`、`isPinned` 或任何客户端自造线程状态。

自动化验证：

- GitHub Actions `Mobile CI #244`：第一轮 `Typecheck, lint and test` 成功。
- GitHub Actions `Mobile CI #249`：第二轮 Chat 标题/错误态/动作真实性改动的 `Typecheck, lint and test` 成功。
- `Typecheck`：success。
- `Lint`：success。
- `Test`：success。

当前剩余验收：

- 真机视觉/网络验收仍需覆盖 Android/iOS、浅色/深色、动态字体、长标题、多线程、慢网/断网/401/403、返回路径、VoiceOver/TalkBack。
- Host 尚未定义线程已读/未读与置顶的持久化、多设备同步和写权限语义；这不是 Mobile 可自行补齐的代码缺口。在合同出现前 UI 继续零展示、零操作。

## 跨端依赖与待维护者决定

1. Desktop Issue #77：为配对设备提供 `ChatWorkspace` 只读能力，并确保 Mobile-safe 响应不暴露 `rootPath`。
2. Role 是否新增只读 scope / route，或在 Thread 中返回最小 `roleSummary`。
3. 是否需要权威唯一 `threadKind`；若不需要，移动端继续只派生 UI 显示分类。
4. 是否定义线程已读和置顶的持久化、多设备同步与写权限语义；未定义前 UI 零展示、零操作。
5. 项目线程数量由 Desktop / Host 返回，还是首轮由移动端在完整线程列表中按 `workspaceId` 计算；需要同时考虑分页和数据量。

## 实施授权门槛

- MOB-001：已获得维护者明确实施授权；Mobile 侧最小字段映射已合入 `dev`。
- MOB-002：已获得维护者明确实施授权；Mobile 已按 Desktop `ChatWorkspace` 落真实列表读取；跨端只读权限与安全投影由 #77 跟踪。
- MOB-003：已获得维护者明确实施授权；项目详情、真实线程过滤、WorkspaceList -> WorkspaceDetail -> Chat 路径已完成并通过自动化代码级验证。
- MOB-004：已获得维护者明确实施授权；三个全局线程入口的项目层级规则已完成并通过自动化代码级验证。
- MOB-005：已获得维护者明确实施授权；三类线程视觉映射与可访问性统一已完成并通过自动化代码级验证。
- MOB-006：已获得维护者明确实施授权；代码实施已完成并通过自动化代码级验证，真机验收仍单独记录。
- 默认不修改 Mira Desktop / Host 仓库；任何跨仓修改必须再次明确授权。

## 建议实施顺序

1. MOB-001：Mobile 属性映射已完成；Role Remote 合同仍待处理，Workspace 合同由 #77 跟踪。
2. MOB-006：代码实施完成；仅剩设备视觉/网络验收。
3. MOB-005：代码实施完成；设备视觉覆盖并入 MOB-006。
4. MOB-002：Mobile 真实项目列表代码已存在；跨端只读权限与 `rootPath` 安全投影等待 #77。
5. MOB-003：代码实施完成；运行时项目读取依赖 #77。
6. MOB-004：代码实施完成；运行时 Workspace 读取依赖 #77，真机返回路径并入 MOB-006。

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
- 2026-08-27：Mobile CI #282 的 `Typecheck, lint and test` 通过；PR #25 squash 合入 `dev`，MOB-004 代码实施完成。