# Mobile 工作台账

更新时间：2026-08-29（Asia/Shanghai）

本台账是 Mira Mobile 当前施工、验收与跨端依赖的统一事实来源。任务状态、产品决定、Host 依赖和并行边界统一在此维护；不得把设计稿、占位 UI、客户端已有方法或代理推断误当成已经可用的远端能力。

2026-08-28 及之前的完整调查、实施与验收历史已原样归档到 `docs/archive/work-ledger-2026-08-28.md`。归档只用于追溯，不覆盖本页当前规则与状态。

## 当前协作约定

- 当前阶段已进入受控实施；维护者已明确授权 MOB-001 至 MOB-023，其中 MOB-012～MOB-015 为 0.2.1 当前新增授权卡，MOB-016～MOB-023 为拾言（Shiyan）MVP 新增授权卡。
- MOB-007 / MOB-008 已完成并合入 `dev`。
- MOB-009 / MOB-010 / MOB-011 已完成代码施工并合入 `dev`，仍保留各自真机 / 跨端人工验收项，因此当前为有条件完成。
- MOB-012 已随 Mobile PR #57 合入 `dev`，当前为有条件完成：Desktop `dev` 的 Assistant Message `metadata.agent.runId`、Agent Run read / approve / reject / cancel 与 device scope 已核实；Mobile 已完成 `waiting_approval` 展示、approve / reject / cancel、Thread / Run 校验、重复提交保护与真实错误态。OpenCode Review 为 `NO_BLOCKING_FINDINGS`，typecheck / lint / Jest 全绿；真实 Desktop + Android / iOS 联调继续挂账，不阻塞 MOB-013 / MOB-014。
- MOB-013 / MOB-014 已由 MOB-012 Gate 解锁，可从最新 `dev` 开工；两卡若并行，MOB-013 优先拥有 Message / Media renderer，MOB-014 不重写该 renderer 或 MOB-012 Agent wrapper。
- MOB-015 已随 Mobile PR #54 合入 `dev`，当前为有条件完成；仅保留 Android / iOS 真机设置持久化、system 主题切换与断开 / 重配对人工验收。
- MOB-016 已随 Mobile PR #55 合入 `dev`，当前为有条件完成；最新 Review 无阻塞 finding，自动化门禁已通过，剩余真机 / UI 人工验收不重新阻塞拾言后续施工。
- MOB-017 仍待实施，当前没有现成施工分支 / PR；其 Mobile Native 录音链可独立于 Cloud 推进，40 分钟真实录音属于最终人工验收而非施工前置。
- MOB-018 已随 `mira-shiyan-cloud` PR #1 合入 Cloud `main`，当前为有条件完成；Review 阻塞已修复并关闭，Cloud CI 已通过。真实 D1 / R2 / Workflow 资源、Secret 与部署联调继续挂账，不阻塞 MOB-019 施工。
- MOB-019 已由 MOB-018 Gate 解锁；MOB-020 继续等待 MOB-019，MOB-021 / MOB-022 / MOB-023 按既定依赖继续等待。
- 移动端继续消费 Mira Desktop / Mira Host 的权威 Thread、Workspace、Role、Agent Run、Message Part 与 Artifact 数据，不猜测远端字段或状态。
- 拾言是 Mira Mobile 官方内置生产力插件，但其云端链路独立于 Desktop / Host 在线状态；`mira-shiyan-cloud` 与 `mira-shiyan` 不建立第二套产品或施工台账。
- 设备级本地能力可以复用 Mobile 现有系统 API 与本地存储，但必须明确其设备级语义，不伪装成账户级或跨端统一状态。
- 任何需要新增 Host 合同、扩大 Remote scope、改变 Desktop 业务语义的情况，必须记录为依赖并停止扩权；未经维护者明确授权，不在 Mobile 卡内偷偷修改 Host。
- 当前 Mobile 施工基线分支：`dev`。每张 Mobile 卡从最新 `dev` 开功能分支施工，完成后向 `dev` 发 PR；不得长期直接在 `dev` 上施工。
- 拾言 Cloud / Destination 卡以对应仓库当前正式基线为起点施工，但任务 ID、依赖、状态与验收结果仍回写本台账。

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
| MOB-012 | Agent 手机审批闭环 | `waiting_approval` 展示与 approve / reject / cancel | **有条件完成**：Mobile PR #57 已合入 `dev`；Reviewer `NO_BLOCKING_FINDINGS`，typecheck / lint / Jest 全绿；真实 Desktop + Android / iOS 联调挂账 | `mob_012_agent_mobile_approval` | 现有 Agent Remote 已满足；代码 Gate 已通过 |
| MOB-013 | 会话媒体与附件读取 | Message image/file parts、只读媒体 / 附件展示与打开 | **已解锁，待实施**：MOB-012 Chat Agent 边界已冻结，可从最新 `dev` 开工 | `mob_013_media_attachment_reading` | 现有 `artifacts:read` 与线程媒体读取 |
| MOB-014 | 会话手机工具 | 系统分享、当前聊天内查找 | **已解锁，待实施**：MOB-012 已 Gate；可与 MOB-013 在明确文件所有权后并行 | `mob_014_mobile_conversation_tools` | 无新增 Host 依赖 |
| MOB-015 | 设备设置与连接收口 | Theme / Accent 持久化、system 主题响应、真实断开 Host | **有条件完成**：Mobile PR #54 已合入；剩余真机持久化 / system 切换 / 断开重配对验收 | `mob_015_device_settings_connection` | 无新增 Host 依赖 |
| MOB-016 | 拾言插件入口与任务壳 | Mobile；插件入口、场景、历史任务 UI 壳 | **有条件完成**：Mobile PR #55 已合入 `dev`；Review 无阻塞 finding，自动化门禁通过；真机 / UI 验收挂账 | `mob_016_shiyan_plugin_shell` | Shiyan PRD / Technical Design |
| MOB-017 | 拾言录音与本地恢复 | Mobile；RecordingAdapter、麦克风权限、本地草稿恢复、40 分钟录音 smoke | **待实施**：无现成分支 / PR；可独立于 Cloud 开工 | `mob_017_shiyan_recording_local_recovery` | 无 Cloud 依赖 |
| MOB-018 | 拾言 Cloud 基础与 CaptureTask / 上传闭环 | `mira-shiyan-cloud`；`shiyan-api` / `shiyan-llm` 壳、D1/R2/Workflow、设备身份、直传 | **有条件完成**：Cloud PR #1 已合入 `main`；Review 阻塞已修复，CI 全绿；真实资源 / Secret / 部署联调挂账 | `mob_018_shiyan_cloud_foundation` | Shiyan canonical truth |
| MOB-019 | 拾言 STT Workflow 与 Transcript 证据层 | `mira-shiyan-cloud`；STT Provider、Transcript、3 天录音保留 | **已解锁，待实施** | `mob_019_shiyan_stt_transcript` | MOB-018 已 Gate |
| MOB-020 | 拾言 LLM 整理与 AI 调整 | `mira-shiyan-cloud`；私有 LLM Gateway、场景整理、JSON + Markdown Draft | **待实施** | `mob_020_shiyan_llm_organization` | MOB-018, MOB-019 |
| MOB-021 | 拾言处理状态、结果编辑与历史任务 | Mobile；提交上传、Stage UI、Transcript、AI Draft、Final Draft、分享 | **待实施** | `mob_021_shiyan_mobile_results_history` | MOB-016～MOB-020 |
| MOB-022 | 拾言 GitHub Destination | `mira-shiyan-cloud` + `mira-shiyan`；幂等投递、Delivery Record、canonical link | **待实施** | `mob_022_shiyan_github_destination` | MOB-018, MOB-020 |
| MOB-023 | 拾言 MVP 端到端验收与加固 | 三仓；40 分钟真实会议、恢复路径、最终 GitHub 投递 | **待实施** | `mob_023_shiyan_e2e_hardening` | MOB-016～MOB-022 |

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

