# Mobile 工作台账

更新时间：2026-08-27 18:31（Asia/Shanghai）

本台账是当前移动端线程、项目与角色展示工作的统一事实来源。任务状态、Host 依赖、产品决定和验收结果统一在此维护，避免把设计稿状态、移动端推断或代理调查结论误当成已经可用的服务端能力。

## 当前协作约定

- 当前阶段为需求澄清与实施准备。
- 在维护者明确授权实施前，代理只做代码、协议、数据覆盖和验收路径核对，不修改业务代码。
- 移动端只消费 Mira Host 的权威线程、项目和角色数据，不猜测接口字段，不伪造已读、未读或置顶状态。
- 任何跨到 Mira 桌面端或服务端的协议问题，记录为依赖，不在本仓库越界修改。

## 任务卡总览

| ID | 任务卡 | 范围 | 状态 | 负责人 | 依赖 |
|---|---|---|---|---|---|
| MOB-001 | 线程与项目数据契约确认 | 核对 `workspaceId`、`roleId`、`agentEnabled`、项目/角色名称、读状态、置顶状态及可用接口 | 只读核对完成，等待 Host 决策与实施授权 | `mob_001_contract` | Host Remote 契约 |
| MOB-002 | 项目列表页 | 核对项目字段、筛选、真实置顶显示规则和缺省状态 | 只读核对完成，等待 Host 契约与参考图 | `mob_002_workspace_list` | MOB-001 |
| MOB-003 | 项目详情页 | 设计项目详情/项目线程列表层级，核对导航数据与返回路径 | 只读核对完成，等待 Host 契约与实施授权 | `mob_003_workspace_detail` | MOB-001, MOB-002 |
| MOB-004 | 项目线程层级导航 | 核对“项目列表 → 项目详情线程列表 → 具体线程”在现有路由中的落点和状态传递 | 只读核对完成，等待 MOB-001～003 可实施 | `mob_004_hierarchy_nav` | MOB-001, MOB-002, MOB-003 |
| MOB-005 | 线程类型视觉区分 | 核对普通、角色、Agent 三类图标映射和字段共存优先级 | 只读核对完成，等待 Session 数据映射与实施授权 | `mob_005_visual_kinds` | MOB-001 |
| MOB-006 | 真实线程状态与验收 | 核对真实标题、已读/未读、置顶字段覆盖，整理测试与视觉验收清单 | 只读核对完成，等待实施授权与双端环境 | `mob_006_truth_acceptance` | MOB-001, MOB-002, MOB-005 |

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
- 移动端协议层已经解析这些字段，但 `RemoteThread -> Session` 映射和 `Session` 类型只保留 `id`、`title`、`updatedAt`，导致 UI 无法使用线程属性。
- `workspaceId` 是 Chat Workspace ID。Host 约束为 Agent Thread 必须绑定 Workspace；移动端只展示该关系，不自行修补异常数据。
- 项目名称的权威来源是 Host `/chat-workspaces`，角色名称的权威来源是 Host `/roles`。
- 当前配对设备 Remote Host V1 的 scope 和 manifest 均未开放 Workspace/Role 读取，这是项目名称和角色名称接入的硬依赖。
- Host 当前没有线程已读/未读或置顶字段，也没有相应查询和持久化语义。
- 实施建议：`Session` 保留上述线程属性；项目和角色使用独立规范化只读实体；`isUnread` / `isPinned` 暂不进入模型。

主要证据：

- 移动端解析：`src/protocol/remoteHostV1.ts`
- 移动端丢字段映射：`src/api/miraHostClient.ts`
- 移动端 Session：`src/types/index.ts`
- Host Thread：`server/src/services/thread.service.ts`（Mira 主工程）
- Remote 权限：`server/src/services/remote-device-auth.service.ts`、`server/src/routes/remote-access.ts`（Mira 主工程）

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
- 当前硬阻塞：`Session` 丢失 `workspaceId`，且 Remote Host V1 尚未提供权威 Workspace 列表。

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

- 当前存在必须在实施阶段移除的假状态：
  - `src/screens/SessionListScreen.tsx` 按 index 把首项硬编码为置顶和未读，并插入“置顶/最近对话”分组。
  - `src/components/CustomDrawer.tsx` 把 `sessions[0]` 硬编码为“已置顶”。
  - `src/components/ConversationMenu.tsx` 暴露尚无真实写契约的“置顶”等动作，容易造成已经执行的错觉。
  - `src/screens/SearchScreen.tsx` 在空结果或失败后仍可能显示固定骨架，无法区分加载、空和错误。
- Host 真实标题已贯通协议、Adapter、主列表、抽屉、搜索和 Chat；但 Chat 使用导航时的标题快照，Host 后续改名不会在页面内自动刷新。
- 现有列表请求普遍吞掉错误，使失败被呈现为空状态或空白。实施时必须将 loading / success-empty / success-data / error 明确分离，并提供可操作重试。
- 自动化验收覆盖协议、Adapter、三类 UI 映射、主列表、抽屉、搜索、Chat 和跨入口标题一致性。
- 视觉验收至少覆盖 Android/iOS、浅色/深色、动态字体、长标题、多线程、慢网/断网/401/403、返回路径、VoiceOver/TalkBack；Jest 不能替代设备验收。

## Host 依赖与待维护者决定

1. 配对设备是否新增 Workspace/Role 只读 scope，或通过现有 scope 提供安全投影。
2. Remote manifest 是否新增 `/chat-workspaces`、`/roles`，或由 `/threads` 返回最小 `workspaceName` / `roleSummary`。
3. Mobile-safe Workspace 响应是否明确排除 Host 本机 `rootPath`。
4. 是否需要权威唯一 `threadKind`；若不需要，移动端继续只派生 UI 显示分类。
5. 是否定义线程已读和置顶的持久化、多设备同步与写权限语义；未定义前 UI 零展示、零操作。
6. 项目线程数量由 Host 返回，还是首轮由移动端在完整线程列表中按 `workspaceId` 计算；需要同时考虑分页和数据量。

## 实施授权门槛

- 维护者明确说“开始实施”。
- MOB-001 的 Host Remote 契约方案得到确认，或明确允许先做不依赖项目/角色名称的最小移动端改动。
- 项目列表和详情参考图重新提供，或维护者明确允许按现有移动端设计系统落地。
- 明确本轮是否只处理移动端；默认不修改 Mira Host / 桌面端仓库。

## 建议实施顺序

1. MOB-001：补齐并验证 Session 属性映射；Host 契约另行确认，不猜接口。
2. MOB-006：移除假置顶/未读/假骨架，补齐真实错误状态与基础测试。
3. MOB-005：统一三类线程图标和可访问性文案。
4. MOB-002：在 Workspace Remote contract 可用后实现项目列表。
5. MOB-003：实现项目详情和项目线程过滤。
6. MOB-004：收紧所有 Chat 入口和完整返回路径。

## 交付记录

- 2026-08-27：创建统一移动端工作台账。
- 2026-08-27：真实派发 MOB-001 至 MOB-006；六张卡均完成只读现状核对，未修改业务代码、未提交、未推送。
- 2026-08-27：记录 Remote Workspace/Role 合同、假置顶/未读状态、项目层级导航与双端验收阻塞。
