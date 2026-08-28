# Mobile 工作台账

更新时间：2026-08-29（Asia/Shanghai）

本台账是 Mira Mobile 当前施工、验收与跨端依赖的统一事实来源。任务状态、产品决定、Host 依赖和并行边界统一在此维护；不得把设计稿、占位 UI、客户端已有方法或代理推断误当成已经可用的远端能力。

2026-08-28 及之前的完整调查、实施与验收历史已原样归档到 `docs/archive/work-ledger-2026-08-28.md`。归档只用于追溯，不覆盖本页当前规则与状态。

## 当前协作约定

- 当前阶段已进入受控实施；维护者已明确授权 MOB-001 至 MOB-015，其中 MOB-012～MOB-015 为 0.2.1 当前新增授权卡。
- MOB-007 / MOB-008 已完成并合入 `dev`。
- MOB-009 / MOB-010 / MOB-011 已完成代码施工并合入 `dev`，仍保留各自真机 / 跨端人工验收项，因此当前为有条件完成。
- MOB-012 / MOB-013 / MOB-014 / MOB-015 已派卡，状态为待实施。
- 移动端继续消费 Mira Desktop / Mira Host 的权威 Thread、Workspace、Role、Agent Run、Message Part 与 Artifact 数据，不猜测远端字段或状态。
- 设备级本地能力可以复用 Mobile 现有系统 API 与本地存储，但必须明确其设备级语义，不伪装成账户级或跨端统一状态。
- 任何需要新增 Host 合同、扩大 Remote scope、改变 Desktop 业务语义的情况，必须记录为依赖并停止扩权；未经维护者明确授权，不在 Mobile 卡内偷偷修改 Host。
- 当前施工基线分支：`dev`。每张卡从最新 `dev` 开功能分支施工，完成后向 `dev` 发 PR；不得长期直接在 `dev` 上施工。

## 任务卡总览

| ID | 任务卡 | 范围 | 状态 | 负责人 | 依赖 |
|---|---|---|---|---|---|
| MOB-001 | 线程与项目数据契约确认 | 保留 `workspaceId`、`roleId`、`agentEnabled` 等 Host 权威属性 | 已完成；后续正式 Workspace / Role Remote 收口由 MOB-010 完成 | `mob_001_contract` | MOB-010 |
| MOB-002 | 项目列表页 | 真实 Workspace 列表与缺省状态 | 已完成代码；正式 `/remote/v1/workspaces` 已由 MOB-010 接入，待真实联调项随 MOB-010 验收 | `mob_002_workspace_list` | MOB-001, MOB-010 |
| MOB-003 | 项目详情页 | Workspace Thread 权威分页与进入 Chat | 已完成代码；正式分页合同已由 MOB-010 接入，待真实联调项随 MOB-010 验收 | `mob_003_workspace_detail` | MOB-001, MOB-002, MOB-010 |
| MOB-004 | 项目线程层级导航 | 项目入口的“项目 -> 项目详情 -> Thread”浏览路径 | **有条件完成**：项目入口层级成立；全局最近 Thread 不再受此层级约束 | `mob_004_hierarchy_nav` | MOB-001, MOB-002, MOB-003, MOB-010, MOB-011 |
| MOB-005 | 线程类型视觉区分 | 普通 / Role / Agent 视觉与 Role 权威名称 | 已完成代码；Role Remote 已由 MOB-010 收口 | `mob_005_visual_kinds` | MOB-001, MOB-010 |
| MOB-006 | 真实线程状态与验收 | 标题、loading / empty / error / data、视觉与网络验收 | 代码实施完成；平台构建与真机验收按具体版本继续执行 | `mob_006_truth_acceptance` | MOB-001, MOB-002, MOB-005 |
| MOB-007 | 本机线程置顶 | 设备级持久化、置顶 / 取消置顶与稳定排序 | **完成**；MOB-011 已恢复旧版右划交互与置顶视觉 | `mob_007_local_pinning` | MOB-006, MOB-011 |
| MOB-008 | 本机未读状态 | 设备级已读进度与真实消息未读判定 | **完成** | `mob_008_device_unread` | MOB-006 |
| MOB-009 | 简化桌面配对页与 Mira 链接兜底 | 扫码 / 粘贴 `mira://pair?...`，隐藏 transport 细节 | **有条件完成**：代码与自动化通过；真机五路径待验收 | `mob_009_pairing_screen` | Remote Pairing V1 |
| MOB-010 | Desktop Remote 合同接入收口 | Workspace / Role / Workspace Thread 正式 Remote 合同 | **有条件完成**：代码与自动化通过；真实 Desktop 配对联调待验收 | `mob_010_remote_contract_alignment` | Desktop #77 / #78 / #80 |
| MOB-011 | 0.2.0 会话交互回归修复 | 全局 Thread 直达 Chat、旧版置顶右划、真实删除、失败态视觉 | **有条件完成**：Mobile PR #46 / Host PR #87 已合入；0.2.1 真机回归待验收 | `mob_011_conversation_ux_regression` | 单线程删除 Remote 放行已随本卡完成 |
| MOB-012 | Agent 手机审批闭环 | `waiting_approval` 展示与 approve / reject / cancel | **待实施** | `mob_012_agent_mobile_approval` | 现有 Agent Remote；施工前必须证明稳定 `runId` 来源 |
| MOB-013 | 会话媒体与附件读取 | Message image/file parts、只读媒体 / 附件展示与打开 | **待实施** | `mob_013_media_attachment_reading` | 现有 `artifacts:read` 与线程媒体读取 |
| MOB-014 | 会话手机工具 | 系统分享、当前聊天内查找 | **待实施** | `mob_014_mobile_conversation_tools` | 无新增 Host 依赖 |
| MOB-015 | 设备设置与连接收口 | Theme / Accent 持久化、system 主题响应、真实断开 Host | **待实施** | `mob_015_device_settings_connection` | 无新增 Host 依赖 |