### 拾言（Shiyan）MVP 产品规则

- 拾言是 Mira 官方内置生产力插件，Mobile First，但不是 Mobile Only；Desktop 始终是一等客户端，但不阻塞 Mobile MVP。
- 核心流程：选择场景 -> 录音 -> 结束后确认标题 / 场景 -> 提交 -> STT -> AI 整理 / 调整 -> 用户最终编辑 -> 分享 / 投递。
- Transcript 是长期保留、只读的证据层；原始录音默认保留 3 天，用户可对重要录音选择长期保留。
- 任务以 CaptureTask 为中心；Stage 失败不得粗暴映射为整个 Task 失败，前序成功产物继续有效。
- GitHub / Notion 等是 Destination，不是拾言数据库；MVP 第一 Destination 为 `dangjingtao/mira-shiyan`。
- 历史任务中的“去向”优先保存真实可打开的 canonical link，不能用“GitHub / Notion”标签冒充最终真相链接。
- AI 可以在用户最终编辑前反复调整；Final Draft 形成后后台 AI 不得静默覆盖人工内容。
- MVP 不做多人说话人识别、实时字幕、PDF / Word、原文时间点精确跳转、自动任务卡 / PRD 生成。
- 拾言产品 / 技术唯一真相目录：`docs/shiyan/`；下游 Cloud / Destination 实现发现冲突时必须先回到这里处理。

