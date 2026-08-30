# MOB-016：拾言插件入口与任务壳

状态：待实施

负责人：`mob_016_shiyan_plugin_shell`

执行仓库：`dangjingtao/uichat-mira-mobile`

目标基线：最新 `dev`

目标里程碑：Shiyan MVP

依赖：无代码依赖；必须遵守 `docs/shiyan/PRD.md` 与 `docs/shiyan/TECHNICAL_DESIGN.md`

## 背景

当前 Drawer 已有“插件”分类，但仍是占位入口。拾言已完成产品与技术基线，需要先建立独立功能域和稳定导航边界，不能把录音、任务、历史逻辑塞进 Chat / Remote Host 主链。

## 目标

建立拾言的 Mobile 功能壳，形成后续录音、处理结果与历史任务可挂载的独立导航结构。

## 范围

- 将 Drawer 的“插件”入口接成真实插件入口，并提供“拾言”官方插件入口；
- 新增拾言首页 / 场景选择入口；
- 内置首批场景：会议采集、临时口述需求、个人复盘 / 想法记录；
- 自定义场景 UI 只暴露：名称、整理要求、输出结构；本卡可只完成可用壳与本地模型，不接云端保存；
- 建立拾言历史任务页面壳，预留标题、场景、时间、阶段 / 状态、真实去向链接位置；
- 导航类型进入 `RootStackParamList` 或等价正式路由合同；
- 页面遵循现有 Theme / token，不创建第二套视觉系统。

## Hard Constraints

- 不修改 Chat / Workspace / Remote Host 主链语义；
- 不把拾言依赖 Desktop 在线状态；
- 不伪造云端任务、处理状态或 Destination 链接；
- 不在本卡引入录音依赖、STT、LLM、D1/R2 或 GitHub 写入；
- 不开放完整 Prompt 编辑。

## Execution Entry Points

- `App.tsx`
- `src/types/navigation.ts`
- `src/components/CustomDrawer.tsx`
- `src/theme/`
- 新建 `src/shiyan/` 功能域

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test -- --runInBand`
- 导航测试至少覆盖：Drawer -> 插件 -> 拾言 -> 场景选择 / 历史任务

## 验收

1. “插件”不再是纯占位，能进入拾言；
2. 拾言拥有独立功能域和路由，不侵入 Chat 主链；
3. 三个内置场景可选择；
4. 历史任务页有真实数据接口挂载位置，但无假数据冒充成功任务；
5. 自定义场景边界符合 PRD；
6. typecheck / lint / Jest 通过。

## 非目标

- 不录音；
- 不创建 CaptureTask；
- 不上传文件；
- 不实现处理结果与最终编辑；
- 不实现 Desktop 拾言界面。

## 并行边界

可与 MOB-017、MOB-018 并行。MOB-016 主要拥有导航、插件入口、场景与历史任务 UI 壳；不得修改原生录音配置和 Cloud 合同。