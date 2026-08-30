# Mira Mobile 夜间并行施工计划

状态：2026-08-29 夜间执行计划

有效期：至 2026-08-29 12:00（Asia/Shanghai）

状态真相：`docs/work-ledger.md`

放行规则：`docs/night-shift-handoff.md`

> 本文件是执行计划，不是第二套台账。所有任务状态、验收尾项与最终结论只回写 `docs/work-ledger.md`。

## 1. 目标

在用户离线期间尽可能推进当前 Mobile 台账内可自动施工的未完成任务 MOB-012～MOB-023。

采用“一个总控 + 多条施工线”的方式。施工线并行准备实现和 PR；总控负责统一 Review、放行、合并和台账写入，避免多个后台任务并发修改同一状态文件。

## 2. 角色

### 总控 / Gatekeeper

唯一允许：

- 修改 `docs/work-ledger.md` 的任务状态；
- 根据 `docs/night-shift-handoff.md` 宣告“有条件通过（放行后续）”；
- Review 各施工 PR、读取 review threads / CI / diff；
- 决定返工、合并或真实阻塞；
- 合并后重新读取目标仓库 HEAD 并解锁后继任务；
- 在所有实现链达到可联调条件后推进 MOB-023；
- 到 12:00 前形成醒来验收清单。

总控不得因为 CF Key、Provider Key、GitHub PAT、真机、签名、正式部署等用户侧尾项机械停止其它施工。

### 施工线

施工线只负责：

- 每轮重新读取最新台账、任务卡、目标仓库 HEAD 和相关代码；
- 从最新合法基线创建或继续当前任务的独立分支；
- 完成最小可验证实现；
- 运行/利用当前环境可执行的验证和 CI；
- 创建 PR，或根据 Review findings 修复已有 PR；
- 在 PR 中如实记录无法完成的 Secret / 真机 / 人工证据。

施工线不得：

- 修改统一 `docs/work-ledger.md` 的状态；
- 自行把任务标为完成；
- 在未经过总控 Gate 的情况下合并；
- 因等待人工尾项而占住整条队列。

## 3. 并行车道

### Lane A — Chat / Agent

```text
MOB-012
   ↓ 条件放行
MOB-013 + MOB-014
```

- MOB-012 先冻结 Agent Run / runId / approval 状态边界。
- MOB-013 与 MOB-014 在 MOB-012 条件放行后可同时准备，但必须避免同时重写同一 Chat 状态机或 Message renderer。
- 如果当前代码无法证明二者安全并行，则优先 MOB-013，MOB-014 保持独立 helper / UI 施工，集成部分等待 rebase。
- MOB-012 若因稳定 runId 真相缺失而真实阻塞，只阻塞 Lane A，不影响其它车道。

### Lane B — Device Settings

```text
MOB-015
```

完全独立车道。主要拥有 Settings / Theme / local storage / disconnect。

### Lane C — Shiyan Mobile Product UI

```text
MOB-016
   ↓ 等待 017 / 020 的实现合同条件放行
MOB-021
```

- MOB-016 只建设插件入口、场景和任务 UI 壳。
- MOB-021 只有在 016、017、018、019、020 的后续实现依赖均已“完成”或“有条件通过（放行后续）”后进入集成施工。
- 人工验收未完成本身不阻塞 MOB-021。

### Lane D — Shiyan Recording / Native

```text
MOB-017
```

独立处理 RecordingAdapter、麦克风权限、本地恢复和 native 影响。
40 分钟真实录音属于用户醒来后的验收证据；只要录音合同、构建和自动化证据足够，总控可条件放行。

### Lane E — Shiyan Cloud

```text
MOB-018
   ↓
MOB-019
   ↓
MOB-020
   ↓
MOB-022
```

- 018 / 019 / 020 保持串行，因为共享 Workflow、Stage、Transcript 和 structured content 合同。
- 每一张在总控条件放行并合入目标仓库正式基线后，下一张立即解锁。
- 020 条件放行后，MOB-021（Lane C）与 MOB-022（Lane E）可以并行。
- Cloudflare Secret / 正式账号绑定不阻塞本地合同和实现施工。

## 4. 最终集成 MOB-023

MOB-016～MOB-022 不要求全部“最终完成”才启动 MOB-023。

当所有前置任务均为以下任一状态时即可启动：

- `完成`
- `有条件通过（放行后续）`

MOB-023 夜间负责：

- 三仓合同一致性；
- 可自动完成的端到端测试与失败恢复检查；
- 发现真实集成 bug 时回到对应 Lane 修复；
- 汇总 40 分钟真实会议、真机、Secret、正式部署等醒来后验收项。

无法在无人工环境下取得的真实设备/账号证据不伪造，可将 MOB-023 标记为有条件通过并保留最终人工验收尾项。

## 5. 并发上限与竞态规则

初始最多同时维持 5 条活跃施工线：A / B / C / D / E。

以下文件/合同视为共享热点，出现并发修改时由总控决定串行/rebase：

- `App.tsx` / navigation registry；
- `ChatScreen` Agent 状态机；
- Message renderer；
- package / lockfile；
- iOS Podfile / Info.plist；
- Android Manifest / native config；
- Cloud schema / migrations；
- Workflow / Stage shared types；
- Final Draft / structured content contract；
- `docs/work-ledger.md`。

无法证明无语义竞态时，默认串行。

## 6. 每轮运行协议

每个后台任务每轮都必须重新获取 GitHub 当前事实，不依赖上一轮聊天记忆：

```text
读取 dev work-ledger / night-shift rules
-> 读取当前任务卡
-> 获取目标 repo HEAD / open PR / review / CI
-> 若已有 PR：优先处理 findings
-> 若前置依赖已条件放行：继续下一任务
-> 若当前任务可施工：创建/更新独立 PR
-> 若遇人工尾项：记录到 PR，不把它当施工阻塞
-> 若遇真实合同阻塞：在 PR 中精确说明并停止该 Lane
```

总控每轮：

```text
读取所有 Lane 的 open PR / review / CI
-> Review diff 和合同一致性
-> 要求返工，或判完成/有条件通过
-> Merge 可放行 PR
-> 更新唯一 work-ledger
-> 重新读取 HEAD
-> 解锁下一批任务
-> 如果 016～022 都达到可联调条件，推进/审查 MOB-023
```

## 7. 夜间成功标准

到 12:00 前目标不是制造“全绿假象”，而是：

1. 所有能够在无人值守环境可靠完成的任务尽量进入正式基线；
2. 能条件放行的依赖不被人工配置机械阻塞；
3. 每个未最终完成项都有明确证据和醒来后的具体动作；
4. 不伪造真机、Secret、正式部署、真实会议或跨端验收；
5. 不因某一 Lane 阻塞停止其它独立 Lane；
6. `docs/work-ledger.md` 始终保持唯一、可信、可恢复的进度真相。