## 0.2.1 当前派卡与并行规则

### MOB-012：Agent 手机审批闭环

- **已 Gate / 有条件完成**，Mobile PR #57 已合入 `dev`。
- Desktop `dev` 已完成前置证据核对：Agent 执行时将 `run.id` 写入 Assistant Message `metadata.agent.runId` 并随消息持久化；Remote manifest 与 device scope 已开放 Agent Run read / approve / reject / cancel。
- Mobile 已基于现有 Remote 真相完成 `waiting_approval` 展示、approve / reject、queued / running cancel、Thread / Run 校验、真实错误态和重复提交保护；没有新增 Host 合同。
- Reviewer `NO_BLOCKING_FINDINGS`，typecheck / lint / Jest 全绿。真实 Desktop + Android / iOS 联调与弱网实测作为最终人工验收挂账，不重新占用 Chat 施工锁。
- MOB-012 Agent wrapper / canonical message metadata 边界现已冻结；后续卡不得通过重做 Agent 状态机来绕开这一合同。

详细卡：`docs/task-cards/MOB-012-agent-mobile-approval.md`

### MOB-013：会话媒体与附件读取

- **已解锁**，从最新 `dev` 开工。
- 只做已有会话内容的只读消费，不做拍照 / 相册 / 文件上传。
- 主要拥有 Remote Message Part -> Chat 展示与 media / artifact 读取层。
- 若需修改 Chat，优先抽独立 Message / Media 组件；不得重写 MOB-012 Agent wrapper / canonical run 状态边界。

详细卡：`docs/task-cards/MOB-013-media-attachment-reading.md`

### MOB-014：会话手机工具

- **已解锁**，可与 MOB-013 在明确文件所有权后并行。
- 使用手机现有系统能力实现系统分享。
- “在聊天中查找”只搜索当前已加载 Thread 的用户可见文本，不冒充跨会话全文索引。
- 与 MOB-013 并行时不重写 Message renderer；与 MOB-012 的 Agent wrapper 保持边界分离。

详细卡：`docs/task-cards/MOB-014-mobile-conversation-tools.md`

### MOB-015：设备设置与连接收口

- 复用 `localKeyValueStore` 持久化 Theme / Accent，补 `system` 外观监听。
- 设置页现有“退出登录”入口接真实 `disconnect()`；语义是清当前手机配对凭据并断开 Host，不建立虚假账户系统。
- 主要拥有 Settings / Theme / 本地设置存储 / connection lifecycle，可与 MOB-012～014 并行。

详细卡：`docs/task-cards/MOB-015-device-settings-connection.md`

## 拾言 MVP 派卡与并行规则

### 第一波：可并行

- **MOB-016**：Mobile 插件入口 / 场景 / 历史任务 UI 壳。
- **MOB-017**：Mobile 录音 Adapter / 本地恢复 / 原生麦克风能力。
- **MOB-018**：Cloud 基础 / CaptureTask / D1-R2 / 上传闭环。

三张卡职责分离：016 不碰原生录音和 Cloud；017 不碰导航主结构和 Cloud；018 不碰 Mobile UI。它们可以从各自当前正式基线并行施工。

### 第二波：Cloud 主链串行

