# Mira Mobile Work Ledger

更新时间：2026-09-07（Asia/Shanghai）

这是 Mira Mobile 的唯一当前任务台账，按 Mira Forge 的台账规则维护。Mobile 任务继续使用本仓库既有的 `MOB-*` 编号；Forge 的 `Txxx` 编号只属于 Forge 自身工作台，不在 Mobile 仓库复制。

状态语义统一为：

`TODO`：尚未开始；`DOING`：正在施工；`REVIEW`：代码或文档已落地，仍有评审、联调或人工验收；`PASS`：已有完整验收证据。

| ID | Task | Status | Evidence / Next action |
| --- | --- | --- | --- |
| MOB-001 | 线程与项目数据契约确认 | PASS | Repository contract and tests |
| MOB-002 | 项目列表页 | REVIEW | Code complete; real MOB-010 integration |
| MOB-003 | 项目详情页 | REVIEW | Code complete; real MOB-010 integration |
| MOB-004 | 项目线程层级导航 | REVIEW | Device regression |
| MOB-005 | 线程类型视觉区分 | PASS | Automated coverage |
| MOB-006 | 真实线程状态与验收 | REVIEW | Platform/device acceptance |
| MOB-007 | 本机线程置顶 | PASS | Device-local pin tests |
| MOB-008 | 本机未读状态 | PASS | Device-local unread tests |
| MOB-009 | 简化桌面配对页 | PASS | PR #27 squash-merged as `7fae641`; 真机五路径于 2026-09-04 在真实 Mira Desktop + 真实 Android/iOS 设备上全部通过（路径 1/3/5 由 MOB-036 同批次真机 smoke 顺验覆盖，路径 2/4 由本次独立真机跑验证）；从「有条件完成」升级为「完全完成」 |
| MOB-010 | Desktop Remote 合同收口 | REVIEW | Desktop pairing integration |
| MOB-011 | 0.2.0 会话交互回归修复 | REVIEW | 0.2.1 device regression |
| MOB-012 | Agent 手机审批闭环 | REVIEW | PR #57; Desktop + Android/iOS integration |
| MOB-013 | 会话媒体与附件读取 | REVIEW | PR #58; device/Host media smoke |
| MOB-014 | 会话手机工具 | REVIEW | PR #62; Share Sheet and long-session smoke |
| MOB-015 | 设备设置与连接收口 | REVIEW | PR #54; device settings/re-pairing |
| MOB-016 | 拾言插件入口与任务壳 | REVIEW | PR #55; unified Shiyan smoke |
| MOB-017 | 拾言录音与本地恢复 | REVIEW | PR #56; 40-minute recording/restart recovery |
| MOB-018 | 拾言 Cloud 基础与上传闭环 | REVIEW | Cloud foundation; real resources/secrets |
| MOB-019 | 拾言 STT / Transcript | REVIEW | Cloud PR #3; real Provider smoke |
| MOB-020 | 拾言 LLM 整理与 AI 调整 | REVIEW | Cloud PR #6; CI/review/merge pending |
| MOB-021 | 拾言 Mobile 结果 / Final Draft / 历史 | REVIEW | Mobile PR #63; real Cloud/device smoke |
| MOB-022 | 拾言 GitHub Destination | REVIEW | Core merged; public route wiring pending |
| MOB-023 | 拾言 E2E 验收与加固 | TODO | Blocked by MOB-020 and MOB-022 integration baseline |
| MOB-024 | Mobile 新建会话与动态 Remote Capability | REVIEW | Desktop #88 / Mobile #65; cross-device smoke |
| MOB-025 | 线程右滑操作与 Drawer 置顶分组修复 | PASS | PR #83 merged as `01fd9575`; PanResponder replaced by native horizontal ScrollView; final CI + OpenCode Review green; product owner completed Android real-device dogfood on 2026-09-05: all 8 acceptance items (左滑呼出置顶/删除 / 已置顶左滑取消置顶 / 收起不阻塞滚动与点击 / 删除确认取消成功失败 / Drawer 置顶独立分组在 Recent 上方 / 较旧置顶不被上限裁掉 / 取消置顶回 Recent / 重启 pin 持久化) passed |
| MOB-026 | 全局搜索命中消息正文 | REVIEW | Code `e628d5a`; long-session/degraded smoke |
| MOB-027 | 设置页插件入口恢复可用 | PASS | Code `327b2e4`; device entry regression accepted by product owner on 2026-09-01 |
| MOB-028 | 关于页版本更新检查与确认下载 | PASS | Original About UI/interaction work completed; MOB-028A/B replaced release-source semantics with branch-isolated R2 truth + same-channel versioned signed APK runtime update path; both subcards PASS |
| MOB-028A | R2 分支发行真相与 Manifest | PASS | PR #82 merged as `34b7eee`; dev `0.2.11-dev` manifest generated; signed APK checksum verified; R2 publish log confirmed `Published R2 release truth: dev/0.2.11` |
| MOB-028B | R2 分支隔离更新客户端 | PASS | PR #84 squash-merged as `d8134ba`; Typecheck/Lint/Jest green; latest OpenCode review found no P0-P2; same-channel R2 manifest/versioned APK validation covered; product owner accepted PASS on 2026-09-02 |
| MOB-029 | 拾言确认页播放器 / 场景 Action Sheet / Cloud 配置入口 | PASS | Product owner conditionally accepted on 2026-09-01; code `24513fb`; product owner confirmed all 9 card validation smoke items passed on 2026-09-03; Audio Player visual/component debt moved to MOB-031 |
| MOB-030 | 拾言首页与统一记录入口 | PASS | PR #86 squash-merged as `6065260`; product owner completed real-device acceptance on 2026-09-04: all 8 acceptance items (唯一主 CTA / 场景 Sheet / 全部记录聚合 / 去重 / 生命周期导航 / Stage 失败非整体失败 / 无网保留本地 / 单一 Design Token) passed |
| MOB-031 | 拾言确认页主次交互收口 | PASS | PR #87 squash-merged as `f4fdde4`; reusable AudioPlayer + full-track seek + single primary CTA landed; CI and OpenCode review green; product owner completed visual/real-device acceptance on 2026-09-03: acceptance items 1-10 all passed and item 11 MOB-029 playback/scene regression guard confirmed |
| MOB-032 | 拾言结果优先 Review / Final Draft | PASS | PR #88 squash-merged as `2741181`; product owner completed real-device acceptance on 2026-09-04: all 9 acceptance items (result-first 层级 / 展示优先级 / AI candidate 语义 / 人工稿保护 / Final Draft dirty-state 与保存 / Transcript 只读与失败保护 / processing 不伪造 / 文案用户化) passed; 验收中发现列表与详情状态不一致的独立 bug 另立 issue #95 跟踪（Cloud 修复 PR mira-shiyan-cloud#8 待合并），不影响本卡验收要点 |
| MOB-033 | 拾言处理详情与单阶段失败恢复 | REVIEW | **待真机验证**；PR #89 squash-merged as `680de12`; Typecheck/Lint/Jest, Android debug, iOS simulator/unsigned device builds all green; two latest OpenCode review attempts timed out without verdict; real Android/iOS + real dev Cloud retry/upload-recovery smoke required before PASS |
| MOB-034 | 拾言低频入口 / Share / Delivery / Token 收口 | REVIEW | **待真机/真实服务验证**；PR #91 squash-merged as `eb5f90a`; current-head Typecheck/Lint/Jest, Android debug, iOS simulator/unsigned iPhone/IPA build all green; OpenCode review was cancelled without verdict; verify Android/iOS More Sheet + system Share Sheet, real GitHub Delivery/canonical URL, retention changes, and light/dark UI before PASS |
| MOB-035 | 远程连接状态诊断与会话错误分层 | REVIEW | **待真机验证**；PR #92 squash-merged as `0d5f2c6e`; final-head Mobile CI fully green; OpenCode review cancelled without verdict after prior Codex P2 was fixed and resolved; Android state matrix + iOS equivalent smoke required before PASS |
| MOB-036 | 桌面配对入口与授权 Bottom Sheet 收口 | PASS | PR #90 squash-merged as `40a57227`; product owner completed real-device acceptance on 2026-09-04: all 5 acceptance paths (扫码→Sheet→关闭 / 扫码→提交→批准→Toast→首页 / 粘贴→Sheet→提交 / Desktop 拒绝 / 请求过期) passed; 与 MOB-009 同批次升 PASS，两卡真机 5 路径互为佐证 |
| MOB-037 | Mobile 双入口与 Local Provider Agent Runtime | DOING | 2026-09-06 阶段 A + 阶段 1 + 阶段 B 基础完成：RuntimeRegistry、来源筛选、本地 Provider 配置页、本地聊天流、ToolGateway 合同、工具策略、8 轮前台 Loop 与挂起边界；真实 Gateway 协议、Loop UI、长期运行时与真机验证待完成 |
| MOB-038 | Local Provider 多配置与选定 Provider 新建对话 | REVIEW | 2026-09-06 代码完成；多 Provider upsert/remove、独立 Key、选定 Provider 创建会话、聊天头部来源展示与删除保护已自动化验证；Android arm64-v8a debug 构建通过；待 Android / iOS 功能验收 |
| MOB-039 | 双入口来源选择与统一新建会话 | REVIEW | 2026-09-06 代码与自动化验证完成；主列表来源菜单、Drawer 双来源展示与统一新建入口待 Android / iOS 功能验收 |
| MOB-040 | 本地对话可靠发送与重试 | REVIEW | 2026-09-06 代码与自动化验证完成；本地消息幂等写入、取消/超时语义与失败重试待 Android / iOS 功能验收 |
| MOB-041 | Tool Gateway / MCP 协议与凭据合同确认 | TODO | 2026-09-06 已派卡；等待 Mira Host / Tool Gateway 明确 endpoint、鉴权、工具发现、审批、取消、结果和凭据隔离合同 |
| MOB-042 | 本地 Agent Loop UI 与运行状态呈现 | TODO | 2026-09-06 已派卡；依赖 MOB-041，当前仅有协议无关运行时和测试替身 |
| MOB-043 | Host / Pi 持久运行时适配 | TODO | 2026-09-06 已派卡；等待稳定 Host / Pi Runtime 协议，移动端不得猜测路由或状态字段 |
| MOB-044 | 双入口真机验收与发布加固 | TODO | 2026-09-06 已派卡；汇总 Android/iOS、真实 Provider、Host、凭据、网络和发布验收 |
| MOB-045 | Local Provider 会话生命周期闭环 | REVIEW | PR #99 squash-merged as `1062e0c2`；单会话本地删除、RuntimeRegistry Local/Remote 路由、设备本地 pin/read 清理及 Provider 删除解锁已落地；CodeRabbit 两项数据完整性/路由问题已修复并确认；Typecheck/Lint/Jest + Android debug build 通过；Android/iOS 真机删除与 Provider 解锁验收挂 MOB-044 |
| MOB-046 | OpenAI-compatible URL / SSE / Tool Call 兼容性修复 | TODO | 2026-09-06 已派卡；修复 Base URL 重复 /v1、[DONE] 覆盖 finish_reason、多 tool-call index 聚合 |
| MOB-047 | Provider API Key 配置 UX 与凭据状态安全修复 | TODO | 2026-09-06 已派卡；移除 ******** sentinel，分离 hasStoredKey 与新 Key 输入，补显式清除 |
| MOB-048 | 双链路提交窄范围代码卫生收尾 | TODO | 2026-09-06 已派卡；必须等待 MOB-045/046/047 合入后基于最新 dev 执行，不启动 broad architecture refactor |

