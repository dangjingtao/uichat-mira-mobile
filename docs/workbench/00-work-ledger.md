# Mira Mobile Work Ledger

更新时间：2026-09-02（Asia/Shanghai）

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
| MOB-009 | 简化桌面配对页 | REVIEW | Real five-path device acceptance |
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
| MOB-025 | 线程右滑操作与 Drawer 置顶分组修复 | REVIEW | PR #83 merged as `01fd9575`; PanResponder replaced by native horizontal ScrollView; final CI + OpenCode Review green; Android real-device dogfood required before PASS |
| MOB-026 | 全局搜索命中消息正文 | REVIEW | Code `e628d5a`; long-session/degraded smoke |
| MOB-027 | 设置页插件入口恢复可用 | PASS | Code `327b2e4`; device entry regression accepted by product owner on 2026-09-01 |
| MOB-028 | 关于页版本更新检查与确认下载 | REVIEW | Existing code `88d54a7` superseded in release-source semantics by MOB-028A/B; retain UI/interaction work, replace GitHub runtime update source |
| MOB-028A | R2 分支发行真相与 Manifest | TODO | R2-only release truth; predev/dev/test/prod isolated; publish `latest.json` last |
| MOB-028B | R2 分支隔离更新客户端 | TODO | Depends on MOB-028A; app reads only its own R2 channel manifest and downloads same-channel signed APK |
| MOB-029 | 拾言确认页播放器 / 场景 Action Sheet / Cloud 配置入口 | REVIEW | Product owner conditionally accepted on 2026-09-01; code `24513fb`; dual-platform device smoke pending; Audio Player visual/component debt assigned to MOB-031 |
| MOB-030 | 拾言首页与统一记录入口 | TODO | Start from latest `dev` |
| MOB-031 | 拾言确认页主次交互收口 | TODO | Start from latest `dev` |
| MOB-032 | 拾言结果优先 Review / Final Draft | TODO | Independent TaskDetail work |
| MOB-033 | 拾言处理详情与单阶段失败恢复 | TODO | Depends on MOB-032 PASS |
| MOB-034 | 拾言低频入口 / Share / Delivery / Token 收口 | TODO | Owner `t-zt`; after MOB-030..033 |
| MOB-035 | 远程连接状态诊断与会话错误分层 | TODO | Distinguish unpaired/auth/permission/mobile-offline/Host-unreachable/session failures; never infer Host offline without authoritative evidence |

## Deferred Engineering Governance

产品负责人要求先记录、暂不插入当前功能施工；等当前正在收尾的 Mobile 功能卡 / 功能批次结束后，再集中建立治理任务卡并执行。

当前仅保留两份治理真相，不分配新的 `MOB-*` 编号：

- [Mobile Code Health — Initial Assessment](../engineering/mobile-code-health-initial-assessment.md)：记录当前代码卫生初步判断、主要边界问题与候选整治顺序；结论是聚焦高变更边界，不做仓库级重写。
- [Mobile E2E Acceptance Plan](../testing/mobile-e2e-acceptance-plan.md)：记录 `test` 分支触发的 GitHub Actions + Maestro 黑盒 E2E 方向、构建物复用、测试证据、邮件通知和 regression attribution 原则。

启动治理批次前必须重新读取最新 `dev` 与本台账；若代码结构、CI 或当前功能优先级已变化，以启动时事实重新派卡，不机械照搬本次初判。

`PASS` 只表示仓库验收证据和必要的产品/机器观察均已完成。`REVIEW` 不得被解释为真实设备、Host、Cloud、Provider 或跨仓端到端已通过。

详细范围、历史证据和跨仓依赖仍保留在 [`../work-ledger.md`](../work-ledger.md) 与 [`../task-cards/`](../task-cards/)；这些文件不得与本台账产生相反状态。
