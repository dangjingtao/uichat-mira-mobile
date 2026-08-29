# Mobile 新增任务卡索引

本目录补充 `docs/work-ledger.md` 的后续 Mobile / 跨仓库任务。旧任务编号不改号、不重开；拾言（Shiyan）虽然跨 `uichat-mira-mobile`、`mira-shiyan-cloud`、`mira-shiyan` 三仓施工，但任务编号、状态、依赖与验收仍统一回写 Mobile 台账。

> 2026-08-29 12:00（Asia/Shanghai）前的夜间接力施工同时受 [`../night-shift-handoff.md`](../night-shift-handoff.md) 约束。该临时规则允许在实现合同与自动化证据足以支撑后续施工时，由 Mira 将前置卡判定为“有条件通过（放行后续）”；Secret 注入、真机、签名、正式部署和其它不改变合同的人工验收尾项继续挂账，但不机械阻塞后续任务。

## 当前新增

| ID | 任务 | 状态 | 执行仓库 / 依赖 |
|---|---|---|---|
| MOB-007 | 本机线程置顶 | **完成**：PR #28 已 squash 合入 `dev`；设备级本机置顶、主列表排序、Drawer/Search 同源展示已完成 | Mobile；无 Host 依赖 |
| MOB-008 | 本机未读状态 | **完成**：PR #30 已 squash 合入 `dev`；设备级已读进度、真实消息未读判定与主列表/Drawer/Search 同源展示已完成 | Mobile；无 Host 依赖 |
| MOB-009 | 简化桌面配对页与 Mira 链接兜底 | **有条件完成**：代码与自动化平台验收已通过并合入 `dev`；待真机五路径人工验收 | Mobile；无新增 Host 依赖 |
| MOB-010 | Desktop Remote 合同接入收口 | **有条件完成**：代码与自动化验收完成；真实 Desktop 配对联调待验收 | Mobile；Desktop #77 / #78 / #80 已完成合同交付 |
| MOB-011 | 0.2.0 会话交互回归修复 | **有条件完成**：Mobile PR #46 / Host PR #87 已合入 `dev`；0.2.1 真机交互回归待验收 | Mobile + Host；单线程删除 Remote 已放行 |
| MOB-012 | Agent 手机审批闭环 | 待实施 | Mobile；施工前必须证明稳定 `runId` 来源 |
| MOB-013 | 会话媒体与附件读取 | 待实施 | Mobile；只消费现有 Message parts / `artifacts:read` |
| MOB-014 | 会话手机工具 | 待实施 | Mobile；系统分享与本地查找 |
| MOB-015 | 设备设置与连接收口 | 待实施 | Mobile；本地存储与现有 `disconnect()` |
| MOB-016 | 拾言插件入口与任务壳 | 待实施 | Mobile；Shiyan PRD / Technical Design |
| MOB-017 | 拾言录音与本地恢复 | **施工中**：Draft PR #56；录音 Adapter / 原生录音 / 两端麦克风权限 / 本地恢复已完成；真机 40 分钟录音待验收 | Mobile；无 Cloud 依赖，需真实 40 分钟录音验证 |
| MOB-018 | 拾言 Cloud 基础与 CaptureTask / 上传闭环 | 待实施 | `mira-shiyan-cloud`；Mobile canonical truth |
| MOB-019 | 拾言 STT Workflow 与 Transcript 证据层 | 待实施 | `mira-shiyan-cloud`；依赖 MOB-018 |
| MOB-020 | 拾言 LLM 整理与 AI 调整 | 待实施 | `mira-shiyan-cloud`；依赖 MOB-018 / MOB-019 |
| MOB-021 | 拾言处理状态、结果编辑与历史任务 | 待实施 | Mobile；依赖 MOB-016～MOB-020 |
| MOB-022 | 拾言 GitHub Destination | 待实施 | `mira-shiyan-cloud` + `mira-shiyan`；依赖 MOB-018 / MOB-020 |
| MOB-023 | 拾言 MVP 端到端验收与加固 | 待实施 | 三仓；依赖 MOB-016～MOB-022 |

## 既有产品决策

2026-08-28 决定：线程置顶与未读首轮由 Mira Mobile 以**设备级本地状态**实现。Desktop Issue #79 已关闭为 `not planned`。

- 置顶：本机持久化，只影响当前设备排序与展示。
- 未读：本机持久化已读进度，只表达当前设备是否读过最新内容。
- 不把设备级状态伪装成账户级或跨端统一状态。
- 将来如明确需要 Desktop ↔ Mobile 或多 Mobile 同步，再新建设计账户级线程状态同步任务。

2026-08-28 决定：桌面配对页只暴露用户需要理解的配对流程。扫码为主入口，扫码失败时允许粘贴 `mira://pair?...` 配对链接兜底；Direct / Relay 继续作为底层 transport，不再在主页面提供 Host URL、手工 Direct 检查或传输选择。

