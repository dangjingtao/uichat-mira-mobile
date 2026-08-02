# iOS 免费真机侧载（Windows）

本文说明如何在**没有 Mac、没有付费 Apple Developer Program** 的情况下，将 Mira Mobile 的 iOS 开发构建安装到真实 iPhone。

这是一条开发测试路径，不是正式分发方案。GitHub Actions 只负责生成未签名的真机 IPA，安装者需要在 Windows 上使用自己的免费 Apple Account 完成临时签名。

## 适用范围

适合：

- 开发者主要在 Windows 上编写 React Native / TypeScript 代码。
- 需要在自己的 iPhone 上验证 Mira Mobile。
- 可以接受免费签名每 7 天刷新一次。
- 不需要 App Store、TestFlight、企业分发或公开下载。

不适合：

- 面向普通用户稳定分发。
- 无人值守长期运行。
- 依赖付费账号能力、特殊 entitlement 或正式推送证书的功能验证。

## 构建产物

独立工作流 `.github/workflows/ios-unsigned-device.yml` 会生成：

```text
Workflow: iOS Unsigned Device Build
Artifact: uichat-mira-mobile-ios-unsigned-device
File:     uichat-mira-mobile-ios-unsigned-device.ipa
Checksum: uichat-mira-mobile-ios-unsigned-device.ipa.sha256
```

该 IPA：

- 面向 `iphoneos` 真机架构构建。
- 包含 Release JavaScript bundle。
- 不包含 Apple 签名和 provisioning profile。
- 不能直接点开安装。
- 需要由 Sideloadly 等工具使用安装者自己的 Apple Account 重新签名。

工作流在相关功能分支、`dev`、`test` 推送，以及面向 `dev`、`test`、`prod` 的 Pull Request 上运行；也可手动触发。产物保留 14 天。

该 IPA 当前是**独立的 GitHub Actions Artifact**，不会自动进入现有 `dev` Release 或 Cloudflare R2，避免干扰 Android 正式签名与既有发布链。

## Windows 端准备

需要：

1. Windows 10 或 Windows 11。
2. 一台可正常解锁并连接电脑的 iPhone。
3. 数据线；首次配对建议使用有线连接。
4. 一个 Apple Account。建议为开发侧载单独准备账号，不要与不受信任的人共享账号或验证码。
5. Sideloadly：<https://sideloadly.io/>
6. Apple 官网提供的桌面版 iTunes 和 iCloud。

Sideloadly 官方说明，在 Windows 上应优先使用 Apple 官网下载的 iTunes / iCloud，而不是 Microsoft Store 版本；若设备无法识别，应先检查这一点。

## 首次安装

### 1. 下载 IPA

进入仓库的 Actions 页面，打开对应的 `iOS Unsigned Device Build` Run，在 Artifacts 区域下载：

```text
uichat-mira-mobile-ios-unsigned-device
```

解压 Artifact ZIP，得到：

```text
uichat-mira-mobile-ios-unsigned-device.ipa
uichat-mira-mobile-ios-unsigned-device.ipa.sha256
```

不要再次解压 IPA。

### 2. 连接并信任 iPhone

1. 使用数据线连接 iPhone。
2. 解锁 iPhone。
3. 出现“要信任此电脑吗”时选择信任，并输入设备密码。
4. 打开 iTunes，确认设备能够被识别。

### 3. 使用 Sideloadly 签名并安装

1. 启动 Sideloadly。
2. 在设备下拉框中选择目标 iPhone。
3. 将 `uichat-mira-mobile-ios-unsigned-device.ipa` 拖入窗口。
4. 输入用于侧载的 Apple Account。
5. 保持默认签名方式，点击 Start。
6. 根据提示完成两步验证。

Sideloadly 会为当前账号和设备申请临时签名，并将 Mira Mobile 安装到 iPhone。

### 4. 在 iPhone 上信任开发者

若首次启动提示“未受信任的开发者”：

```text
设置 → 通用 → VPN 与设备管理
```

找到本次侧载使用的 Apple Account，选择信任。

### 5. 开启开发者模式

iOS 16 及以上通常还需要：

```text
设置 → 隐私与安全性 → 开发者模式
```

开启后按系统提示重启并确认，然后重新打开 Mira Mobile。

## 更新开发构建

下载新的 IPA 后，继续使用：

- 同一个 Apple Account
- 同一台 iPhone
- 相同的 Bundle ID

再次通过 Sideloadly 安装即可覆盖旧版本。不要先删除旧 App，否则本地数据可能丢失。

若 Sideloadly 自动改写 Bundle ID，应在后续更新时保持相同设置；Bundle ID 改变后，iOS 会将其视为另一个 App。

## 7 天刷新

免费 Personal Team 的 provisioning profile 自签发起 7 天后过期。过期后 App 将无法启动，需要重新签名安装。

Sideloadly 支持自动刷新：

1. 首次使用 USB 完成安装。
2. 在 iTunes 中启用“通过 Wi-Fi 与此 iPhone 同步”。
3. 在 Sideloadly 中启用自动刷新。
4. 保持 Sideloadly Daemon 运行。
5. 电脑和 iPhone 位于同一局域网，或定期使用 USB 连接。

自动刷新仍依赖电脑能够发现设备，不应把它当成完全无人值守的正式分发机制。

## 免费账号限制

Apple 当前对 Personal Team 的主要限制包括：

- 最多 10 个 App ID，7 天后到期。
- 最多 3 台设备，7 天后到期。
- 每台设备最多安装 3 个使用免费开发配置签名的 App。
- provisioning profile 有效期为 7 天。

参考：<https://developer.apple.com/help/account/basics/about-your-developer-account>

## 常见问题

### Sideloadly 看不到设备

依次检查：

1. iPhone 已解锁并信任电脑。
2. iTunes 能识别设备。
3. 已安装 Apple 官网版本的 iTunes 和 iCloud。
4. 更换 USB 线或 USB 接口。
5. 重启 iPhone、Windows 和 Sideloadly。

### 提示 Developer Mode Required

在 iPhone 上开启：

```text
设置 → 隐私与安全性 → 开发者模式
```

### 提示 Untrusted Developer

进入：

```text
设置 → 通用 → VPN 与设备管理
```

信任用于签名的 Apple Account。

### 提示 IncorrectArchitecture

确认下载的是：

```text
uichat-mira-mobile-ios-unsigned-device.ipa
```

不要使用 `uichat-mira-mobile-ios-simulator.zip`。工作流会在上传前校验真机可执行文件包含 `arm64`。

### 安装新版本后出现两个 Mira

通常是 Bundle ID 被改写或更换了 Apple Account。继续开发时应固定 Apple Account，并避免随意修改 Bundle ID。

## 安全边界

- 该流程依赖第三方侧载工具，不属于 Apple 官方分发渠道。
- GitHub Actions 不接触 Apple Account、密码或两步验证码。
- Apple Account 只应由实际安装者在自己的 Windows 机器上输入。
- 仓库不得保存 Apple Account、密码、验证码、临时证书或 provisioning profile。
- 不要把已由个人账号签名的 IPA 再分发给其他人；免费签名与账号和设备绑定。

## 后续升级路径

当免费侧载的 7 天限制影响开发效率时，再升级为：

```text
Apple Developer Program
→ GitHub Actions 正式签名
→ TestFlight 或 Ad Hoc 分发
```

在此之前，unsigned device IPA + Windows 侧载足以支持少量开发设备进行真机验证。
