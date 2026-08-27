# MOB-009：简化桌面配对页与 Mira 链接兜底

状态：待实施

分支：`dev`

范围：Mira Mobile

Desktop / Host 依赖：无新增依赖

## 目标

把“连接桌面端”页面收回到用户真正需要理解的配对流程：

```text
扫码配对
  ↓
桌面授权
  ↓
连接完成
```

Direct / Relay 是连接传输细节，不再作为主流程配置项暴露给用户。

## 当前问题

当前 `HostConfigScreen.tsx` 仍在主页面直接展示：

- `Tailscale Direct`
- `Mira Host 地址`
- 手工 Host URL 输入框
- Direct 连通状态卡
- `重新检查 Direct`
- 面向用户解释 Direct / Relay 传输选择的主文案

这使设备配对页看起来像网络诊断/工程配置页面，也让用户误以为需要理解或手工选择传输方式。

## 产品决定

### 主入口

保留“扫码配对”作为第一主操作。

扫码结果继续使用现有 Mira 配对协议，不新增第二套配对逻辑。

### 扫码失败兜底

在扫码按钮下方增加一个轻量输入区：

- 文案建议：`无法扫码？粘贴配对链接`
- 输入仅用于粘贴 Mira 配对 URI，例如：`mira://pair?...`
- 提供明确的“配对”/“继续”操作按钮
- 输入内容必须复用现有 `parsePairingUriV1()` / `loadPairingUri()` 解析和状态流
- 无效 URI 显示明确的行内错误，不进入 Host URL 探测逻辑

扫码与手工粘贴必须最终进入同一套 `PairingDescriptorV1`、申请授权、等待 Desktop 批准和凭证领取流程。

## 必须移除的主流程 UI

从“连接桌面端”主页面删除：

- 整个 `Tailscale Direct` 卡片
- `Mira Host 地址` 标签
- 手工 Host URL 输入
- Direct 状态框
- `重新检查 Direct`
- 要求用户理解/选择 Tailscale Direct 与 Mira Relay 的产品文案

如果底层 Direct / Relay 能力仍被配对流程使用，可以保留在 transport / connectivity 层；本任务不要求删除底层实现。

## 页面信息层级

建议主页面仅保留：

1. 页面标题：连接桌面端
2. 设备配对说明
3. 扫码配对主按钮
4. `无法扫码？粘贴配对链接` 兜底输入
5. 当前配对请求 / 错误状态
6. Mira 授权状态（等待桌面批准、已批准、拒绝、过期、失败等）

不要再新增独立的 Direct / Relay 选择器或 Host 地址配置区。

## 状态与错误要求

- 未载入配对请求：提示用户从 Mira Desktop 生成二维码或复制配对链接。
- 有效 Mira URI：进入与扫码相同的配对状态。
- 无效/残缺 Mira URI：显示协议解析错误，不发起错误网络请求。
- Desktop 待批准：明确显示等待授权。
- Desktop 拒绝 / 请求过期 / 安全存储不可用：继续沿用真实状态，不生成假成功。
- 配对完成后：保持当前成功进入会话列表的行为。

## 实现边界

- 优先复用现有 `parsePairingUriV1()`、`loadPairingUri()`、`useRemotePairing()`。
- 不新增第二套手工配对协议。
- 不允许把任意 HTTP(S) URL 当作配对输入。
- 不把 Relay endpoint、Direct Host URL、Tailnet 地址作为用户配置项重新暴露。
- 不修改 Mira Desktop / Host。
- 不修改 Remote Pairing V1 协议字段。
- 不删除底层 Tailscale Direct / Mira Relay transport，仅调整产品层 UI 与入口。

## 验收

### UI

- 页面主流程中看不到 `Tailscale Direct` 卡片。
- 页面主流程中看不到 `Mira Host 地址`、Host URL 输入和 `重新检查 Direct`。
- 扫码按钮下方存在 Mira 配对链接兜底输入。
- 页面不要求用户选择 Direct / Relay。

### 功能

- 扫码得到的 Mira URI 能正常载入并进入授权流程。
- 粘贴同一 Mira URI 能得到与扫码完全一致的解析结果和后续行为。
- Relay-only、Direct-only 或同时包含两者的合法配对 URI 都由现有协议/transport 自行处理，UI 不需要用户做传输选择。
- 非 `mira://pair` 或缺少必要字段的输入不会开始配对，并显示真实错误。

### 回归

完成后至少通过：

- `npm run typecheck`
- `npm run lint`
- `npm test -- --runInBand`
- Android 构建
- iOS 构建

并在真机上验证：扫码、粘贴链接、等待批准、拒绝/过期、完成配对五条路径。

## 非目标

- 不重做 Remote Pairing V1。
- 不调整 Desktop 二维码生成逻辑。
- 不设计网络诊断中心。
- 不删除 Direct / Relay 底层能力。
- 不顺手改其它设置页或会话页。
