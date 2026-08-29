# Mobile 工作台账

更新时间：2026-08-29（Asia/Shanghai）

本台账是 Mira Mobile 当前施工、验收与跨仓依赖的统一事实来源。任务状态以这里为准；详细范围以对应任务卡为准；`docs/shiyan/` 是拾言产品与跨仓合同唯一真相。

2026-08-28 及之前历史保存在 `docs/archive/work-ledger-2026-08-28.md`。`docs/night-shift-handoff.md` 与 `docs/night-shift-execution-plan.md` 的临时授权已于 2026-08-29 12:00（Asia/Shanghai）到期，仅供追溯；此前已经形成的“有条件完成 / 有条件通过”结论继续保留，但新的合并与放行按当前正常 Review / CI 规则执行。

## 当前施工规则

- Mobile 集成分支：`dev`；每张 Mobile 卡从最新 `dev` 开独立分支并向 `dev` 发 PR。
- 拾言 Cloud 当前开发主线：`dangjingtao/mira-shiyan-cloud:dev`；`mira-shiyan` 只作为 Destination 内容仓库，不建立第二套任务台账。
- 不把设计稿、占位 UI、客户端已有方法或 Agent 推断当作真实远端能力。
- Remote Host V1 的旧固定 route allowlist 自 2026-08-29 起不再是规范能力边界；远端能力以 Remote Gateway 显式 method/path -> scope 映射 + 当前设备 scope + Host runtime manifest + canonical route 业务校验为准。协议版本仍保持 `1`，未显式发布的 route 继续默认拒绝。
- 真机、Secret、正式部署和真实 Provider smoke 可以作为明确挂账项，但不得伪造为已验证。
- Stage 失败只影响该 Stage；已经成功的录音、Transcript、Draft、Final Draft 或 Delivery 证据不得被后续失败抹掉。

## 当前结论

### Chat / Device

- MOB-007 / MOB-008：完成。
- MOB-009 / MOB-010 / MOB-011：有条件完成；保留真机 / 跨端人工验收。
- MOB-012：有条件完成，Mobile PR #57 已合入 `dev`；Agent Run 审批合同与自动化已通过，真实 Desktop + Android / iOS 联调挂账。
- MOB-013：有条件完成，Mobile PR #58 已合入 `dev`；媒体 / 附件读取与错误边界已落地，真机 / Host 媒体联调挂账。
- MOB-014：有条件完成，Mobile PR #62 已 squash 合入 `dev`，merge commit `cfff6b3f61d2469a279e1579f8c080c48c829a7a`；Share Sheet / 当前聊天查找代码与双平台自动构建已通过，真实 Share Sheet、长会话查找与关闭搜索后的交互 smoke 挂账。
- MOB-015：有条件完成，Mobile PR #54 已合入 `dev`；真机设置持久化、system 主题切换、断开 / 重配对挂账。
- MOB-024：有条件完成。Desktop PR #88 已合入 `dev`，merge commit `e1752500cafd300bb6c9c82e9b5a610beb985d2c`；Mobile PR #65 已 squash 合入 `dev`，merge commit `a668bf503b3d540a1bd521e3792684af258de0d4`。`POST /threads` 通过现有 `messages:write` 兼容 scope 正式发布，Mobile 以 runtime manifest + device scope 做 capability guard，Drawer“聊天”已接真实 canonical Thread 创建；创建 POST 响应不确定时不会跨 Direct / Relay 重放。Desktop `pnpm check` 已通过；Mobile typecheck / lint / Jest 已通过，OpenCode Review 无高置信 P0-P2 finding。真实已配对设备无需重配对的新建 Thread 跨端 smoke 挂账。

### 拾言 MVP