## Deferred Engineering Governance

> 口径更新（2026-09-05）：原先的 Draft 设计议题已正式升级为 `MOB-037`。下方如仍保留“暂不分配新的 `MOB-*` 编号”的历史说明，以本更新和 `MOB-037` 正式任务卡为准；后续实现、协议确认和验收证据统一回写 `MOB-037` 与本台账。

### MOB-037 设计登记

- [MOB-037：Mobile 双入口与 Local Provider Agent Runtime](../task-cards/MOB-037-mobile-dual-entry-local-provider-agent-runtime.md)：**DOING**（阶段 A + 阶段 1 最小 UI 接线）。
- 设计附件：[Mobile Dual-Entry and Local Provider Agent Runtime Design](../remote-access/local-provider-agent-runtime-design.md)。
- 阶段 A、阶段 1 最小 UI 接线和阶段 B 基础 Loop 已落地；当前没有真实 Tool Gateway 协议实现、Loop UI 状态或跨端验收证据。

后续正式任务卡已派出：MOB-041 负责 Tool Gateway / MCP 协议与凭据合同，MOB-042 负责本地 Agent Loop UI，MOB-043 负责 Host / Pi 持久运行时适配，MOB-044 负责 Android / iOS 真机验收与发布加固。未确认的协议项继续保持为阻塞前置，不在移动端猜测实现。