```text
MOB-018  ✓ Gate
   ↓
MOB-019  STT / Transcript  ← 当前已解锁
   ↓
MOB-020  LLM 整理 / AI Draft
```

MOB-019 / MOB-020 都会触碰 Workflow、Stage 与结构化内容合同，不能仅因“模块名不同”就默认并行。先冻结上游合同，再继续下游。

### 第三波：合同冻结后并行

```text
MOB-020
   ├── MOB-021  Mobile 结果 / Final Draft / 历史任务 / 分享
   └── MOB-022  GitHub Destination / Delivery Record
```

MOB-021 与 MOB-022 只有在 MOB-020 已冻结 Final Draft / structured content 合同后才允许并行；一方不得在施工中自行修改该共享合同。

### 最终验收

`MOB-023` 只在 MOB-016～MOB-022 达到可联调条件后启动，不与上游实现卡并行施工。

## 建议施工顺序

```text
现有 0.2.1：
MOB-012  ✓ 有条件完成 / Chat Agent Gate
   ↓
MOB-013 ─┐
         ├─ 已解锁；明确文件所有权后可并行
MOB-014 ─┘

MOB-015  ✓ 有条件完成

拾言 MVP：
MOB-016  ✓ 有条件完成
MOB-017  ← 可独立开工
MOB-018  ✓ 有条件完成 / Cloud Gate
           ↓
        MOB-019  ← 当前 Cloud 主链施工入口
           ↓
        MOB-020
         ↙   ↘
    MOB-021  MOB-022
         \   /
        MOB-023
```

如果有第二施工组进入，现有 0.2.1 可并行推进 MOB-013 / MOB-014；拾言当前优先并行 MOB-017 与 MOB-019。任何 Builder 在开始前仍必须按派卡 Skill 读取当前仓库事实和实际 HEAD，旧派卡不得覆盖新代码事实。

## 0.2.1 验收原则

- 每张卡必须独立 typecheck / lint / Jest；涉及原生系统能力时补 Android / iOS 对应构建或真机验证。
- 自动化构建不冒充真机交互验收。
- Remote 能力必须覆盖权限不足、404、断网 / 弱网等真实错误态。
- 不允许为了让 UI“能点”而制造本地假成功。
- 不允许顺手施工本卡非目标；发现新需求另记依赖或另派卡。
- PR Review 未通过不得改任务状态为完成。

## 拾言 MVP 验收原则

- Mobile、Cloud、Destination 各卡均要按目标仓库现有 CI / test / build 事实执行验证；没有的验证不能虚构。
- 原生录音必须有 Android / iOS 构建影响说明；40 分钟长录音属于真实 MVP 证据，自动化单测不能替代。
- Cloud 失败必须按 Stage 呈现；不得把 STT、LLM、GitHub 某一阶段错误统一写成 Task failed。
- 录音、Transcript、AI Draft、Final Draft、Delivery Record 必须保持产品定义的数据边界。
- 所有 Provider Key、GitHub PAT、设备 credential 只进入安全 Secret / credential store，不进入仓库与普通日志。
- GitHub 投递必须返回真实文件 URL 与 commit SHA，并验证弱网重试幂等。
- MOB-023 未完成前，拾言 MVP 不标记为整体完成。

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
- `docs/task-cards/MOB-016-shiyan-plugin-shell.md`
- `docs/task-cards/MOB-017-shiyan-recording-local-recovery.md`
- `docs/task-cards/MOB-018-shiyan-cloud-foundation.md`
- `docs/task-cards/MOB-019-shiyan-stt-transcript.md`
- `docs/task-cards/MOB-020-shiyan-llm-organization.md`
- `docs/task-cards/MOB-021-shiyan-mobile-results-history.md`
- `docs/task-cards/MOB-022-shiyan-github-destination.md`
- `docs/task-cards/MOB-023-shiyan-e2e-hardening.md`

## 历史追溯

2026-08-28 及之前 MOB-001～MOB-010 的调查过程、实施记录、自动化 run、已知技术债与原始产品判断均保存在：

`docs/archive/work-ledger-2026-08-28.md`

其中若有内容与 2026-08-29 后明确产品决定冲突，以本台账和对应最新任务卡为准；历史记录不回写、不篡改。