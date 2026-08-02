# UIChat Mira Mobile

Mira 官方移动端工程，基于 React Native 构建。

## 项目定位

移动端是用户随身连接 Mira Host 的入口，负责移动交互、设备能力和可靠连接。

当前处于基建阶段，首要目标是建立稳定、可维护、可验证的移动端骨架。

## 技术栈

- **React Native 0.86** - 跨平台移动端框架
- **TypeScript** - 类型安全开发
- **Kotlin / Swift** - Android / iOS 原生开发
- **Safe Area Context** - 安全区域适配

## 环境要求

- Node.js 22.x (>= 22.11.0)
- Android SDK 36+ / API 24+
- JDK 17+
- iOS 15.0+

## 快速开始

```sh
# 安装依赖
npm install

# 启动 Metro 打包器
npm start

# 运行 Android
npm run android

# 运行 iOS（首次需安装 Ruby 与 CocoaPods 依赖）
bundle install
cd ios && bundle exec pod install && cd ..
npm run ios

# 类型检查
npm run typecheck

# 运行测试
npm test

# 代码检查
npm run lint
```

## 项目结构

```text
src/
├── api/           # Mira Host API 适配层接口
│   └── miraHost.ts
├── types/         # 共享类型定义
│   └── index.ts
└── screens/       # 页面组件
    └── HomeScreen.tsx
```

## 分支流程

目标流程为：

```text
feature/* -> dev -> test -> prod
```

当前环境分支尚未完成共同基线初始化，该流程需由维护者初始化并宣布启用。过渡期规则详见 [AGENTS.md](./AGENTS.md)。

## Android 构建与签名

Debug 构建使用 Android 工具链维护在用户目录中的标准 debug keystore。仓库不会提交 `debug.keystore`，干净环境首次构建时由工具链创建或复用本机凭据。

Release 构建禁止回退到 debug 签名。构建 release 前，必须通过 `~/.gradle/gradle.properties` 或环境变量提供以下四项：

```properties
MIRA_RELEASE_STORE_FILE=/absolute/path/to/release.keystore
MIRA_RELEASE_STORE_PASSWORD=<store-password>
MIRA_RELEASE_KEY_ALIAS=<key-alias>
MIRA_RELEASE_KEY_PASSWORD=<key-password>
```

GitHub Actions 构建签名 release APK 时，还需要在仓库 Secrets 中配置：

```text
MIRA_RELEASE_KEYSTORE_BASE64
MIRA_RELEASE_STORE_PASSWORD
MIRA_RELEASE_KEY_ALIAS
MIRA_RELEASE_KEY_PASSWORD
```

`MIRA_RELEASE_KEYSTORE_BASE64` 是 release keystore 的单行 Base64 内容。`dev` 或 `prod` 分支推送，或在这两个分支手动运行
`Mobile CI` 时，工作流会构建签名 APK，验证内置 JavaScript bundle、SVG 原生库和 APK 签名，并上传
`uichat-mira-mobile-android-release` artifact。

任何一项缺失时，release 任务会明确失败。签名文件和真实密码不得提交到仓库。

生成本地 release keystore 的示例：

```sh
keytool -genkeypair -v -keystore release.keystore -alias <alias> -keyalg RSA -keysize 2048 -validity 10000
```

## iOS 免费真机侧载

独立工作流 `.github/workflows/ios-unsigned-device.yml` 会生成面向 `iphoneos` 的未签名开发 IPA。没有 Mac、没有付费 Apple Developer Program 的开发者，可以在 Windows 上使用自己的免费 Apple Account 通过 Sideloadly 临时签名并安装到 iPhone。

该方式仅用于开发测试，免费签名有效期为 7 天，不属于正式分发。unsigned device IPA 当前只作为 GitHub Actions Artifact 保留 14 天，不进入既有 `dev` Release 或 R2 发布目录。

完整准备、安装、续签和排错步骤见：

[docs/ios-free-sideload-windows.md](./docs/ios-free-sideload-windows.md)

## 持续集成

`.github/workflows/mobile-ci.yml` 在 Pull Request 和目标分支推送时执行：

- TypeScript 类型检查、ESLint 和 Jest。
- Android `assembleDebug` 干净环境构建。
- iOS CocoaPods 安装与无签名 Simulator Debug 构建。
- `dev` 推送通过全部检查及签名 Release 构建后，按 `package.json` 的版本更新 `v<version>-dev` 预发布，并同步到 Cloudflare R2 的 `mira/mobile/dev/latest/`。
- `prod` 推送通过发布检查后，按 `package.json` 的版本创建不可改指向的 `v<version>` 正式 Tag；同一版本不得发布不同提交。

`.github/workflows/ios-unsigned-device.yml` 单独负责 iPhone 真机构建：

- 使用 `iphoneos` / Release 构建且明确关闭代码签名。
- 校验应用包含 Release JavaScript bundle。
- 校验可执行文件包含 `arm64`。
- 将 `.app` 封装为标准 `Payload/*.app` IPA。
- 拒绝包含 provisioning profile 的产物。
- 上传 IPA 与 SHA-256 校验文件，保留 14 天。

当前 `dev` Release 产物包括 Android Debug APK、使用正式 keystore 签名的 Android Release APK、iOS Simulator ZIP 和 SHA-256 校验文件。Release APK 使用 `dev` 分支源码，仅用于开发验证；正式发布仍由 `prod` 分支执行。

## 说明

本项目处于早期阶段，协议细节将随 Mira Host 演进逐步明确。
