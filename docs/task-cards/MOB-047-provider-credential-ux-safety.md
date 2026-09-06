# MOB-047：Provider API Key 配置 UX 与凭据状态安全修复

状态：**TODO**（2026-09-06 已派卡）

范围：Mira Mobile Local Provider configuration

Base：`dev@7bc3556`

依赖：MOB-038

## 目标

去掉配置页把 `********` 当作真实 TextInput value 的 sentinel 设计，建立“已有安全存储 Key”和“本次输入的新 Key”两个独立状态，避免用户编辑掩码后把假掩码保存成真实凭据。

## Must Read

- `AGENTS.md`
- `docs/task-cards/MOB-038-local-provider-profiles-and-session-creation.md`
- `src/screens/LocalProviderConfigScreen.tsx`
- `src/security/providerCredentialStore.ts`
- `src/security/providerCredentialStore.test.ts`
- `src/provider/providerConfigStore.ts`
- `src/screens/localProviderConfig.contract.test.js`

## Verified Context

- API Key 已与普通 Provider JSON 分离，存放在 `MiraSecureCredentialStore`；这一安全边界是正确的。
- 当前页面读取到已有 Key 后，把 TextInput value 直接设置成字符串 `********`。
- 保存逻辑再通过 `apiKey !== '********'` 判断是否替换 Key。
- 该 sentinel 进入可编辑输入框后，用户只要在掩码基础上修改，就可能把假值作为新凭据写入安全存储。

## Hard Constraints

- API Key 不得写入 ProviderConfig JSON、日志、Alert 或导航参数。
- 不回显完整旧 Key。
- 保存普通配置时，如果用户没有输入新 Key，必须保留旧 Key。
- 清除 Key 必须是显式用户动作，不得因为清空文本框或切换 Provider 静默清除。
- 不修改 Remote Host / device credential。
- 不引入新的凭据依赖。

## 功能范围

- 使用独立的 `hasStoredKey`（或等价状态）表示已有凭据。
- API Key TextInput 对已有 Key 保持空值，使用明确 placeholder / 辅助文字表达“已保存；输入新 Key 可替换”。
- 用户输入新 Key 并保存时替换安全存储中的旧 Key。
- 保存 Provider 名称 / URL / model 而未输入新 Key时，旧 Key 保持不变。
- 提供显式“清除 API Key”动作，并确认其影响。
- 切换多个 Provider 时，各自的 stored-key 状态正确刷新，不串 Key。
- 新建本地对话时，没有 Key 仍由运行时返回现有明确错误，不伪造已配置。

## Execution Entry Points

- `src/screens/LocalProviderConfigScreen.tsx`
- `src/security/providerCredentialStore.ts`
- `src/security/providerCredentialStore.test.ts`
- `src/screens/localProviderConfig.contract.test.js`

## Acceptance

1. 已保存 Key 时页面不出现可编辑的 `********` 字符串。
2. 不输入新 Key，只修改模型/名称并保存，旧 Key 仍可正常使用。
3. 输入新 Key 保存后完成替换，并恢复“已保存”状态。
4. 显式清除后当前 Provider 不再拥有 Key，其他 Provider 不受影响。
5. 多 Provider 切换不泄漏前一个 Provider 的输入值或 Key 状态。
6. 所有错误文案都不包含 Key 内容。

## Validation

- Provider credential store 保持独立 service namespace 的测试。
- 配置页 contract / state tests 覆盖 preserve / replace / clear / switch。
- `npm run typecheck`
- `npm run lint`
- 全量 Jest。
- Android debug build 至少一轮。
- Android/iOS 原生安全存储真实读写留 MOB-044 最终验收。

## Unknown / Human Decision

None。

## Parallel / Integration

可与 MOB-045、MOB-046 从共同 base `7bc3556` 并行。不要顺手重构整个 Provider 配置页；MOB-048 会在三张修复卡合入后做窄范围卫生检查。

## Handoff

施工前确认当前安全存储原生模块仍为既有 `MiraSecureCredentialStore`。如平台实现发生变化，先报告，不得回退到 AsyncStorage 保存 Key。