## 已确认产品规则

- Mobile 的“项目”与 Mira Desktop `ChatWorkspace` 是同一实体，不新增第二套 Project 模型。
- `workspaceId` 必须保留为 Thread 的权威归属 / 运行上下文；但它**不是全局最近会话的导航父级**。
- 主列表、Drawer「最近」、Search 等全局 Thread 入口中的合法 Thread 直接进入 Chat。
- Drawer「项目」仍保持“项目列表 -> 项目详情 -> 项目 Thread -> Chat”，用于按项目浏览与管理；这与全局 Thread 直达 Chat 不冲突。
- `agentEnabled=true` 的合法 Desktop 数据必须绑定 `workspaceId`；缺失时仍视为 Host 合同异常，不由 Mobile 猜测修补。
- Agent / Role / 普通线程视觉优先级继续为 `Agent > Role > 普通`。
- 线程名称、Workspace、Role、Agent、Message、Artifact 等业务属性必须来自 Host 权威数据。
- Workspace Mobile-safe 真相入口为 `GET /remote/v1/workspaces`；Role summary 为 `GET /remote/v1/roles`；项目 Thread 为 `GET /remote/v1/workspaces/:workspaceId/threads`。
- 线程置顶与未读首轮均为设备级本地状态，不写回 Remote Thread，不做账户级或跨设备同步。
- “连接桌面端”主流程只暴露扫码 / 粘贴 Mira 配对链接、等待桌面授权和完成连接；Direct / Relay 是 transport 细节。
- 0.2.1 当前阶段**不删除现有占位入口**；优先把手机已经具备、现有 Host 已经允许的能力接成真实功能。
- 客户端存在某个方法不等于能力已可用；必须同时核对 Host route allowlist、manifest 与 device scope。

## 0.2.1 当前派卡与并行规则

### MOB-012：Agent 手机审批闭环

- 最高价值优先项。
- 施工前必须证明现有 SSE / Thread / Message 真相中能稳定得到 `runId`。
- 若拿不到稳定 `runId`，停止施工并登记 Host 依赖；不得解析文案、客户端造 ID 或发明新接口。
- MOB-012 优先拥有 Chat Agent 运行态与审批状态机改动。

详细卡：`docs/task-cards/MOB-012-agent-mobile-approval.md`

### MOB-013：会话媒体与附件读取

- 只做已有会话内容的只读消费，不做拍照 / 相册 / 文件上传。
- 主要拥有 Remote Message Part -> Chat 展示与 media / artifact 读取层。
- 若需修改 Chat，优先抽独立 Message / Media 组件，避免与 MOB-012 同段竞态。

详细卡：`docs/task-cards/MOB-013-media-attachment-reading.md`

### MOB-014：会话手机工具

- 使用手机现有系统能力实现系统分享。
- “在聊天中查找”只搜索当前已加载 Thread 的用户可见文本，不冒充跨会话全文索引。
- MOB-012 未合入前不得并发重写其 Chat 状态机；MOB-013 同期施工时不得重写 Message renderer。

详细卡：`docs/task-cards/MOB-014-mobile-conversation-tools.md`

### MOB-015：设备设置与连接收口

- 复用 `localKeyValueStore` 持久化 Theme / Accent，补 `system` 外观监听。
- 设置页现有“退出登录”入口接真实 `disconnect()`；语义是清当前手机配对凭据并断开 Host，不建立虚假账户系统。
- 主要拥有 Settings / Theme / 本地设置存储 / connection lifecycle，可与 MOB-012～014 并行。

详细卡：`docs/task-cards/MOB-015-device-settings-connection.md`

## 建议施工顺序

```text
MOB-012
   ↓
MOB-013 ─┐
         ├─ 在 Chat 边界明确后推进
MOB-014 ─┘

MOB-015  ── 可独立并行
```

如果有第二施工组进入，优先分配 MOB-015；MOB-012 保持单一责任人直到 Agent 运行态边界稳定。MOB-013 / MOB-014 在 MOB-012 合入后可根据组件边界并行。

## 0.2.1 验收原则

- 每张卡必须独立 typecheck / lint / Jest；涉及原生系统能力时补 Android / iOS 对应构建或真机验证。
- 自动化构建不冒充真机交互验收。
- Remote 能力必须覆盖权限不足、404、断网 / 弱网等真实错误态。
- 不允许为了让 UI“能点”而制造本地假成功。
- 不允许顺手施工本卡非目标；发现新需求另记依赖或另派卡。
- PR Review 未通过不得改任务状态为完成。

## 详细任务卡索引

- `docs/task-cards/MOB-007-local-thread-pinning.md`
- `docs/task-cards/MOB-008-device-local-unread.md`
- `docs/task-cards/MOB-009-pairing-screen-simplification.md`
- `docs/task-cards/MOB-010-desktop-remote-contract-alignment.md`
- `docs/task-cards/MOB-011-conversation-ux-regression-repair.md`
- `docs/task-cards/MOB-012-agent-mobile-approval.md`
- `docs/task-cards/MOB-013-media-attachment-reading.md`
- `docs/task-cards/MOB-014-mobile-conversation-tools.md`
- `docs/task-cards/MOB-015-device-settings-connection.md`

## 历史追溯

2026-08-28 及之前 MOB-001～MOB-010 的调查过程、实施记录、自动化 run、已知技术债与原始产品判断均保存在：

`docs/archive/work-ledger-2026-08-28.md`

其中若有内容与 2026-08-29 后明确产品决定冲突，以本台账和对应最新任务卡为准；历史记录不回写、不篡改。