- MOB-016：有条件完成，Mobile PR #55 已合入 `dev`；插件入口 / 场景 / 历史 UI 壳已 Gate，真机 UI 验收挂账。
- MOB-017：有条件完成，Mobile PR #56 已合入 `dev`；RecordingAdapter、Android/iOS 原生录音、本地恢复与平台构建已通过；真机短录音重启恢复及约 40 分钟长录音挂账。
- MOB-018：有条件完成。Cloud PR #1 已建立 CaptureTask / D1 / R2 / Workflow / device auth / direct upload 基础；该实现已经进入当前 Cloud `dev` 祖先基线。真实 Cloudflare 资源、Secret 与正式部署联调挂账。
- MOB-019：有条件完成并已进入 Cloud `dev`。Cloud PR #3 合入提交 `3917d00c825ca9783e0cabfcd4dc11b79b5bd166`；Workers AI STT、Transcript persistence、STT 独立 retry、72 小时默认音频保留与 retained / cleanup 已落地，自动门禁通过；真实约 40 分钟 Provider smoke 挂账。
- MOB-020：Review 后有条件可依赖，尚未合入。上游 PR #6（head `513b91e971627a3561f386002b6479061f9f7dc8`，来自 `t-zt/mira-shiyan-cloud` fork）已实现 LLM Gateway、内置 / 自定义 Scene、structured JSON -> Markdown AI Draft、AI adjustment、organize retry 与 Final Draft persistence。代码合同审查未发现新的高置信 P1/P2；因 fork PR 的 Actions 仍需上游批准，Cloud typecheck / tests / Worker dry-run / migration 证据尚不能记为已执行。下一步：批准并跑 Cloud CI，Review 后合入 Cloud `dev`。
- MOB-021：施工完成待合入。Mobile PR #63（head `b6afc294be07fe549779d60c2363d966d944549e`）已经对齐 MOB-020 PR #6：独立 ShiyanClient、提交 / 上传恢复、Stage UI、Transcript、AI Draft / adjustment、Final Draft、Scene 注册与冻结、retention、历史 / 分享均已接线；legacy `dictation -> quick-note` 已兼容。Mobile CI run #721：typecheck、lint、159 Jest、Android debug、iOS simulator 与 unsigned device build 全绿。OpenCode Review 当前因 `spawnSync opencode E2BIG` 在模型启动前失败，属于 Review 基建问题而非代码 finding。下一步：解决/绕过 Review 基建门禁后合入 `dev`；真实 Cloud/device smoke 挂 MOB-023。
- MOB-022：核心能力已进入 Cloud `dev`，最终接线未完成。DestinationAdapter、GitHub adapter、Delivery Record、幂等 / 并发恢复与 canonical evidence 已随 Cloud PR #5 合入；`mira-shiyan` 内容约定已落地。当前 Cloud `dev/src/api/index.ts` 只挂了 MOB-019 handler，尚未把 MOB-020 / MOB-022 public route 接入；因此 Final Draft -> GitHub Delivery POST、`GET /deliveries` 公网读取及真实 GitHub smoke 仍待 MOB-020 合入后收口。
- MOB-023：待启动的最终集成验收卡。已完成任务卡阅读与边界确认；只有 MOB-020 合入 Cloud `dev`、MOB-021 合入 Mobile `dev`、MOB-022 完成 Final Draft / public API 接线后才进入正式验收施工。40 分钟真机会议、真实 Provider / Secret、真实 GitHub URL 是 MOB-023 的验收内容，不作为修改上游代码合同的理由。

## 任务卡总览

| ID | 任务卡 | 当前状态 | 下一动作 |
|---|---|---|---|
| MOB-001 | 线程与项目数据契约确认 | 完成 | 无 |
| MOB-002 | 项目列表页 | 代码完成 | 随 MOB-010 做真实联调尾项 |
| MOB-003 | 项目详情页 | 代码完成 | 随 MOB-010 做真实联调尾项 |
| MOB-004 | 项目线程层级导航 | 有条件完成 | 真机回归 |
| MOB-005 | 线程类型视觉区分 | 完成 | 无 |
| MOB-006 | 真实线程状态与验收 | 代码完成 | 随版本执行平台 / 真机验收 |
| MOB-007 | 本机线程置顶 | 完成 | 无 |
| MOB-008 | 本机未读状态 | 完成 | 无 |
| MOB-009 | 简化桌面配对页 | 有条件完成 | 真机五路径 |
| MOB-010 | Desktop Remote 合同收口 | 有条件完成 | 真实 Desktop 配对联调 |
| MOB-011 | 0.2.0 会话交互回归修复 | 有条件完成 | 0.2.1 真机回归 |
| MOB-012 | Agent 手机审批闭环 | 有条件完成 | Desktop + Android / iOS 联调 |
| MOB-013 | 会话媒体与附件读取 | 有条件完成 | 真机 / Host 媒体联调 |
| MOB-014 | 会话手机工具 | 有条件完成；PR #62 已合入 | Share Sheet / 长会话查找 smoke |
| MOB-015 | 设备设置与连接收口 | 有条件完成 | 真机设置 / system / 重配对 |
| MOB-016 | 拾言插件入口与任务壳 | 有条件完成 | MOB-023 统一 UI smoke |
| MOB-017 | 拾言录音与本地恢复 | 有条件完成 | 40 分钟真机录音 + 重启恢复 |
| MOB-018 | 拾言 Cloud 基础与上传闭环 | 有条件完成 | 正式 Cloud 资源 / Secret smoke |
| MOB-019 | 拾言 STT / Transcript | 有条件完成；已在 Cloud `dev` | 40 分钟真实 Provider smoke |
| MOB-020 | 拾言 LLM 整理与 AI 调整 | PR #6 待 Cloud CI / Review / 合入 | 批准 fork Actions，跑 CI 后合并 |
| MOB-021 | 拾言 Mobile 结果 / Final Draft / 历史 | PR #63 待 Review / 合入；Mobile CI 全绿 | 解决 Review E2BIG，合入 `dev` |
| MOB-022 | 拾言 GitHub Destination | 核心已合入；Final Draft / public route 待接 | MOB-020 合入后补 route + real GitHub smoke |
| MOB-023 | 拾言 E2E 验收与加固 | 待启动 | 等 020/021/022 达到可联调基线 |
| MOB-024 | Mobile 新建会话与动态 Remote Capability | 有条件完成；Desktop #88 / Mobile #65 已合入 | 真实已配对设备新建 Thread 跨端 smoke |

