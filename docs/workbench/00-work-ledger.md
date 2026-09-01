# Mira Mobile Work Ledger

更新时间：2026-09-01（Asia/Shanghai）

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
| MOB-025 | 线程右滑操作与 Drawer 置顶分组修复 | REVIEW | Code `1035da3`; device dogfood smoke |
| MOB-026 | 全局搜索命中消息正文 | REVIEW | Code `e628d5a`; long-session/degraded smoke |
| MOB-027 | 设置页插件入口恢复可用 | PASS | Code `327b2e4`; device entry regression accepted by product owner on 2026-09-01 |
| MOB-028 | 关于页版本更新检查与确认下载 | REVIEW | Code `88d54a7`; release metadata/download smoke |
| MOB-029 | 拾言确认页播放器 / 场景 Action Sheet / Cloud 配置入口 | REVIEW | Code `24513fb`; dual-platform device smoke |
| MOB-030 | 拾言首页与统一记录入口 | TODO | Start from latest `dev` |
| MOB-031 | 拾言确认页主次交互收口 | TODO | Start from latest `dev` |
| MOB-032 | 拾言结果优先 Review / Final Draft | TODO | Independent TaskDetail work |
| MOB-033 | 拾言处理详情与单阶段失败恢复 | TODO | Depends on MOB-032 PASS |
| MOB-034 | 拾言低频入口 / Share / Delivery / Token 收口 | TODO | Owner `t-zt`; after MOB-030..033 |

`PASS` 只表示仓库验收证据和必要的产品/机器观察均已完成。`REVIEW` 不得被解释为真实设备、Host、Cloud、Provider 或跨仓端到端已通过。

详细范围、历史证据和跨仓依赖仍保留在 [`../work-ledger.md`](../work-ledger.md) 与 [`../task-cards/`](../task-cards/)；这些文件不得与本台账产生相反状态。
