# Mobile 工作台账（兼容镜像）

> Canonical 台账已统一为 [`docs/workbench/00-work-ledger.md`](workbench/00-work-ledger.md)，状态语义遵循 Mira Forge：`TODO → DOING → REVIEW → PASS`。本文件保留详细范围与历史证据；若与 canonical 台账冲突，以 `00-work-ledger.md` 为准，并应立即修正镜像。

更新时间：2026-09-01（Asia/Shanghai）

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
- MOB-025：REVIEW。PR #83 已 squash 合入 `dev`（`01fd9575`）；已删除 Session row 的自定义 `PanResponder` 路径，改用原生横向 `ScrollView`，保留 device-local pin、Host-authoritative delete 与 Drawer 置顶分组；最终 typecheck / lint / Jest、Android debug APK、iOS simulator / unsigned iPhone build 全绿，OpenCode Review 无高置信 P0-P2 finding；Android 真机 dogfood 通过前不得记为 PASS。
- MOB-026：有条件完成，代码已进入当前 `dev`（`e628d5a`）；全局搜索已覆盖消息正文且不新增 Host search route；真实长会话 / 降级状态 smoke 挂账。
- MOB-027：完成。代码已进入当前 `dev`（`327b2e4`）；Settings「插件」行已接现有 `Plugins` route；产品负责人于 2026-09-01 确认真机入口回归通过。
- MOB-028：有条件完成，代码已进入当前 `dev`（`88d54a7`）；已加入 release-channel-aware 更新检查与确认下载边界，Android 仍只交系统 / 浏览器下载、不做静默安装；真实 release metadata / 下载 smoke 挂账。
- MOB-035：待实施。把会话首页、Drawer、搜索页当前被压平的「加载会话失败」拆成未配对、手机离线、凭据失效、权限不足、Host 不可达与会话服务失败；只有 Desktop / Relay 提供权威 presence / reachability 证据时才允许显示「Mira Desktop 当前离线」，普通 `NETWORK_ERROR` 不得冒充设备离线。

### 拾言 MVP

