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

- Node.js >= 22.11.0
- Android SDK 36+ / API 24+
- iOS 15.0+
- JDK 25+

## 快速开始

```sh
# 安装依赖
npm install

# 启动 Metro 打包器
npm start

# 运行 Android
npm run android

# 运行 iOS（首次需在 ios/ 下执行 pod install）
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios

# 类型检查
npm run typecheck

# 运行测试
npm test

# 代码检查
npm run lint
```

## 项目结构

```
src/
├── api/           # Mira Host API 适配层接口
│   └── miraHost.ts
├── types/         # 共享类型定义
│   └── index.ts
└── screens/       # 页面组件
    └── HomeScreen.tsx
```

## 分支流程

```
feature/* -> dev -> test -> prod
```

详见 [AGENT.md](./AGENT.md)。

## 构建与签名

Release 构建需要生成专用签名密钥，禁止使用 debug 密钥打包生产版本。

```sh
# 生成签名密钥
keytool -genkey -v -keystore release.keystore -storepass <password> -alias <alias> -keyalg RSA -keysize 2048 -validity 10000
```

## 说明

本项目处于早期阶段，协议细节将随 Mira Host 演进逐步明确。
