# Mobile 工作台账

更新时间：2026-08-27 22:18（Asia/Shanghai）

本台账是当前移动端线程、项目与角色展示工作的统一事实来源。任务状态、Host 依赖、产品决定和验收结果统一在此维护，避免把设计稿状态、移动端推断或代理调查结论误当成已经可用的服务端能力。

旧 Remote / Relay / Tailscale 工程线已于 2026-08-27 归档；历史文档继续保留为协议与验收证据，但不再覆盖本台账的当前排期。

## 当前协作约定

- 当前阶段已进入受控实施；维护者已明确授权 MOB-001 与 MOB-006。
- 未获得对应任务授权前，其余任务卡仍只做必要的依赖核对，不越界修改业务代码。
- 移动端只消费 Mira Host 的权威线程、项目和角色数据，不猜测接口字段，不伪造已读、未读或置顶状态。
- 任何跨到 Mira 桌面端或服务端的协议问题，记录为依赖，不在本仓库越界修改。
- 当前施工分支：`dev`。

## 任务卡总览

| ID | 任务卡 | 范围 | 状态 | 负责人 | 依赖 |
|---|---|---|---|---|---|
| MOB-001 | 线程与项目数据契约确认 | 核对 `workspaceId`、`roleId`、`agentEnabled`、项目/角色名称、读状态、置顶状态及可用接口 | Mobile 侧字段保留已合入 `dev` 并通过 typecheck/lint/Jest；Host Workspace/Role Remote 契约仍待决定 | `mob_001_contract` | Host Remote 契约 |
| MOB-002 | 项目列表页 | 核对项目字段、筛选、真实置顶显示规则和缺省状态 | 只读核对完成，等待 Host 契约与参考图 | `mob_002_workspace_list` | MOB-001 |
| MOB-003 | 项目详情页 | 设计项目详情/项目线程列表层级，核对导航数据与返回路径 | 只读核对完成，等待 Host 契约与实施授权 | `mob_003_workspace_detail` | MOB-001, MOB-002 |
| MOB-004 | 项目线程层级导航 | 核对“项目列表 → 项目详情线程列表 → 具体线程”在现有路由中的落点和状态传递 | 只读核对完成，等待 MOB-001～003 可实施 | `mob_004_hierarchy_nav` | MOB-001, MOB-002, MOB-003 |
| MOB-005 | 线程类型视觉区分 | 核对普通、角色、Agent 三类图标映射和字段共存优先级 | MOB-001 Mobile 字段映射已合入，等待实施授权 | `mob_005_visual_kinds` | MOB-001 |
| MOB-006 | 真实线程状态与验收 | 核对真实标题、已读/未读、置顶字段覆盖，整理测试与视觉验收清单 | 假置顶/未读/搜索假骨架已移除，加载状态与错误重试已实施并通过 typecheck/lint/Jest；设备视觉验收与 Chat 标题刷新仍待 | `mob_006_truth_acceptance` | MOB-001, MOB-002, MOB-005 |

## 已确认产品规则

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
- 项目名称的权威来源是 Host `/chat-workspaces`，角色名称的权威来源是 Host `/roles`。
- 当前配对设备 Remote Host V1 的 scope 和 manifest 均未开放 Workspace/Role 读取，这是项目名称和角色名称接入的硬依赖。
- Host 当前没有线程已读/未读或置顶字段，也没有相应查询和持久化语义。
- 实施原则：`Session` 保留上述线程属性；项目和角色使用独立规范化只读实体；`isUnread` / `isPinned` 暂不进入模型。

主要证据：

- 移动端解析：`src/protocol/remoteHostV1.ts`
- 移动端 Adapter：`src/api/miraHostClient.ts`
- 移动端 Session：`src/types/index.ts`
- Host Thread：`server/src/services/thread.service.ts`（Mira 主工程）
- Remote 权限：`server/src/services/remote-device-auth.service.ts`、`server/src/routes/remote-access.ts`（Mira 主工程）

### MOB-001：第二轮实施记录

实施结果已合入：`dev`。

已实施：