- MOB-016：有条件完成，Mobile PR #55 已合入 `dev`；插件入口 / 场景 / 历史 UI 壳已 Gate，真机 UI 验收挂账。
- MOB-017：有条件完成，Mobile PR #56 已合入 `dev`；RecordingAdapter、Android/iOS 原生录音、本地恢复与平台构建已通过；真机短录音重启恢复及约 40 分钟长录音挂账。
- MOB-018：有条件完成。Cloud PR #1 已建立 CaptureTask / D1 / R2 / Workflow / device auth / direct upload 基础；该实现已经进入当前 Cloud `dev` 祖先基线。真实 Cloudflare 资源、Secret 与正式部署联调挂账。
- MOB-019：有条件完成并已进入 Cloud `dev`。Cloud PR #3 合入提交 `3917d00c825ca9783e0cabfcd4dc11b79b5bd166`；Workers AI STT、Transcript persistence、STT 独立 retry、72 小时默认音频保留与 retained / cleanup 已落地，自动门禁通过；真实约 40 分钟 Provider smoke 挂账。
- MOB-020：Review 后有条件可依赖，尚未合入。上游 PR #6（head `513b91e971627a3561f386002b6479061f9f7dc8`，来自 `t-zt/mira-shiyan-cloud` fork）已实现 LLM Gateway、内置 / 自定义 Scene、structured JSON -> Markdown AI Draft、AI adjustment、organize retry 与 Final Draft persistence。代码合同审查未发现新的高置信 P1/P2；因 fork PR 的 Actions 仍需上游批准，Cloud typecheck / tests / Worker dry-run / migration 证据尚不能记为已执行。下一步：批准并跑 Cloud CI，Review 后合入 Cloud `dev`。
- MOB-021：已合入 Mobile `dev`。PR #63 merge commit `72f854d9f378fb7a5e8ed9ec248c7b16565665a5`；其施工内容已对齐 MOB-020 PR #6，Mobile CI run #721 的 typecheck、lint、159 Jest、Android debug、iOS simulator 与 unsigned device build 全绿。真实 Cloud/device smoke 仍挂 MOB-023。
- MOB-022：核心能力已进入 Cloud `dev`，最终接线未完成。DestinationAdapter、GitHub adapter、Delivery Record、幂等 / 并发恢复与 canonical evidence 已随 Cloud PR #5 合入；`mira-shiyan` 内容约定已落地。当前 Cloud `dev/src/api/index.ts` 只挂了 MOB-019 handler，尚未把 MOB-020 / MOB-022 public route 接入；因此 Final Draft -> GitHub Delivery POST、`GET /deliveries` 公网读取及真实 GitHub smoke 仍待 MOB-020 合入后收口。
- MOB-023：待启动的最终集成验收卡。已完成任务卡阅读与边界确认；只有 MOB-020 合入 Cloud `dev`、MOB-021 合入 Mobile `dev`、MOB-022 完成 Final Draft / public API 接线后才进入正式验收施工。40 分钟真机会议、真实 Provider / Secret、真实 GitHub URL 是 MOB-023 的验收内容，不作为修改上游代码合同的理由。
- MOB-029：有条件完成，代码已进入当前 `dev`（`24513fb`）；拾言 Cloud 配置入口、确认页录音播放器与场景 Action Sheet 已落地，不改变 CaptureTask / Scene snapshot / Draft / Delivery 合同；双平台真机播放 / 场景修改 smoke 挂账。
- MOB-030：待实施。拾言首页收成一个主 CTA，并用 presentation projection 统一展示 LocalCapture / CaptureTask；不合并底层事实模型。
- MOB-031：待实施。基于既有播放器与场景 Sheet 收轻确认页，明确唯一主提交动作并保留本地恢复 / 稍后处理能力。
- MOB-032：待实施。TaskDetail 改为结果优先；整理稿 / Transcript / AI candidate / Final Draft 的内部合同保持不变。
- MOB-033：待实施。处理详情默认折叠，单 Stage 失败提供局部恢复；依赖 MOB-032 的结果页结构稳定后施工。
- MOB-034：待实施。负责人 `t-zt`；在 030～033 后统一 More / Action Sheet、Share / Delivery、原音保留、文案与 Design Token。

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
| MOB-021 | 拾言 Mobile 结果 / Final Draft / 历史 | 已合入 `dev`；PR #63 merge `72f854d` | 真实 Cloud/device smoke 挂 MOB-023 |
| MOB-022 | 拾言 GitHub Destination | 核心已合入；Final Draft / public route 待接 | MOB-020 合入后补 route + real GitHub smoke |
| MOB-023 | 拾言 E2E 验收与加固 | 待启动 | 等 020/022 达到可联调基线 |
| MOB-024 | Mobile 新建会话与动态 Remote Capability | 有条件完成；Desktop #88 / Mobile #65 已合入 | 真实已配对设备新建 Thread 跨端 smoke |
| MOB-025 | 线程右滑操作与 Drawer 置顶分组修复 | REVIEW；PR #83 / `01fd9575` 已合入 `dev` | Android 真机验证右滑、纵向滚动、点击、置顶 / 删除与重启持久化；通过后再 PASS |
| MOB-026 | 全局搜索命中消息正文 | 有条件完成；代码 `e628d5a` 已入 `dev` | 长会话 / 降级状态 smoke |
| MOB-027 | 设置页插件入口恢复可用 | 完成；代码 `327b2e4` 已入 `dev` | 无 |
| MOB-028 | 关于页版本更新检查与确认下载 | 有条件完成；代码 `88d54a7` 已入 `dev` | release metadata / 下载 smoke |
| MOB-029 | 拾言确认页播放器 / 场景 Action Sheet / Cloud 配置入口 | 有条件完成；代码 `24513fb` 已入 `dev` | 双平台真机 smoke |
| MOB-030 | 拾言首页与统一记录入口 | 待实施 | 可与 MOB-031 并行；从最新 `dev` 独立施工 |
| MOB-031 | 拾言确认页主次交互收口 | 待实施 | 可与 MOB-030 并行；基于现有 MOB-029 能力收口 |
| MOB-032 | 拾言结果优先 Review / Final Draft | 待实施 | 独立修改 TaskDetail 结果层级 |
| MOB-033 | 拾言处理详情与单阶段失败恢复 | 待实施 | **依赖 MOB-032**；032 合入后基于最新 `dev` 施工 |
| MOB-034 | 拾言低频入口 / Share / Delivery / Token 收口 | 待实施 | **负责人 `t-zt`**；建议 030～033 后施工 |
| MOB-035 | 远程连接状态诊断与会话错误分层 | 待实施 | Mobile 先保留结构化失败原因；若缺 Host 在线权威信号，再补 Desktop / Relay 最小合同 |

