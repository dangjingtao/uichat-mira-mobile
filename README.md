# uiChat Mira Mobile

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

`MIRA_RELEASE_KEYSTORE_BASE64` 是 release keystore 的单行 Base64 内容。`prod` 分支推送或手动运行
`Mobile CI` 时，工作流会构建签名 APK，验证内置 JavaScript bundle、SVG 原生库和 APK 签名，并上传
`uichat-mira-mobile-android-release` artifact。

任何一项缺失时，release 任务会明确失败。签名文件和真实密码不得提交到仓库。

生成本地 release keystore 的示例：

```sh
keytool -genkeypair -v -keystore release.keystore -alias <alias> -keyalg RSA -keysize 2048 -validity 10000
```

## 持续集成

`.github/workflows/mobile-ci.yml` 在 Pull Request 和目标分支推送时执行：

- TypeScript 类型检查、ESLint 和 Jest。
- Android `assembleDebug` 干净环境构建。
- iOS CocoaPods 安装与无签名 Simulator Debug 构建。
- `dev` 推送通过全部检查后，更新 `dev-latest` 预发布，并同步到 Cloudflare R2 的 `mira/mobile/dev/latest/`。

当前 `dev` 产物包括可安装的 Android Debug APK、iOS Simulator ZIP 和 SHA-256 校验文件。它们是开发测试产物，不是正式签名发行包。

## 说明

本项目处于早期阶段，协议细节将随 Mira Host 演进逐步明确。
