# MOB-031：拾言录音确认页主次交互收口

状态：**待实施**

负责人：`mob_031_shiyan_confirm_hierarchy`

执行仓库：`dangjingtao/uichat-mira-mobile`

施工基线：从施工时最新 `dev` 创建独立 feature 分支；本卡首次派发基于 2026-09-01 当前 `dev`。

## 背景

现有确认页已经具备小播放器、标题编辑、场景 Action Sheet、提交、本地保留和删除能力。烟测通过后，剩余问题主要是主次关系仍偏重：用户刚结束录音，真正必须做的只有“确认标题 / 场景并开始处理”；保存、删除、配置等低频能力不应与主动作争夺注意力。

本卡不重做 MOB-029，不改变播放器、Scene snapshot、LocalCapture 或提交合同，只收口交互层级。

## Goal

把确认页从“完整操作面板”收成“轻确认页”：

- 顶部轻量播放器用于快速试听；
- 标题与当前场景清晰可改；
- `开始整理` / `提交并开始处理` 是唯一主按钮；
- 本地保留、删除等能力仍存在，但降到次级入口；
- 返回行为必须安全，不要求用户额外理解保存机制。

## Must Read

- `AGENTS.md`
- `docs/shiyan/PRD.md`
- `docs/shiyan/TECHNICAL_DESIGN.md`
- `docs/task-cards/MOB-017-shiyan-recording-local-recovery.md`
- `docs/task-cards/MOB-029-shiyan-confirmation-ux.md`
- `src/shiyan/ShiyanCaptureSubmitScreen.tsx`
- `src/shiyan/playback/PlaybackAdapter.ts`
- `src/shiyan/recording/localCaptureRepository.ts`
- `src/shiyan/confirmation/sceneConfirmation.ts`
- `src/theme/tokens.ts`

如交互与 PRD 冲突，以 PRD 为准；如涉及保存、恢复或 task 创建时机，以 TECHNICAL_DESIGN 为准。

## Verified Context

- 用户结束录音后，本地文件已可靠保存；确认页不是“是否保存录音”的第一次机会。
- 只有用户明确提交后才创建云端 CaptureTask。
- MOB-029 已定义并实现确认页播放器与场景 bottom sheet 基础模式；本卡不得复制第二套 playback / scene state machine。

## Interaction Contract

### A. 页面主层级

推荐顺序：

```text
确认并提交

[ mini player ]

标题
[ ... ]

场景
会议采集                                      >

[ 开始整理 ]   // 唯一 Primary CTA

次级入口 / 更多
```

具体文案可在不改变语义前提下使用 `开始整理` 或现有 `提交并开始处理`；同一页面不得同时存在两个等权主按钮。

### B. Mini Player

- 保留播放 / 暂停、当前时间 / 总时长、seek。
- 文件大小、已安全保存等信息降为辅助信息，不得超过标题 / 场景 / 主 CTA 的视觉权重。
- 播放失败只影响试听，不得把录音标成损坏。
- 页面离开和删除前继续按既有 playback contract dispose。

### C. 场景

- 确认页只回显当前场景：`场景  会议采集  >`。
- 不在确认页平铺选项，不显示误导性的 radio + chevron 双语义。
- 点击整行打开现有 cross-platform Bottom Sheet / Action Sheet。
- Sheet 当前项显示 check；选择即更新并关闭，无额外确认按钮。

### D. 主提交动作

- 页面唯一 Primary CTA 负责：本地确认标题 / scene snapshot -> 创建 CaptureTask -> 上传 / 进入异步处理。
- 点击后保留现有真实进度与错误恢复语义。
- 创建任务、同步场景、确认录音等内部技术阶段不作为主文案逐条暴露；用户可见进度优先归纳为 `正在提交` / `正在上传` / `已进入整理` 等产品语言。
- 若实现层仍需要细粒度 progress phase，保留在代码中，不需要删除。

### E. 返回 / 稍后处理

- 用户点击系统返回 / 顶部返回时，不得删除已完成本地录音。
- 返回后该 LocalCapture 仍可从统一记录或现有本地恢复入口找到。
- **能力必须保留，但不要求一个与主 CTA 等权的“大号稍后提交按钮”。**
- 若现有产品合同要求显式“先保存在本机，稍后提交”入口，可将其降为 text button / secondary row / `···` 菜单项；不得移除该语义。
- 未保存的标题 / scene 编辑如何落盘必须沿用已有 `localCaptureRepository.confirm()` / recovery 语义；不要新造自动保存协议。

### F. 删除

- `删除本地录音` 属于 destructive low-frequency action。
- 不与主 CTA 同一区域争夺视觉权重；优先放页面底部弱入口或 `···` Action Sheet。
- 点击后必须二次确认，文案说明删除本地文件不可恢复。
- 若已有 cloud task，不能把删除本地文件伪装成删除云端 Task。

### G. 配置

- 确认页不新增长期 Cloud Settings 主入口。
- Cloud 未配置等错误可以提供一次性可操作跳转，但 canonical 配置入口仍在拾言主页 / 既有配置路径。

## Hard Constraints

- PRD 不改。
- 不删除“稍后处理 / 本地恢复”能力，只能改变它的呈现层级。
- 不修改 CaptureTask 创建时机。
- 不修改 Scene snapshot 冻结规则。
- 不重写 PlaybackAdapter / RecordingAdapter。
- 不新增音频编辑、倍速、波形剪辑等能力。
- 视觉必须使用当前 Design Token。

## Execution Entry Points

- `src/shiyan/ShiyanCaptureSubmitScreen.tsx`
- `src/shiyan/recording/localCaptureRepository.ts`
- `src/shiyan/confirmation/sceneConfirmation.ts`
- `src/shiyan/playback/PlaybackAdapter.ts`（原则上只核对，不重构）

## Acceptance

1. 页面只有一个视觉 Primary CTA。
2. 当前场景以整行值 + chevron 回显；选项只在 Sheet 内出现。
3. 用户返回后录音仍可恢复，不要求重新录音。
4. 显式“稍后处理”能力若保留按钮，视觉等级低于主 CTA。
5. 删除动作降级且必须二次确认。
6. 技术进度不再用“创建任务 / 同步场景 / 确认录音”占据主要产品文案。
7. 提交失败仍明确告诉用户本地录音安全、可重试。
8. MOB-029 已有播放器 / Sheet 行为不回归。

## Validation

至少执行：

```text
npm run typecheck
npm run lint
npm test -- --runInBand
```

测试 / smoke 至少覆盖：

- 播放 / pause / seek / dispose 不回归；
- 场景切换与 scene snapshot 正确；
- 返回后 LocalCapture 可恢复；
- submit 成功、upload 失败、Cloud 未配置；
- 删除本地文件与 cloud task 语义分离。

## Parallel / Integration

- 可与 MOB-030 并行。
- 不建议与其它任务同时大改 `ShiyanCaptureSubmitScreen.tsx`。
- MOB-034 最终统一检查 Secondary action、Action Sheet 与 token 视觉层级。

## Unknown / Human Decision

None。若施工发现“返回自动保留”与当前 local confirmation persistence 冲突，不自行改变保存合同，先报告并保留现有安全语义。

## Handoff

先确认当前 `dev` 已有 MOB-029 的真实实现；已有正确能力不重写，只调整主次层级和产品文案。