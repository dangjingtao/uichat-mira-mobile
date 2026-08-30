# MOB-018：拾言 Cloud 基础与 CaptureTask / 上传闭环

状态：待实施

负责人：`mob_018_shiyan_cloud_foundation`

执行仓库：`dangjingtao/mira-shiyan-cloud`

当前目标基线：仓库现有 `main`

目标里程碑：Shiyan MVP

依赖：Mobile canonical truth：`uichat-mira-mobile/dev/docs/shiyan/`

## 背景

`mira-shiyan-cloud` 当前只定义了仓库边界，尚未有正式云端实现。技术基线要求一个 Cloud repo 内保持两个 Worker：公开 `shiyan-api` 与私有 `shiyan-llm`；D1 保存任务事实，R2 保存音频 / 原始资产，异步处理使用 Workflow。

## 目标

建立可部署、可测试、可观察的 Cloudflare 最小骨架，并跑通“设备身份 -> 创建 CaptureTask -> 获取上传授权 -> 音频直传对象存储 -> 服务端确认资产”的闭环。

## 范围

- 建立 TypeScript Cloudflare 工程与最小脚手架；
- `shiyan-api` 为唯一公开业务 Worker；
- `shiyan-llm` 建立私有 Worker 壳并通过 Service Binding 暴露最小内部调用合同，本卡不接真实 LLM Provider；
- 配置 D1、R2、Workflow bindings；
- 建立最小服务端事实模型：device / CaptureTask / Stage / AudioAsset；具体表名与字段可按实现调整，但必须满足 canonical 状态语义；
- MVP 使用设备身份，数据模型预留可空 `userId`；
- 创建 CaptureTask 时记录标题、场景、设备、任务生命周期与初始阶段；
- 生成短时、最小权限上传授权，使 Mobile 直接把录音写入 R2，不由业务 Worker 代理大型音频 body；
- 上传完成后能确认对象存在、大小 / 类型等必要 metadata，并把上传阶段标为成功；
- 设计幂等键 / request identity，避免弱网重试重复创建同一任务或重复确认同一资产；
- 建立统一错误 envelope 与 request / task correlation id；日志不得记录 credential、Provider Key 或完整音频内容。

## Hard Constraints

- 不把 GitHub / Notion 当数据库；
- 不把 `deviceId` 固化为最终账户主键；
- 不把任一 Stage 错误映射为整个 Task `failed`；
- 不让 `shiyan-llm` 解释 CaptureTask 业务状态；
- 不新增 Queue、Durable Object、Redis 或独立第三个服务；
- 不通过 Worker 中转 40 分钟录音文件；
- 不在仓库提交真实 Secret。

## Execution Entry Points

本仓库当前实现为空，Builder 应先读取：

- `README.md`
- Mobile canonical `docs/shiyan/PRD.md`
- Mobile canonical `docs/shiyan/TECHNICAL_DESIGN.md`

随后建立最小 `src/`、配置、migration 与测试结构；不得先生成与 MVP 无关的大型平台脚手架。

## Validation

- 本地 / 测试环境 typecheck 与单元测试；
- D1 migration 可重复执行；
- API contract test：创任务、重复请求幂等、上传授权、确认对象；
- 设备鉴权失败 / 过期上传授权 / 不存在对象 / 重复确认等失败路径；
- 验证大型音频数据路径不经过 `shiyan-api` Worker body。

## 验收

1. `shiyan-api`、`shiyan-llm`、D1、R2、Workflow bindings 均有最小可部署配置；
2. 设备可以创建 CaptureTask；
3. Mobile 可获得短时上传授权并直接写 R2；
4. 上传确认后 Stage 事实正确落 D1；
5. 重试不会无控制地产生重复任务 / 资产；
6. 错误与日志可定位且不泄露秘密；
7. 未实现 STT / LLM 时状态仍真实，不伪造处理完成。

## 非目标

- 不做 STT；
- 不做 AI 整理；
- 不做 GitHub Destination；
- 不做 Desktop UI；
- 不做多租户计费平台。

## 并行边界

可与 MOB-016、MOB-017 并行。MOB-018 独占首版 Cloud schema / CaptureTask / Stage / upload contract 的建立；MOB-019、MOB-020 不应在本卡合同尚未合入前并行修改同一 schema / Workflow 主状态机。