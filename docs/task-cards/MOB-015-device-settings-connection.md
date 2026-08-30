# MOB-015：设备设置与连接收口

状态：待实施

负责人：`mob_015_device_settings_connection`

工作分支：`dev`

目标版本：`0.2.1`

范围：Mira Mobile；设备级设置、本地持久化、现有 Host 断开能力

Desktop / Host 依赖：无新增依赖

## 背景

Mobile 已有 `MiraLocalStore / NSUserDefaults` 设备级本地存储，并已用于本机置顶 / 未读；外观与重点色目前只存在内存中，重启后恢复默认。Remote Client 也已有完整 `disconnect()`，但设置页“退出登录”尚未接入真实断开流程。

本任务只把已经存在的设备能力接通，不新增账户体系。

## 目标

让设备级外观设置可持久化、系统主题变化能正确响应，并让现有“退出登录”入口真实断开 Mira Host、清理配对凭据并回到连接流程。

## 1. 外观 / 重点色设备级持久化

- 复用现有 `localKeyValueStore`，不新增第二套设置存储；
- 持久化 `ThemeMode` 与 `AccentColor`；
- App 启动时先 hydrate 再应用，非法/旧值安全回退默认；
- `system` 模式使用系统当前主题，并监听系统主题变化；
- 用户主动选择 light / dark 后不受系统变化覆盖；
- 存储失败不能让页面崩溃，应保留当前会话内设置并暴露可诊断错误边界；
- 不把设备级主题伪装成跨设备同步设置。

## 2. 真实断开 Mira Host

- 设置页现有“退出登录”入口调用现有 Remote `disconnect()`；
- 执行前明确二次确认，文案说明会清除本机配对凭据并断开当前 Host；
- 断开时取消当前发送、关闭 Relay、清除安全存储凭据、更新 connection state；
- 成功后返回 HostConfig / 配对入口，不能继续停留在可访问旧线程的假连接态；
- 断开失败显示真实错误，不先假装退出成功；
- 不删除 Desktop Thread、Workspace、Role 或其它远端业务数据。

## 并行边界

MOB-015 主要拥有 `SettingsScreen`、`ThemeContext` 与设备设置存储，可与 MOB-012 / MOB-013 / MOB-014 并行。

不得借本任务修改 Chat Agent 状态机、Message renderer 或会话工具菜单。

## 测试要求

- light / dark / system 持久化；
- AccentColor 持久化；
- 重启 hydrate 后恢复上次设备设置；
- system 模式响应 Appearance change；
- 非 system 模式不被系统 change 覆盖；
- 非法持久化值安全回退；
- disconnect 清 credential / Relay / connection state；
- 取消确认不执行断开；
- 断开成功后导航到配对入口；
- 断开不删除任何远端 Thread。

## 验收

1. 修改主题与重点色后杀进程重开仍保持；
2. system 模式随手机深浅色切换；
3. 点击“退出登录”并确认后，当前设备凭据被清除；
4. App 回到连接桌面端流程；
5. 重新配对后 Desktop 原会话仍存在；
6. 不引入新的账户 / 云同步假语义。

## 非目标

- 不实现设备同步；
- 不实现账户登录系统；
- 不实现通知、语音、安全、存储管理页；
- 不做跨设备主题同步；
- 不修改其它假入口 UI。