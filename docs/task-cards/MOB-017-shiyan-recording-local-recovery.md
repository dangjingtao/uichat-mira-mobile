# MOB-017：拾言录音与本地恢复

状态：有条件通过（放行后续；PR #56）

负责人：`mob_017_shiyan_recording_local_recovery`

执行仓库：`dangjingtao/uichat-mira-mobile`

目标基线：最新 `dev`

目标里程碑：Shiyan MVP

依赖：无 Cloud 依赖；与 MOB-016 仅共享拾言功能域边界

## 背景

拾言采用 local-first：录音先可靠落在手机本地，用户结束后确认标题 / 场景，再创建云端任务。当前工程没有录音依赖，iOS 只配置 Camera 权限，需要新增麦克风能力并通过真实长录音验证。

## 目标

建立可替换的 `RecordingAdapter` 与本地恢复机制，保证弱网、后台切换或上传尚未开始时不会丢失已完成录音。

## 范围

- 在 `src/shiyan/` 内定义 `RecordingAdapter`，页面不得直接绑定第三方录音库 API；
- 选择并接入一套维护可接受的 React Native 录音实现；技术设计中的 `react-native-nitro-sound` 仅为首选候选，若真实工程验证不通过必须报告而非硬上；
- iOS 新增 Microphone 权限；Android 新增 `RECORD_AUDIO` 及必要运行时权限；
- 支持开始、暂停 / 恢复（若库稳定支持）、结束、取消；
- 录音文件先保存在 App 私有目录；
- 建立本地 capture metadata：本地录音 ID、文件路径、开始 / 结束时间、时长、文件大小、当前本地状态；
- App 异常退出 / 重启后可以识别“已结束但尚未提交”的本地录音；
- 结束后进入“确认标题 / 场景”交互合同，但不在本卡创建云端 CaptureTask；
- 提供删除本地草稿能力，删除前需明确确认。

## Hard Constraints

- 录音时不边录边上传；
- 不要求 Desktop / Host 在线；
- 不把录音内容写入普通日志；
- 不在安全存储中保存大型音频；
- 不把 `localKeyValueStore` 当作音频文件存储；
- 不静默修改锁文件或原生配置：引入依赖与权限变化必须在 PR 中明确列出；
- 第三方库必须有 iOS / Android release build 与长录音 smoke evidence，不能只凭文档声称可用。

## Execution Entry Points

- `package.json`
- `ios/Podfile`
- iOS Info.plist / 权限配置
- Android Manifest / 权限配置
- `src/storage/`
- 新建 `src/shiyan/recording/`

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test -- --runInBand`
- Android release 或等价可发布构建
- iOS release / unsigned device build 或等价真实原生构建
- 真机短录音：开始 -> 结束 -> 重启 App -> 仍能恢复本地草稿
- 真机长录音 smoke：约 40 分钟，不崩溃、不产生 0 字节文件、结束后文件可读

## 有条件通过记录

2026-08-29：PR #56 的代码施工与自动化 Gate 已达到后续施工放行条件。

- `RecordingAdapter`、Android `MediaRecorder`、iOS `AVAudioRecorder`、两端麦克风权限、本地私有目录落盘与重启恢复均已实现；
- iOS Objective-C++ 编译问题已修复；
- Mobile CI #623 全绿：typecheck / lint / Jest、Android debug、iOS simulator、iOS unsigned device build 全部通过；
- OpenCode Review 的 `spawnSync opencode E2BIG` 为评审基建参数长度问题，不是本卡代码 finding，不作为 MOB-017 失败判据；
- 真机短录音重启恢复与约 40 分钟长录音仍属于最终人工验收 Gate，继续挂账，不伪造证据；
- 上述人工尾项不改变已冻结的录音边界、metadata、本地恢复或 Cloud 边界，因此 MOB-017 判定为**有条件通过（放行后续）**。

## 验收

1. 两端麦克风权限按需申请且拒绝时有明确提示；
2. 完成录音后即使无网也能保留本地文件；
3. App 重启后能发现尚未提交的已完成录音；
4. 结束录音后进入标题 / 场景确认，而不是直接上传；
5. 40 分钟长录音 smoke 有真实证据；
6. 页面与第三方录音库通过 `RecordingAdapter` 隔离。

## 非目标

- 不上传 R2；
- 不创建 CaptureTask；
- 不做实时字幕；
- 不做边录边转写；
- 不做说话人区分。

## 并行边界

可与 MOB-016、MOB-018 并行。MOB-017 主要拥有录音 Adapter、本地文件恢复与原生麦克风配置；若 MOB-016 同期新增拾言页面，只通过已约定的功能域接口集成，不重写其导航。