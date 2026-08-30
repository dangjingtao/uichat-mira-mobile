# 拾言 GitHub Destination 合同

状态：MOB-022 下游内容合同基线

日期：2026-08-29

真相源：`uichat-mira-mobile/dev/docs/shiyan/`

本文件只冻结 GitHub Destination 的下游内容与投递语义，不替代 `PRD.md`、`TECHNICAL_DESIGN.md`，也不提前定义 MOB-020 尚未落地的 Final Draft 存储表结构或公网保存接口。

## 1. 目标仓库

MVP 默认 Destination：

```text
dangjingtao/mira-shiyan
```

GitHub 仓库只保存用户确认后的正式 Markdown 与 Git 历史，不保存 CaptureTask、Transcript、AI Draft 或 Final Draft 的业务状态。

## 2. 文件路径

MVP 使用稳定、可推导、与标题无关的路径：

```text
entries/YYYY/MM/<captureTaskId>.md
```

其中：

- `YYYY/MM` 取 Final Draft `confirmedAt` 的 UTC 年月；
- 文件名固定使用 CaptureTask UUID；
- MVP 不把标题 slug 放进文件名，避免用户改标题导致重试生成第二篇文档；
- 同一 CaptureTask 的目标路径必须稳定。

## 3. Frontmatter

正式 Markdown 最小 Frontmatter：

```yaml
---
title: "..."
shiyan_task_id: "..."
shiyan_final_draft_id: "..."
published_at: "2026-08-29T03:00:00.000Z"
---
```

约束：

- `title` 来自用户确认时的正式标题；
- `shiyan_task_id` 只用于内容追溯，不代表 GitHub 拥有 Task 状态；
- `shiyan_final_draft_id` 指向 Cloud 中已经确认的 Final Draft；
- `published_at` 使用 Final Draft 的确认时间；
- Frontmatter 后正文为该 Final Draft 的 Markdown；
- 不附带完整 Transcript、Provider 原始响应、Secret 或内部错误信息。

## 4. 幂等与冲突

GitHub 投递必须使用独立幂等键，并在 Cloud `delivery_records` 中记录。

规则：

1. 同一 Task + Destination + idempotency key 只能绑定同一个 Final Draft 内容；
2. 已成功的同一幂等请求直接返回已保存的 canonical URL 与 commit SHA；
3. GitHub 已存在目标文件且内容与当前投递完全一致时，视为不确定网络结果后的恢复，不创建第二份文档；
4. 目标路径已存在但内容不同，返回不可静默重试的 `path_conflict`；
5. MVP 不自动覆盖已经存在的不同正式内容，也不通过随机后缀生成第二份文档；
6. 网络超时、GitHub 5xx、明确 rate limit 可以重试；
7. 401、普通 403 权限不足、不同内容路径冲突属于明确失败。

## 5. Delivery Record

成功记录至少保存：

- task id
- final draft id
- destination
- idempotency key
- repository
- path
- commit SHA
- canonical file URL
- delivered at

失败记录至少保存：

- stage / record status
- retryable
- retry count
- normalized error code / message

Delivery 失败不得删除或覆盖 Final Draft，也不得把整个 CaptureTask 粗暴改成通用 `failed`。

## 6. Secret 与权限

MVP GitHub credential：

- 使用 Fine-grained PAT 或等价最小授权；
- 只允许目标仓库所需的 Contents write 权限；
- Secret 只存在 Cloud Secret / 等价安全配置；
- PAT 不返回 Mobile，不进入仓库，不进入普通日志；
- Mobile 只得到 Delivery Record 中可展示的 canonical URL / commit SHA 等结果。

## 7. 与 MOB-020 / MOB-021 的边界

- MOB-020 负责冻结 Cloud 侧 AI Draft / Final Draft 上游内容合同；
- MOB-021 负责用户最终编辑、触发投递与历史 UI；
- MOB-022 只消费一个“已确认 Final Draft 快照”，不自行创建、改写或确认 Final Draft；
- 在 MOB-020 的服务端 Final Draft 合同未落地前，MOB-022 不开放一个让客户端直接提交任意 Markdown 到 GitHub 的替代接口；
- MOB-020 合入后，只允许做适配接线，不应重写本文件已经冻结的 GitHub 路径、Frontmatter、幂等与 Secret 边界，除非先修改本 canonical truth。
