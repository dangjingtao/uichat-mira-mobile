# MOB-013：会话媒体与附件读取

状态：待实施

负责人：`mob_013_media_attachment_reading`

工作分支：`dev`

目标版本：`0.2.1`

范围：Mira Mobile；消费现有 Remote Message Parts 与 `artifacts:read`

Desktop / Host 依赖：现有 Message `image/file` parts、线程媒体读取路由与 `artifacts:read` scope；不新增上传合同

## 背景

Remote Host V1 协议已经能解析 `image` / `file` message parts，并提供线程媒体读取能力；当前 Mobile Adapter / Chat 主要把 Remote Message 压成纯文本，导致桌面端已有图片与附件在手机上无法发挥现有读取能力。

## 目标

在不新增上传能力的前提下，让 Mobile 对已有会话中的图片和附件做到“看得见、能识别、条件满足时能打开/读取”，并保留 Host 权限与 transport 的真实边界。

## 实现要求

- 保留 Remote Message 的 `parts` 语义，不再只保留 `content`；
- 文本继续使用现有 Chat 渲染，不因附件接入破坏 Markdown / streaming；
- `image` part 可显示时提供内联预览；
- `file` part 至少展示文件名、MIME/类型与可用操作；
- 有 `fileId` / media id 且 Host manifest + scope 允许时，复用现有线程媒体读取能力；
- 当前 `getThreadMediaRequest()` 需要 Direct endpoint 时，Relay-only 场景必须明确不可读取，不能伪造成功或泄漏 Device Credential；
- 不把 Bearer credential 拼进可长期暴露的 UI 文案、日志或外部 URL；
- 无法识别的 part 保持安全降级，不让整条消息崩溃；
- system/tool/data parts 的既有语义不得被图片/文件渲染误当成普通用户附件。

## 并行边界

MOB-013 主要拥有 Message -> Chat 展示层。若需要修改 `ChatScreen.tsx`，优先下沉到独立 `MessageContent` / media 组件；MOB-012 未合入前不得与其并发改同一段 Chat 状态机。

MOB-014 应在 MOB-012 稳定后与本卡协调 Chat 入口；MOB-015 可独立并行。

## 测试要求

- Remote Message text + image 混合 parts 不丢文本；
- image part 正常渲染与失败降级；
- file part 展示权威 filename / mimeType；
- artifacts scope 不足时不显示假可用操作；
- Direct media endpoint 可用时请求路径与 Authorization 正确；
- Relay-only / endpoint unavailable 有真实错误态；
- 未知 part 不崩溃；
- 纯文本历史消息与 streaming 回归通过。

## 验收

1. Desktop 线程中已有图片，手机打开同一线程能看到图片；
2. Desktop 线程中已有附件，手机能看到真实文件信息；
3. 可读取媒体在允许条件下可打开；
4. 权限不足、Relay-only 或媒体失效时给出真实不可用状态；
5. 不出现凭证泄漏；
6. 普通纯文本聊天不退化。

## 非目标

- 不做拍照上传；
- 不做相册上传；
- 不做文件上传；
- 不新增附件管理中心；
- 不重做文件库入口；
- 不修改 Host 媒体存储合同。