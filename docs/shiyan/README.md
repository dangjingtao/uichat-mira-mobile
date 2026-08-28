# 拾言（Shiyan）功能唯一真相

状态：产品 / 架构唯一真相源（Canonical Source of Truth）

适用仓库：

- `dangjingtao/uichat-mira-mobile`
- `dangjingtao/mira-shiyan-cloud`
- `dangjingtao/mira-shiyan`

## 1. 唯一真相规则

拾言的唯一真相统一位于本目录 `docs/shiyan/`。

其中：

- `PRD.md`：产品问题、用户场景、功能范围、交互规则、异常与验收标准的产品基线。
- `README.md`：跨仓库边界、架构原则与一致性治理规则。

另外两个仓库不得独立定义或修改拾言的产品行为：

- `mira-shiyan-cloud` 只实现这里已经确认的云端能力。
- `mira-shiyan` 只作为默认内容 Destination，不反向定义拾言业务。

如果实现需要改变本目录已经确认的产品或跨仓库合同，必须先更新 Mobile 侧真相并完成一致性检查，再修改其它仓库。

## 2. 产品定位

**拾言**是 Mira 的官方内置生产力插件。

目标不是“录音转文字”，而是在高强度工作下，把难以避免的冗长会议快速收敛成可执行信息，并尽快完成整理、调整和落地。

产品形态：

- Mobile First，但不是 Mobile Only。
- Mobile 是优先采集端。
- Desktop 始终是一等客户端，负责更完整的回看、调整、配置和历史使用。
- 首版作为 Mira 官方内置插件；架构保留未来第三方插件扩展能力，但第三方插件生态不属于 MVP。

完整产品需求以 [`PRD.md`](./PRD.md) 为准。

## 3. 场景模型

拾言采用“轻量内置 + 自定义场景”的方式。

首版优先级：

1. 会议采集。
2. 临时口述需求。
3. 个人复盘 / 想法记录。

场景决定“如何整理”，Destination 决定“整理后送到哪里”，二者必须解耦。

## 4. 核心用户流程

```text
选择场景
  -> 采集
  -> 转写
  -> AI 整理 / AI 调整
  -> 回显原文与整理稿
  -> 用户最终调整
  -> 分享 / 投递
```

约束：

- Transcript（原始转写）作为一等数据长期保留。
- AI 可在用户最终编辑前反复整理和调整。
- 用户最终编辑后的内容不得被后台 AI 自动覆盖。
- 投递前以用户确认后的 Final Draft 为准。

## 5. MVP 范围

MVP 只要求跑通一条真实可用闭环：

```text
Mira Mobile 录音
  -> 云端保存与处理
  -> STT
  -> LLM 整理
  -> 回显 / 调整
  -> GitHub 投递
```

主要验收样本：约 40 分钟真实会议录音。

MVP 不要求：

- 多人说话人识别。
- 实时字幕。
- 自动拆任务卡。
- 自动生成 PRD。
- 自动判断需求变更并修改正式文档。
- 完整第三方插件市场。

具体产品范围、分享 / 导出、历史任务、录音保留和验收场景以 `PRD.md` 为准。

## 6. 任务模型

拾言以 **CaptureTask / 任务** 为中心，不以文件或最终文档为中心。

录音、Transcript、AI Draft、Final Draft、导出、Destination 投递都是同一任务的阶段或产物。

### 状态语义原则

禁止把任一阶段错误粗暴映射成“整个任务失败”。

必须区分：

- Task 当前阶段。
- Stage 自身状态。
- 具体错误与是否可重试。

已经成功的阶段与产物不得因后续失败而失效。

例如：

- STT 失败：录音仍然有效，可重试 STT。
- LLM 整理失败：Transcript 仍然有效。
- GitHub 投递失败：Final Draft 仍然有效，可重新投递。
- 导出失败：不得污染 CaptureTask 的其它阶段。

## 7. 数据与持久化边界

当前方向：

- D1：拾言服务端事实数据、任务状态、关系与结构化内容。
- R2：录音及其它大文件 / 原始资产。
- Transcript：长期保留；结构化内容可查询，原始 Provider 输出允许归档。
- Mobile / Desktop 本地存储：只用于录音可靠性、离线与缓存，不作为跨端唯一真相。

GitHub / Notion / 飞书 / 企业微信 / 微信等属于 Destination，不是拾言数据库。

## 8. 内容格式

内部内容采用双轨：

- 结构化 JSON：表达语义结构，供 AI、Destination Adapter 与后续能力消费。
- Markdown：面向人类编辑、GitHub 投递与通用分享。

GitHub 与 Notion 是首批优先 Destination。

## 9. GitHub Destination

默认内容仓库：`dangjingtao/mira-shiyan`。

MVP：

- 用户完成最终调整并确认后再投递。
- GitHub 自身 commit history 作为已投递文档的可信历史。
- 拾言不重复实现完整 Git 版本系统。
- GitHub 首版优先使用最小权限的 Fine-grained PAT；正式多用户能力再升级 GitHub App。

## 10. 云端边界

云端实现仓库：`dangjingtao/mira-shiyan-cloud`。

原则：

- 手机优先，但 API / 数据边界必须允许未来 Desktop 作为一等客户端接入。
- MVP 可使用设备身份；正式账户模型预留 `userId`，不得把 `deviceId` 固化为最终用户体系。
- 录音结束后上传；大文件应直接进入对象存储，不通过业务 Worker 中转。
- STT Provider 可替换。
- LLM 不要求使用 Workers AI；使用独立轻量 LLM 服务层统一保管现有 Provider Key、基础路由、fallback 与错误归一。
- LLM 服务层不得拥有 CaptureTask 业务状态解释权。

具体 API、表结构、切片参数、库选型等由实现根据稳定性、落地成本与 Debug 成本决定，不在产品真相层过度固化。

## 11. 跨仓库一致性检查

涉及以下内容的任何修改，都必须执行一致性检查：

- 产品流程与交互语义。
- MVP 范围。
- CaptureTask / Stage 状态语义。
- Transcript / Draft / Final Draft 数据边界。
- 云端 API 合同与关键数据合同。
- STT / LLM Provider 边界。
- Destination 行为。
- Mobile / Desktop 职责。

### 修改前

1. 阅读本目录的 `PRD.md` 与本文件相关章节。
2. 确认修改属于实现细节还是会改变 canonical truth。
3. 若会改变产品或跨仓库合同，先修改本目录真相并完成评审。

### 修改后

1. 对照 `PRD.md` 与本文件逐项核对行为和状态语义。
2. 检查 `mira-shiyan-cloud` 是否出现与本目录冲突的接口、状态或数据定义。
3. 检查 `mira-shiyan` 是否被错误用作业务数据库或业务真相源。
4. 若跨仓库合同发生变化，三个仓库中的引用必须同步更新。

一致性检查发现冲突时，以本目录为准；不得在下游仓库通过“实现已经这样了”反向覆盖产品真相。

## 12. 相关文档

- 正式 MVP PRD：[`PRD.md`](./PRD.md)
- 早期技术草案：`../meeting-capture-mvp.md`

早期技术草案仅保留讨论与技术探索价值；与本目录正式真相冲突时，以 `PRD.md` 与本文件为准。