- `Session` 增加 `workspaceId`、`knowledgeBaseId`、`roleId`、`agentEnabled`、`status`。
- 为兼容现有集中 Mock / Story 数据，上述字段在 `Session` 类型层暂为 optional；真实 `RemoteThread -> Session` Adapter 会显式传入 Host 返回值，包括 `null`。
- `listSessions()` 与 `getSession()` 共用映射，确保真实 Thread 属性不再在 Adapter 层丢失。
- 原有 `miraHostClient` 测试全部保留，并新增列表与单线程映射测试。
- 未新增 `isUnread`、`isPinned`、`threadKind`，未猜测 Workspace/Role 名称，未修改 Host / Desktop 仓库。

自动化验证：

- GitHub Actions `Mobile CI #240`：`Typecheck, lint and test` 成功。
- `Typecheck`：success。
- `Lint`：success。
- `Test`：success。
- Android / iOS 构建属于同一 CI 的平台验证项，不作为本轮数据映射完成的必要前提；结果单独按 CI 记录，不替代真机验收。

当前剩余：

- Host 侧决定 Workspace / Role 的 Mobile-safe 读取合同后，MOB-001 才能关闭 Host 依赖。
- 在 Host 决策之前，不为项目名、角色名、未读或置顶制造客户端替代字段。

### MOB-002：项目列表页

- 产品“项目”对应 Host Chat Workspace，但移动端 API 和配对设备 Remote contract 当前都没有 Workspace 列表能力。
- 当前可确认的项目字段为 `id`、`name`、`rootPath`、`status`、`createdAt`、`updatedAt`；其中 `rootPath` 是 Host 本机路径，默认不应投影到移动端 UI。
- 没有项目置顶、创建者、共享状态、成员、线程数、封面或描述的权威字段。设计中存在这些内容时，本轮隐藏，不模拟。
- 首轮最小页面只展示真实项目名和可选更新时间，并严格区分加载、空列表、错误重试和成功状态。
- 仓库中未找到用户提及的项目列表/详情参考图；实施视觉稿前需要重新提供图 1、图 2。

### MOB-003：项目详情页

- 最小路由结构为：`WorkspaceList -> WorkspaceDetail({ workspaceId, workspaceName }) -> Chat({ sessionId, title })`。
- 正常 Stack 导航可让 Chat 返回项目详情、项目详情返回项目列表；Chat 不需要自行猜测来源。
- 项目详情只显示 `session.workspaceId === route.workspaceId` 的真实线程，并区分加载、空、错误重试和项目失效状态。
- 当前硬阻塞：Remote Host V1 尚未提供权威 Workspace 列表；`Session.workspaceId` 的 Mobile 映射已在 MOB-001 合入 `dev`。

### MOB-004：项目线程层级导航

- 当前直接进入 Chat 的入口有三个：主会话列表、抽屉线程列表、搜索结果；当前没有 Chat deep link，只有 `mira://pair`。
- 实施后的统一规则：全局普通入口只允许无 `workspaceId` 的线程直接进入 Chat；任何带 `workspaceId` 的线程只能从对应 `WorkspaceDetail` 打开。
- `roleId` 只影响视觉身份；若同时带 `workspaceId`，项目层级优先。
- `agentEnabled=true` 同样走项目层级；若 Agent 缺少 `workspaceId`，作为契约异常处理，不降级为普通线程。
- 未找到对应 Workspace 或权威名称时，不允许绕过项目层级直接进入 Chat。

### MOB-005：线程类型视觉区分

- 使用现有 `lucide-react-native`，不新增依赖或自绘资产：
  - 普通聊天：`MessageSquare`
  - 角色聊天：`UserRound`
  - Agent 聊天：`Bot`
- UI 显示分类的唯一派生顺序：`agentEnabled === true` -> 有效非空 `roleId` -> 普通聊天。
- `workspaceId` 和 `knowledgeBaseId` 是归属/能力属性，不覆盖三类主图标。
- 角色名或项目名不可读取时，只显示类型图标和真实线程标题；不展示原始 ID，不猜名称。
- 主列表、抽屉和搜索结果必须共用同一映射函数或小组件，避免入口之间图标漂移。

### MOB-006：真实线程状态与验收

已实施到 `dev`：

- `src/screens/SessionListScreen.tsx` 已移除按 index 伪造的未读点、置顶图标和“置顶/最近对话”假分组；列表只展示 Host 真实标题与更新时间。
- `src/components/CustomDrawer.tsx` 不再把 `sessions[0]` 伪造成“已置顶”，真实会话统一按“最近”展示。
- `src/components/ConversationMenu.tsx` 已移除无 Host 写契约的“置顶”入口；未新增 `isPinned` 或本地替代状态。
- `src/screens/SearchScreen.tsx` 已将 loading / success-empty / success-data / error 明确分离；骨架不再承担空结果或失败状态。
- 主列表、抽屉、搜索均提供真实错误状态和可操作重试；401、403、网络失败分别给出不同提示。
- 新增 `sessionCollectionState.ts` 统一四态判定与错误映射，并增加基础 Jest 覆盖。