2026-08-29 决定：全局最近会话中的 Thread 是一等入口，`workspaceId` 表示归属 / 运行上下文，不再作为全局入口必须经过的导航父级。Drawer「项目」仍保留项目列表 -> 项目详情 -> 项目线程的浏览路径。MOB-011 已按该决定修复 0.2.0 回归。

2026-08-29 决定：0.2.1 后续不删除现有占位入口，优先把**手机当前已经具备、现有 Host 已允许**的能力接成真实功能。首轮授权 MOB-012～MOB-015，共四张任务卡，不为额度凑数。

## 拾言（Shiyan）MVP 任务规则

2026-08-29 已完成拾言 PRD 与技术设计收口，唯一真相目录为：

- `docs/shiyan/PRD.md`
- `docs/shiyan/TECHNICAL_DESIGN.md`
- `docs/shiyan/README.md`

拾言任务编号继续使用 Mobile 现有 `MOB-xxx`，不另起第二套 `SHI-xxx` 台账。

核心规则：

- Mobile First，但拾言云端不依赖 Desktop / Host 在线；
- 本地先可靠录音，结束后确认标题 / 场景，再创建云端 CaptureTask；
- D1 保存服务端事实，R2 保存音频 / 原始资产；
- Transcript 长期保留且只读；原始录音默认保留 3 天；
- Stage 失败不等于整个 Task 失败；
- AI 调整发生在用户最终编辑前，Final Draft 不得被后台 AI 静默覆盖；
- GitHub 是 MVP 第一 Destination，不是数据库；投递成功需返回真实 URL + commit SHA；
- 下游仓库不得独立改产品 / 技术合同。

### 拾言并行规则

第一波可以并行：

- MOB-016：Mobile 插件 / 场景 / 历史 UI 壳；
- MOB-017：Mobile 录音 Adapter / 本地恢复 / 原生权限；
- MOB-018：Cloud 基础 / CaptureTask / D1-R2 / 上传。

Cloud 主链默认串行：

```text
MOB-018 -> MOB-019 -> MOB-020
```

原因不是文件冲突，而是三张卡共享 Workflow、Stage、Transcript / structured content 合同；上游未冻结时并行会形成语义竞态。

MOB-020 合入并冻结内容合同后：

```text
MOB-021 Mobile 结果 / Final Draft / 历史
MOB-022 GitHub Destination
```

两张卡可以并行，但均不得自行改共享 Final Draft 合同。

MOB-023 是最终集成验收卡，不与上游实现卡并行。

### 夜间依赖放行规则

临时授权有效期内，任务卡上的“依赖 MOB-xxx”表示**实现 / 合同依赖**，不是“必须等用户亲自最终验收”。

- 前置实现已合入合法基线、共享合同已冻结、相关自动化证据足够时，可判为“有条件通过（放行后续）”；
- 有条件通过对后续任务等同于依赖满足；
- 真机、Secret、正式部署、账号授权等尾项继续记录，用户醒来后统一验收；
- 若缺失项可能推翻 API / schema / 状态语义 / 数据边界，则不得放行；
- 一个任务真实阻塞时只阻塞受影响的任务链，其它卡继续推进；
- 详细判定以 `docs/night-shift-handoff.md` 为准。

### 0.2.1 并行规则

- MOB-012 优先拥有 Chat Agent 运行态；必须先确认稳定 `runId` 真相来源。
- MOB-013 主要拥有 Message / media 展示层，尽量下沉独立组件。
- MOB-014 主要拥有系统分享与当前聊天内查找；不得与 MOB-012 / MOB-013 并发重写同一段 `ChatScreen`。
- MOB-015 主要拥有 Settings / Theme / 本地存储 / Host disconnect，可与 MOB-012～014 独立并行。
- 任一施工者发现需要新增 Host 合同、扩大 scope 或修改 Desktop 业务语义，应停止并记录依赖，不得在 Mobile 卡内偷偷扩权。

## 详细任务卡

- `MOB-007-local-thread-pinning.md`
- `MOB-008-device-local-unread.md`
- `MOB-009-pairing-screen-simplification.md`
- `MOB-010-desktop-remote-contract-alignment.md`
- `MOB-011-conversation-ux-regression-repair.md`
- `MOB-012-agent-mobile-approval.md`
- `MOB-013-media-attachment-reading.md`
- `MOB-014-mobile-conversation-tools.md`
- `MOB-015-device-settings-connection.md`
- `MOB-016-shiyan-plugin-shell.md`
- `MOB-017-shiyan-recording-local-recovery.md`
- `MOB-018-shiyan-cloud-foundation.md`
- `MOB-019-shiyan-stt-transcript.md`
- `MOB-020-shiyan-llm-organization.md`
- `MOB-021-shiyan-mobile-results-history.md`
- `MOB-022-shiyan-github-destination.md`
- `MOB-023-shiyan-e2e-hardening.md`