## 拾言 canonical 产品规则

- 流程：选择场景 -> 录音 -> 确认标题 / 场景 -> 上传 -> STT -> AI 整理 / 调整 -> 用户最终编辑 -> 分享 / Destination。
- Transcript 长期保留且只读；原始录音默认 3 天，重要录音可 retained。
- CaptureTask 是中心事实；Stage 失败不能粗暴映射成整个 Task 失败。
- structured JSON 与 Markdown 双轨；Final Draft 由用户最终控制，后台 AI 不得静默覆盖。
- GitHub 是 MVP 第一 Destination，不是数据库；成功投递必须产生真实 URL + commit SHA。
- Mobile First，不依赖 Desktop / Host 在线；未来 Desktop 仍是一等客户端。
- MVP 不做 speaker diarization、实时字幕、PDF / Word、Notion、自动任务卡 / PRD、原文时间点精确跳转。

## 当前拾言依赖图

```text
MOB-016 ✓
MOB-017 ✓
MOB-018 ✓
   ↓
MOB-019 ✓
   ↓
MOB-020  PR #6：待 CI / Review / merge
   ├── MOB-021  PR #63：CI 全绿，待 Review / merge
   └── MOB-022  core 已合入，待 Final Draft + public route 接线
             \ /
           MOB-023
```

MOB-021 已基于 MOB-020 PR #6 的冻结合同施工，因此它不需要重新等待设计；但正式集成基线仍要求 MOB-020 进入 Cloud `dev`。MOB-023 不与上游实现卡并行施工。

## MOB-023 验收矩阵

正式启动后至少取得以下证据：

1. Android 真机约 40 分钟录音；
2. iOS 真机或等价原生 40 分钟稳定性证据；设备不足时明确标记未验收；
3. 真实端到端：录音 -> STT -> AI Draft -> AI 调整 -> Final Draft -> GitHub，并取得 canonical URL + commit SHA；
4. 会议结束后 5 分钟内进入可编辑整理稿，或记录真实瓶颈数据；
5. 无网结束录音后本地保留；
6. 上传中断 / App 重启恢复；
7. STT、LLM、Destination 分阶段失败与对应 retry；
8. retry 不重复创建 CaptureTask、音频或 GitHub 文档；
9. Final Draft 不被后续 AI 静默覆盖；
10. 默认 3 天音频策略与 retained；
11. 日志 / 错误不泄露录音正文、device credential、PAT、Provider Key；
12. 三仓 typecheck / lint / test / Worker dry-run 或现有等价门禁。

## 详细任务卡

`docs/task-cards/README.md` 是任务卡索引；MOB-007～MOB-024 的详细范围均在 `docs/task-cards/`。

## 历史追溯

- 2026-08-28 及之前：`docs/archive/work-ledger-2026-08-28.md`
- 2026-08-29 夜间临时授权：`docs/night-shift-handoff.md`
- 2026-08-29 夜间并行执行计划：`docs/night-shift-execution-plan.md`

历史文件只供追溯；若与本台账或 `docs/shiyan/` 最新 canonical truth 冲突，以后者为准。