自动化验证：

- GitHub Actions `Mobile CI #244`：`Typecheck, lint and test` 成功。
- `Typecheck`：success。
- `Lint`：success。
- `Test`：success。
- Android / iOS 构建仍按同一 CI 独立运行；自动化构建不能替代真机视觉与网络验收。

当前剩余：

- Chat 当前仍使用导航参数中的标题快照；若 Host 在页面打开后改名，页面内不会自动刷新。该项保留为 MOB-006 后续最小修复，不在本次状态清理中伪造刷新语义。
- 视觉验收仍需覆盖 Android/iOS、浅色/深色、动态字体、长标题、多线程、慢网/断网/401/403、返回路径、VoiceOver/TalkBack。
- Host 尚未定义线程已读/未读与置顶的持久化、多设备同步和写权限语义；在合同出现前 UI 继续零展示、零操作。

## Host 依赖与待维护者决定

1. 配对设备是否新增 Workspace/Role 只读 scope，或通过现有 scope 提供安全投影。
2. Remote manifest 是否新增 `/chat-workspaces`、`/roles`，或由 `/threads` 返回最小 `workspaceName` / `roleSummary`。
3. Mobile-safe Workspace 响应是否明确排除 Host 本机 `rootPath`。
4. 是否需要权威唯一 `threadKind`；若不需要，移动端继续只派生 UI 显示分类。
5. 是否定义线程已读和置顶的持久化、多设备同步与写权限语义；未定义前 UI 零展示、零操作。
6. 项目线程数量由 Host 返回，还是首轮由移动端在完整线程列表中按 `workspaceId` 计算；需要同时考虑分页和数据量。

## 实施授权门槛

- MOB-001：已获得维护者明确实施授权；Mobile 侧最小字段映射已合入 `dev`。
- MOB-006：已获得维护者明确实施授权；第一轮真实状态清理已合入 `dev`。
- 涉及 Host Remote 契约的部分仍需 Host 方案得到确认，不因 Mobile 已开工而视为自动授权。
- MOB-002/003 的项目列表和详情参考图需重新提供，或维护者明确允许按现有移动端设计系统落地。
- 默认不修改 Mira Host / 桌面端仓库；任何跨仓修改必须再次明确授权。

## 建议实施顺序

1. MOB-001：Mobile 属性映射已完成；等待并确认 Host Workspace/Role Remote 契约。
2. MOB-006：第一轮假状态清理已完成；补 Chat 标题刷新并完成设备视觉验收。
3. MOB-005：统一三类线程图标和可访问性文案。
4. MOB-002：在 Workspace Remote contract 可用后实现项目列表。
5. MOB-003：实现项目详情和项目线程过滤。
6. MOB-004：收紧所有 Chat 入口和完整返回路径。

## 交付记录

- 2026-08-27：创建统一移动端工作台账。
- 2026-08-27：真实派发 MOB-001 至 MOB-006；六张卡均完成只读现状核对，未修改业务代码、未提交、未推送。
- 2026-08-27：记录 Remote Workspace/Role 合同、假置顶/未读状态、项目层级导航与双端验收阻塞。
- 2026-08-27：旧 Remote / Relay / Tailscale 工程线归档，`docs/work-ledger.md` 升为当前工程任务主线。
- 2026-08-27：开始 MOB-001；补齐 Remote Thread 属性到 Session 的映射并增加回归测试。
- 2026-08-27：PR #23 的 `Typecheck, lint and test` 通过；MOB-001 合入 `dev`，Host Workspace/Role 契约仍未关闭。
- 2026-08-27：开始 MOB-006；提交 `2d0c906` 到 `dev`，移除假置顶/未读/搜索假骨架，补齐 loading/empty/data/error 与重试、401/403/网络错误区分和基础测试。
- 2026-08-27：Mobile CI #244 的 `Typecheck, lint and test` 通过；MOB-006 第一轮状态清理完成，Chat 标题刷新与真机视觉验收仍待。
