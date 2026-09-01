# MOB-028A：R2 分支发行真相与 Manifest

状态：**待实施**

执行仓库：`dangjingtao/uichat-mira-mobile`

目标分支：`dev`

## 背景

MOB-028 当前已经实现关于页更新检查，但运行时更新源仍依赖 GitHub Releases，并且现有 build-time channel truth 只区分 `dev` / `prod`；非 `prod` 构建可能被归入 `dev`。这与当前产品决策不一致。

最新决策：Mira Mobile 的更新链路必须以 Cloudflare R2 为客户端发行真相；不同分支 / 发行通道完全隔离，每个分支版本只与自己分支的最新版本比较。

## 产品 / 发布合同

版本身份由“基础语义版本 + 构建分支 / 发行通道”共同决定。

示例：

```text
基础版本：0.1.3
predev -> 0.1.3-predev
dev    -> 0.1.3-dev
test   -> 0.1.3-test
prod   -> 0.1.3
```

`prod` 保持标准稳定语义版本，不强制追加 `-prod`；非 prod 构建在展示与发行 metadata 中必须能明确识别其通道。

不得通过版本字符串反推 channel。channel 必须由 CI / build-time truth 明确注入。

## R2 目录合同

四条发行线独立：

```text
mira/mobile/predev/latest/
mira/mobile/dev/latest/
mira/mobile/test/latest/
mira/mobile/prod/latest/
```

每个目录至少包含：

```text
latest.json
uichat-mira-mobile-release.apk
uichat-mira-mobile-release.apk.sha256
```

已有其他产物可继续保留，但 MOB-028 客户端更新只依赖当前平台所需产物与 `latest.json`。

## latest.json 最小合同

至少包含：

```json
{
  "version": "0.1.3",
  "channel": "dev",
  "displayVersion": "0.1.3-dev",
  "apk": "uichat-mira-mobile-release.apk",
  "sha256": "<sha256>"
}
```

可选字段可以包括 `notes`、`commit`、`publishedAt`，但不得让客户端依赖 GitHub Release 才能完成版本判断或下载。

## 发布原子性

`latest.json` 是该 channel 的最终客户端发行指针，必须最后更新。

发布顺序：

1. 构建并签名 APK；
2. 校验 APK 与 SHA-256；
3. 上传 APK / checksum 到对应 R2 channel；
4. 对远端对象做必要存在性 / 大小校验；
5. **最后上传 / 覆盖 `latest.json`**。

若 APK 上传或校验失败，不得更新 `latest.json`。

## Scope

- 修正 CI / build-time channel truth，至少明确支持 `predev`、`dev`、`test`、`prod`。
- 不允许“非 prod = dev”的兜底语义继续存在于可发布构建。
- 为各发行分支生成正确的 display version。
- 为各 R2 channel 生成并发布 `latest.json`。
- 复用现有 R2 Secrets 与 `assets.tomz.io` 发布基础设施，不新建 Worker、数据库或第三方更新服务。
- GitHub Release / Tag 可继续保留作为归档、追溯和人工查看能力，但不再是 MOB-028 客户端运行时更新真相。

## Hard Constraints

- 分支 / channel 绝不串线。
- `dev` metadata 不得写入 `test` / `prod` 目录，反之亦然。
- 不用 R2 文件存在与否猜版本号；版本来自本次构建的明确版本真相。
- `latest.json` 不得先于对应 APK 成功发布。
- 不泄露或提交 R2 / signing Secrets。
- 不改变既有签名与 Android 安装权限合同。

## Validation

至少覆盖：

1. `predev/dev/test/prod` channel resolution 正确；
2. display version 生成正确；
3. prod 保持稳定版本语义；
4. R2 prefix 由 channel 唯一确定；
5. manifest 内容与当前构建版本 / channel 一致；
6. APK / checksum 失败时不会发布 `latest.json`；
7. `latest.json` 发布动作位于对应产物远端校验之后。

执行现有质量检查：

```text
npm run typecheck
npm run lint
npm test -- --runInBand
```

并对修改后的 GitHub Actions 做语法 / 路径检查。

## Handoff

本卡先于 MOB-028B。MOB-028B 必须消费本卡确定的 R2 manifest 合同，不得自行发明第二套 channel / version 规则。