## 2026-08-29 Dogfood Follow-up 并行规则

MOB-025～MOB-029 首次派卡共同基线为 Mobile `dev @ a90dfb6c2d80079fd85084fff0214968e137e653`。正式施工时每张卡仍必须先 fetch 当前 `dev` 并确认 HEAD；若任务卡合入后 `dev` 已前进，以新 HEAD 为准。

- MOB-025 / 026 / 027 可并行，入口分别主要位于 Thread list+Drawer、Global Search、Settings。
- MOB-028 在保持“确认后交系统 / 浏览器下载、不实现 native installer”的范围内可并行。
- MOB-029 是本批唯一明确可能同时触碰 Android / iOS native audio 的卡，建议独立 worktree / branch。
- 如果 MOB-028 或 MOB-029 施工过程中需要同时修改共享 native package registration、Podfile、MainApplication、全局 navigation / store 等共享合同，必须先报告并重新判断集成顺序；不能仅因文件暂时没冲突就认为可安全并行。

## 2026-09-01 拾言 UX Follow-up 并行规则

MOB-030～034 是烟测通过后的交互收口批次。共同原则：**PRD 不改；技术事实不合并；设计稿定义交互意图，视觉实现以现有 Design Token 为准。**

- MOB-030 / MOB-031 可以并行；两张卡都应从施工时最新 `dev` 开独立分支。
- MOB-032 可以与 030 / 031 并行，主要修改 TaskDetail 的内容层级。
- MOB-033 不与 MOB-032 同时大改 TaskDetail；032 合入后重新 fetch / rebase 最新 `dev` 再施工。
- MOB-034 最后施工，由 `t-zt` 负责低频入口、Share / Delivery、文案和 token 统一；不要在前四张卡尚未稳定时提前做视觉重排。
- 若任一卡为了“做得更顺”需要增加搜索、录音标记、时间点引用、Mind Map、模板市场等 PRD 外功能，立即停止并回读 `docs/shiyan/PRD.md`，不得擅自扩 Scope。

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
   ├── MOB-021 ✓ Mobile dev
   └── MOB-022  core 已合入，待 Final Draft + public route 接线
             \ /
           MOB-023
```

MOB-021 已基于 MOB-020 PR #6 的冻结合同施工并合入 Mobile `dev`，因此它不需要重新等待设计；但正式集成基线仍要求 MOB-020 进入 Cloud `dev`。MOB-023 不与上游实现卡并行施工。

### UX Follow-up 依赖

```text
MOB-030 ─┐
         ├─ parallel
MOB-031 ─┘

MOB-032
   ↓
MOB-033
   ↓
MOB-034 (`t-zt`)
```

这条 UX 依赖链不覆盖上面的 MVP Cloud / E2E 依赖；它只约束 Mobile UI 的施工顺序。

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

`docs/task-cards/README.md` 是任务卡索引；MOB-007～MOB-035 的详细范围均在 `docs/task-cards/`。

## 历史追溯

- 2026-08-28 及之前：`docs/archive/work-ledger-2026-08-28.md`