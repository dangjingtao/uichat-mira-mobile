# MOB-028B：R2 分支隔离更新客户端

状态：**待实施**

执行仓库：`dangjingtao/uichat-mira-mobile`

目标分支：`dev`

前置：`MOB-028A`

## 背景

MOB-028 当前客户端通过 GitHub Releases API 获取最新版本与 APK asset URL。最新产品决策已改为：Mira Mobile 的运行时更新链路必须走 Cloudflare R2；每个构建只比较自己分支 / channel 的版本，不跨 channel 扫描、选择或下载。

## 目标

将现有 About 页更新检查改为 R2 manifest 驱动，同时保留已完成的更新红点、确认下载、失败重试等交互。

## Channel 隔离合同

客户端必须使用 build-time channel truth，并映射到唯一 R2 manifest：

```text
predev -> https://assets.tomz.io/mira/mobile/predev/latest/latest.json
dev    -> https://assets.tomz.io/mira/mobile/dev/latest/latest.json
test   -> https://assets.tomz.io/mira/mobile/test/latest/latest.json
prod   -> https://assets.tomz.io/mira/mobile/prod/latest/latest.json
```

一个构建只能请求自己的 manifest。

禁止：

- dev 扫描 prod / test；
- prod 接受 dev prerelease；
- 通过 GitHub Releases 列表选择“最高版本”；
- 通过版本字符串猜 channel；
- 某个 channel 请求失败时自动 fallback 到另一个 channel。

## 更新判断

客户端读取 `latest.json` 后：

1. 校验 `channel` 必须与当前构建 channel 一致；
2. 解析 `version` 为基础 semantic version；
3. 只与当前安装包的基础版本比较；
4. 远端版本更高才显示可更新状态；
5. 相同或更低版本不提示更新；
6. manifest 非法、channel 不匹配或网络失败都属于可重试错误，不能伪装成“已是最新”。

展示版本使用 manifest / build truth 定义的 `displayVersion`，例如 `0.1.3-dev`。

## Android 下载合同

用户确认更新后，从**当前 manifest 对应的同 channel R2 路径**下载 signed Release APK。

推荐将 manifest 的 `apk` 视为当前 `latest/` 目录下的受控相对文件名；客户端不得接受跨域、跨 channel 或任意外部下载 URL。

MVP 继续交给系统 / 浏览器下载：

- 不申请 `REQUEST_INSTALL_PACKAGES`；
- 不静默安装；
- 不绕过 Android 安装确认；
- 不下载 debug APK。

## iOS

保持当前诚实合同：若没有可直接安装的已签名分发产物，只显示更新信息 / 分发说明，不伪装成一键安装。

## GitHub Releases

MOB-028 的客户端运行时链路必须移除对 GitHub Releases API 的依赖。

GitHub Release / Tag 可以继续由 CI 生成，作为：

- 归档；
- 版本追溯；
- 人工查看。

但 About 页版本检查、最新版本判断和 Android APK 下载不得依赖 GitHub Releases API / asset URL。

## Scope

- 重构 `src/update/appUpdate.ts` 或等价 update service，改为解析 R2 `latest.json`。
- 移除客户端 GitHub Releases 列表扫描与 asset URL 选择逻辑。
- 复用 MOB-028 现有 About UI 与交互，不重复重做页面。
- channel mapping 只消费 MOB-028A 的 build truth。
- 保留 semantic version compare helper。

## Hard Constraints

- R2-only runtime update path。
- 一个构建只读一个 channel。
- manifest channel 不匹配必须拒绝。
- 不 fallback 到其他 channel。
- 不允许 manifest 把客户端下载导向任意第三方地址。
- 不降低已有网络失败、取消下载、缺产物等错误处理质量。

## Validation

自动化至少覆盖：

1. dev 只请求 dev manifest；
2. test / predev / prod 分别只请求自身 manifest；
3. manifest channel mismatch 被拒绝；
4. `0.2.9` vs `0.2.10` 比较正确；
5. 当前版本 = 最新版本；
6. 当前版本高于远端版本；
7. 网络失败不返回“已是最新”；
8. manifest 非法 / 缺 APK 字段时不触发下载；
9. APK 下载地址只能落在当前 channel 的 R2 `latest/` 路径；
10. GitHub Releases API 不再出现在客户端更新请求路径中。

执行：

```text
npm run typecheck
npm run lint
npm test -- --runInBand
```

Android smoke：

- 当前 channel 无更新无红点；
- 当前 channel 有更高版本出现红点；
- 点击后先确认；
- 取消不下载；
- 确认后打开当前 channel 的 R2 signed APK；
- R2 manifest 请求失败可重试；
- 其他 channel 即使版本更高也不会触发更新。

## Handoff

施工前先确认 MOB-028A 的 manifest schema 与 R2 prefix 已落地。若 A 的 schema 尚未稳定，不得在 B 中私自建立兼容层或第二套 manifest。
