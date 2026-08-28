# MOB-022：拾言 GitHub Destination

状态：待实施

负责人：`mob_022_shiyan_github_destination`

执行仓库：`dangjingtao/mira-shiyan-cloud` + `dangjingtao/mira-shiyan`

目标基线：MOB-020 合入后的 Cloud 内容合同

目标里程碑：Shiyan MVP

依赖：MOB-018、MOB-020；与 MOB-021 在 Final Draft 合同冻结后可并行

## 背景

GitHub 是拾言 MVP 第一优先 Destination。它只保存用户确认后的正式 Markdown 与 Git 历史，不承担 CaptureTask、Transcript 或 Draft 数据库职责。成功投递后，历史任务需要得到真实可打开的文档 URL 与 commit SHA。

## 目标

建立幂等、最小权限、可恢复的 GitHub Destination Adapter，把用户确认后的 Final Draft 投递到 `dangjingtao/mira-shiyan`，并把 canonical link / commit SHA 回写 Delivery Record。

## 范围

- 在 Cloud 建立 Destination Adapter 接口，GitHub 为首个实现；
- MVP 使用最小权限 Fine-grained PAT 或当前已确认的等价最小授权方式，Secret 不进入仓库；
- 默认目标仓库 `dangjingtao/mira-shiyan`；
- 文件路径 / frontmatter / slug 规则由本卡实现时保持简单、稳定、可预测，并在会影响产品合同前先更新 canonical truth；
- 只接受用户确认后的 Final Draft；
- 投递请求具备幂等键，网络重试不得无控制地重复创建多份文档；
- 成功后保存 repository、path、commit SHA、真实文件 URL、投递时间；
- 失败只标记 Delivery Stage / Record，不污染 Final Draft 与前序阶段；
- 支持对可重试 GitHub 网络 / 5xx / rate limit 错误重新投递；
- 权限不足、路径冲突等不可静默重试错误需返回明确错误类别；
- `mira-shiyan` README / 内容约定如需补充，只描述 Destination 内容约束，不建立第二套产品真相。

## Hard Constraints

- 不在 GitHub 保存 CaptureTask 业务状态；
- 不把 GitHub 当 Transcript / Draft 唯一存储；
- 不在 AI Draft 阶段自动投递；
- 不让每次重试生成新文档；
- 不把 PAT 返回 Mobile；
- 不在 `mira-shiyan` 独立定义拾言产品行为；
- 不做 Notion / 飞书 / 企业微信实现。

## Execution Entry Points

- Cloud Destination Adapter
- Delivery Record persistence
- `dangjingtao/mira-shiyan/README.md`
- 默认内容目录 / frontmatter 约定

## Validation

- Final Draft -> GitHub 成功写入；
- 成功返回真实 file URL + commit SHA；
- 同一幂等请求重复执行不产生重复文档；
- 网络超时 / 5xx / rate limit 可重试；
- 401 / 403 / 权限不足明确失败；
- 投递失败后 Final Draft 仍完整可用；
- `mira-shiyan` 未被用作 Task 数据库。

## 验收

1. 用户确认后的 Final Draft 可写入默认 GitHub Destination；
2. 成功结果包含真实 URL 与 commit SHA；
3. Delivery Record 可供 Mobile 历史任务展示 canonical link；
4. 重试幂等；
5. 失败只影响投递阶段；
6. Secret 不泄露到客户端、日志或仓库。

## 非目标

- 不做 GitHub App 多用户授权；
- 不做 Notion；
- 不做自动 PR / 自动修改已有正式文档；
- 不做 GitHub inbox 审核层。

## 并行边界

MOB-022 在 MOB-020 冻结 Final Draft / structured content 合同后可与 MOB-021 并行。它主要拥有 Cloud Destination Adapter、Delivery Record 与 `mira-shiyan` 内容落地约定；不得修改 Mobile 编辑状态机。