2026-09-06 维护者在双链路基础提交 `7bc3556` 代码审查后，明确授权立即派出一张**窄范围**卫生卡 MOB-048，用于清理本次提交及直接相邻代码中的死代码、token 违例与明显边界残留。该决定不等于启动此前候选的 Conversation orchestration / Host gateway / App composition broad refactor；后者继续 deferred。

当前治理真相：

- [Mobile Code Health — Initial Assessment](../engineering/mobile-code-health-initial-assessment.md)：记录当前代码卫生初步判断、主要边界问题与候选整治顺序；结论是聚焦高变更边界，不做仓库级重写。
- [Mobile E2E Acceptance Plan](../testing/mobile-e2e-acceptance-plan.md)：记录 `test` 分支触发的 GitHub Actions + Maestro 黑盒 E2E 方向、构建物复用、测试证据、邮件通知和 regression attribution 原则。

MOB-048 必须等待 MOB-045/046/047 合入后重新读取最新 `dev` 与本台账再施工。未来若启动更大的治理批次，仍必须重新读取当时事实，不机械照搬 2026-09-02 初判。

`PASS` 只表示仓库验收证据和必要的产品/机器观察均已完成。`REVIEW` 不得被解释为真实设备、Host、Cloud、Provider 或跨仓端到端已通过。

详细范围、历史证据和跨仓依赖保留在 [`../task-cards/`](../task-cards/) 与对应产品 / 技术设计文档中；这些资料不得与本台账产生相反状态。
